import os
import time
import importlib.util
import re

import psutil
import torch
from huggingface_hub import InferenceClient, login
from transformers import AutoModelForCausalLM, AutoTokenizer
from dotenv import load_dotenv

try:
    from transformers import BitsAndBytesConfig
except ImportError:
    BitsAndBytesConfig = None

load_dotenv()


class MedicalLLMService:
    QUESTION_STOPWORDS = {
        "a", "an", "and", "are", "be", "by", "can", "could", "did", "do", "does", "for", "from",
        "how", "if", "in", "is", "it", "may", "might", "of", "on", "or", "should", "the", "to",
        "was", "were", "what", "when", "where", "which", "who", "why", "with", "would",
    }
    PUBMED_QA_EXAMPLES = [
        {
            "question": "Does vitamin D supplementation improve glycemic control in patients with type 2 diabetes?",
            "answer": (
                "Maybe. Some studies report small improvements in insulin sensitivity or HbA1c, "
                "but results are mixed and depend on baseline deficiency, dose, and study design."
            ),
        },
        {
            "question": "Can early mobilization in the ICU reduce length of hospital stay?",
            "answer": (
                "Yes. Early mobilization is often associated with better functional recovery and can reduce "
                "length of stay in selected critically ill patients when performed safely."
            ),
        },
    ]
    MODEL_OPTIONS = [
        {"id": "Qwen/Qwen2.5-0.5B-Instruct", "label": "Qwen 2.5 0.5B Instruct"},
        {"id": "google/gemma-2b", "label": "Gemma 2B (largest built-in option)"},
        {"id": "microsoft/phi-2", "label": "Phi-2"},
        {"id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0", "label": "TinyLlama 1.1B"},
    ]

    def __init__(self, model_id="microsoft/phi-2"):
        self.default_model_id = os.getenv("MODEL_ID", model_id)
        self.model_id = self.default_model_id
        self.tokenizer = None
        self.model = None
        self.is_loaded = False
        self.hf_token = os.getenv("HF_TOKEN")
        self.default_use_remote = os.getenv("USE_REMOTE_HF", "0").lower() in ("1", "true", "yes")
        self.use_remote = self.default_use_remote
        self.use_8bit = os.getenv("USE_8BIT", "0").lower() in ("1", "true", "yes")
        self.use_4bit = os.getenv("USE_4BIT", "1").lower() in ("1", "true", "yes")
        self.presentation_mode = os.getenv("PRESENTATION_MODE", "1").lower() in ("1", "true", "yes")
        self.inference_api = None
        if torch.cuda.is_available():
            torch.set_float32_matmul_precision("high")

    def get_available_models(self):
        return self.MODEL_OPTIONS

    def _normalize_model_id(self, model_id):
        requested_model = model_id or self.default_model_id
        available_model_ids = {model["id"] for model in self.MODEL_OPTIONS}
        return requested_model if requested_model in available_model_ids else self.default_model_id

    def _reset_model_state(self):
        self.tokenizer = None
        self.model = None
        self.is_loaded = False
        self.inference_api = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def _switch_model_if_needed(self, model_id):
        normalized_model_id = self._normalize_model_id(model_id)
        if normalized_model_id == self.model_id and self.is_loaded:
            return

        self.model_id = normalized_model_id
        self.use_remote = self._should_use_remote(self.model_id)
        self._reset_model_state()

    def _should_use_remote(self, model_id):
        return self.default_use_remote

    def _init_remote(self):
        if not self.hf_token:
            raise RuntimeError("HF_TOKEN is required for remote inference (USE_REMOTE_HF=1).")

        print(f"Initializing remote inference for {self.model_id}...")
        self.inference_api = InferenceClient(model=self.model_id, token=self.hf_token)
        self.is_loaded = True

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_id,
                trust_remote_code=self._should_trust_remote_code(self.model_id),
                use_fast=False,
            )
        except Exception:
            self.tokenizer = None

    def _maybe_login(self):
        if self.hf_token:
            try:
                print("Logging into Hugging Face...")
                login(token=self.hf_token)
            except Exception as error:
                print(f"Hugging Face login skipped: {error}")

    def _build_quant_config(self):
        if not (self.use_4bit or self.use_8bit):
            return None

        if not torch.cuda.is_available():
            print("Quantized loading is disabled on CPU-only systems.")
            return None

        if BitsAndBytesConfig is None:
            print("bitsandbytes / BitsAndBytesConfig not available; skipping quantized load.")
            return None

        if importlib.util.find_spec("bitsandbytes") is None:
            print("bitsandbytes package not installed; skipping quantized load.")
            return None

        return BitsAndBytesConfig(
            load_in_4bit=self.use_4bit,
            load_in_8bit=self.use_8bit,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            llm_int8_enable_fp32_cpu_offload=self.use_8bit and not self.use_4bit,
        )

    def _should_trust_remote_code(self, model_id):
        supported_local_models = {
            "Qwen/Qwen2.5-0.5B-Instruct",
            "google/gemma-2b",
            "microsoft/phi-2",
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            "gpt2",
        }
        return model_id not in supported_local_models

    def _get_model_load_kwargs(self, quant_config):
        model_kwargs = {
            "trust_remote_code": self._should_trust_remote_code(self.model_id),
            "revision": "main",
        }

        if quant_config is not None:
            model_kwargs["quantization_config"] = quant_config
            model_kwargs["device_map"] = "auto"
            if self.use_8bit and not self.use_4bit and torch.cuda.is_available():
                gpu_total_gib = max(int(torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)), 1)
                cpu_total_gib = max(int(psutil.virtual_memory().total / (1024 ** 3)), 4)
                offload_dir = os.path.join(os.path.dirname(__file__), ".offload")
                os.makedirs(offload_dir, exist_ok=True)
                model_kwargs["max_memory"] = {
                    0: f"{max(gpu_total_gib - 1, 1)}GiB",
                    "cpu": f"{max(int(cpu_total_gib * 0.75), 4)}GiB",
                }
                model_kwargs["offload_folder"] = offload_dir
            return model_kwargs

        if torch.cuda.is_available():
            # Your RTX 4070 can run these smaller models well in fp16 without accelerate.
            model_kwargs["torch_dtype"] = torch.float16
            model_kwargs["low_cpu_mem_usage"] = True
            return model_kwargs

        model_kwargs["device_map"] = "cpu"
        model_kwargs["low_cpu_mem_usage"] = True
        return model_kwargs

    def load_model(self, model_id=None):
        self._switch_model_if_needed(model_id)

        if self.is_loaded:
            return

        if self.use_remote:
            return self._init_remote()

        self._maybe_login()
        quant_config = self._build_quant_config()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading {self.model_id} on {device} (quantized={bool(quant_config)})...")

        if self.model_id == "google/gemma-2b" and not self.hf_token:
            raise RuntimeError(
                "Gemma 2B needs a Hugging Face token and model access approval. "
                "Add HF_TOKEN in backend/.env or switch back to Phi-2."
            )
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_id,
                trust_remote_code=self._should_trust_remote_code(self.model_id),
                use_fast=False,
            )
            if self.tokenizer.pad_token_id is None and self.tokenizer.eos_token_id is not None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

            model_kwargs = self._get_model_load_kwargs(quant_config)

            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                **model_kwargs,
            )

            if torch.cuda.is_available() and quant_config is None:
                self.model = self.model.to("cuda")

            self.model.eval()

            self.is_loaded = True
            print(f"{self.model_id} loaded successfully.")
        except Exception as error:
            print(f"Error loading model {self.model_id}: {error}")
            if self.default_use_remote and self.hf_token:
                print("Falling back to Hugging Face remote inference.")
                try:
                    self.use_remote = True
                    self._init_remote()
                    return
                except Exception as remote_error:
                    print(f"Remote fallback failed: {remote_error}")

            print("Trying ultra-lightweight fallback (Qwen-0.5B)...")
            try:
                fallback_id = "Qwen/Qwen2.5-0.5B-Instruct"
                self.tokenizer = AutoTokenizer.from_pretrained(fallback_id, use_fast=False)
                self.model = AutoModelForCausalLM.from_pretrained(
                    fallback_id,
                    device_map="cpu",
                    low_cpu_mem_usage=True,
                )
                self.model_id = fallback_id
                self.is_loaded = True
                print(f"Fallback model {fallback_id} loaded.")
            except Exception as qwen_error:
                print(f"Fallback Qwen failed: {qwen_error}")
                print("Trying ultra-compatible fallback (GPT-2)...")
                try:
                    compatible_id = "gpt2"
                    self.tokenizer = AutoTokenizer.from_pretrained(compatible_id)
                    self.model = AutoModelForCausalLM.from_pretrained(
                        compatible_id,
                        device_map="cpu",
                        low_cpu_mem_usage=True,
                    )
                    self.model_id = compatible_id
                    self.is_loaded = True
                    print(f"Compatible model {compatible_id} loaded.")
                except Exception as final_error:
                    print(f"All loading attempts failed: {final_error}")
                    self.is_loaded = False

    def _is_binary_question(self, user_prompt):
        normalized = user_prompt.strip().lower()
        binary_starts = (
            "is ", "are ", "was ", "were ", "do ", "does ", "did ", "can ", "could ",
            "should ", "would ", "will ", "has ", "have ", "had ", "may ", "might "
        )
        return normalized.startswith(binary_starts)

    def _extract_focus_terms(self, user_prompt):
        terms = re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", user_prompt.lower())
        unique_terms = []
        for term in terms:
            if term in self.QUESTION_STOPWORDS:
                continue
            if term not in unique_terms:
                unique_terms.append(term)
        return unique_terms[:8]

    def _build_system_instruction(self, user_prompt):
        focus_terms = self._extract_focus_terms(user_prompt)
        answer_shape = (
            "Start with exactly one verdict word: Yes, No, or Maybe."
            if self._is_binary_question(user_prompt)
            else "Start with a direct one-sentence answer."
        )
        focus_line = ""
        if focus_terms:
            focus_line = (
                " Stay tightly focused on these medical concepts only: "
                + ", ".join(focus_terms)
                + "."
            )

        return (
            "You are a cautious medical research QA assistant. "
            + answer_shape
            + " Then give 2 or 3 short sentences that answer the user's exact question. "
            "Do not introduce unrelated diseases, treatments, or risk factors. "
            "If the question is ambiguous or the evidence is uncertain, say that clearly instead of guessing. "
            "Do not repeat the question and do not add disclaimers unless safety requires it."
            + focus_line
        )

    def _build_user_message(self, user_prompt, prompt_type):
        grounding_block = (
            "Answer only the question below.\n"
            "If you are not sure, say what is uncertain.\n"
            "Keep the answer under 80 words.\n"
        )

        if prompt_type == "few-shot":
            example_blocks = "\n\n".join(
                f"Question: {example['question']}\nAnswer: {example['answer']}"
                for example in self.PUBMED_QA_EXAMPLES
            )
            return (
                "Examples:\n"
                f"{example_blocks}\n\n"
                f"{grounding_block}"
                f"Question: {user_prompt}\n"
                "Answer:"
            )

        if prompt_type == "cot":
            return (
                f"{grounding_block}"
                "Think briefly through the clinical evidence internally, but only output the final answer.\n"
                f"Question: {user_prompt}\n"
                "Answer:"
            )

        return (
            f"{grounding_block}"
            f"Question: {user_prompt}\n"
            "Answer:"
        )

    def build_prompt(self, user_prompt, prompt_type):
        system_instruction = self._build_system_instruction(user_prompt)
        user_message = self._build_user_message(user_prompt, prompt_type)

        if self.tokenizer is not None and hasattr(self.tokenizer, "apply_chat_template"):
            try:
                messages = [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_message},
                ]
                return self.tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                )
            except Exception:
                pass

        return (
            f"System: {system_instruction}\n\n"
            f"User: {user_message}\n\n"
            "Assistant:"
        )

    def _clean_response(self, response, full_prompt, user_prompt):
        cleaned = response.strip()

        if cleaned.startswith(full_prompt):
            cleaned = cleaned[len(full_prompt):].strip()

        repeated_prefixes = [
            full_prompt.strip(),
            f"Question: {user_prompt}",
            "Question:",
            "Answer:",
            "Assistant:",
            "System:",
            "User:",
        ]

        if "Final Answer:" in cleaned:
            cleaned = cleaned.split("Final Answer:", 1)[1].strip()

        changed = True
        while changed:
            changed = False
            for prefix in repeated_prefixes:
                if cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix):].strip()
                    changed = True

        if "\nQuestion:" in cleaned:
            cleaned = cleaned.split("\nQuestion:")[0].strip()

        if "\nQ:" in cleaned:
            cleaned = cleaned.split("\nQ:")[0].strip()

        for marker in ("<|assistant|>", "<|user|>", "<|system|>", "[/INST]", "<end_of_turn>"):
            cleaned = cleaned.replace(marker, "").strip()

        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        return cleaned or response.strip()

    def _get_generation_settings(self):
        if self.presentation_mode:
            return {
                "default_max_new_tokens": 96,
                "gemma_max_new_tokens": 72,
                "llama_max_new_tokens": 96,
                "phi_max_new_tokens": 192,
                "qwen_max_new_tokens": 96,
                "gpt2_max_new_tokens": 96,
                "temperature": 0.1,
                "do_sample": False,
            }

        return {
            "default_max_new_tokens": 220,
            "gemma_max_new_tokens": 256,
            "llama_max_new_tokens": 320,
            "phi_max_new_tokens": 512,
            "qwen_max_new_tokens": 192,
            "gpt2_max_new_tokens": 128,
            "temperature": 0.2,
            "do_sample": False,
        }

    def _uses_conversational_remote(self, model_id):
        return False

    def _get_remote_max_new_tokens(self, generation_settings):
        max_new = generation_settings["default_max_new_tokens"]
        if self.model_id == "google/gemma-2b":
            max_new = generation_settings["gemma_max_new_tokens"]
        elif self.model_id == "TinyLlama/TinyLlama-1.1B-Chat-v1.0":
            max_new = generation_settings["llama_max_new_tokens"]
        elif self.model_id == "microsoft/phi-2":
            max_new = generation_settings["phi_max_new_tokens"]
        elif self.model_id == "Qwen/Qwen2.5-0.5B-Instruct":
            max_new = generation_settings["qwen_max_new_tokens"]
        return max_new

    def _run_remote_inference(self, full_prompt, generation_settings, user_prompt):
        max_new = self._get_remote_max_new_tokens(generation_settings)

        if self._uses_conversational_remote(self.model_id):
            result = self.inference_api.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a precise medical question answering assistant."},
                    {"role": "user", "content": full_prompt},
                ],
                max_tokens=max_new,
                temperature=generation_settings["temperature"],
            )
            message = result.choices[0].message
            response = getattr(message, "content", "") or ""
            return self._clean_response(str(response), full_prompt, user_prompt)

        result = self.inference_api.text_generation(
            prompt=full_prompt,
            max_new_tokens=max_new,
            temperature=generation_settings["temperature"],
            do_sample=generation_settings["do_sample"],
            return_full_text=False,
        )
        response = result if isinstance(result, str) else str(result)
        return self._clean_response(response, full_prompt, user_prompt)

    def generate_response(self, user_prompt, prompt_type="zero-shot", model_id=None):
        requested_model_id = self._normalize_model_id(model_id)
        if requested_model_id != self.model_id or not self.is_loaded:
            self.load_model(requested_model_id)

        if not self.is_loaded:
            print(f"Returning mock response for: {user_prompt}")
            time.sleep(1.0)
            mock_answer = (
                f"[MOCK MEDICAL AI] Analysis for '{user_prompt}': "
                f"The selected model '{requested_model_id}' is still loading or missing dependencies."
            )
            return mock_answer, 1.5, 0.0284, 50

        full_prompt = self.build_prompt(user_prompt, prompt_type)
        start_time = time.time()
        psutil.cpu_percent(interval=None)
        generation_settings = self._get_generation_settings()

        if self.use_remote and self.inference_api is not None:
            try:
                response = self._run_remote_inference(full_prompt, generation_settings, user_prompt)
            except Exception as error:
                error_message = str(error)
                response = f"[REMOTE INFERENCE ERROR] {error_message}"

            latency = time.time() - start_time
            cpu_usage = psutil.cpu_percent(interval=None)
            energy_wh = cpu_usage * latency * 0.0001
            token_count = 0
            if self.tokenizer is not None:
                token_count = len(self.tokenizer(full_prompt, return_tensors="pt")["input_ids"][0])
            else:
                token_count = len(full_prompt.split())

            return response.strip(), round(latency, 2), round(energy_wh, 4), token_count

        inputs = self.tokenizer(full_prompt, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            max_new = generation_settings["default_max_new_tokens"]
            if self.model_id == "gpt2":
                max_new = generation_settings["gpt2_max_new_tokens"]
            elif self.model_id == "google/gemma-2b":
                max_new = generation_settings["gemma_max_new_tokens"]
            elif self.model_id == "TinyLlama/TinyLlama-1.1B-Chat-v1.0":
                max_new = generation_settings["llama_max_new_tokens"]
            elif self.model_id == "microsoft/phi-2":
                max_new = generation_settings["phi_max_new_tokens"]
            elif self.model_id == "Qwen/Qwen2.5-0.5B-Instruct":
                max_new = generation_settings["qwen_max_new_tokens"]
            elif self.model.device.type == "cpu":
                # Keep CPU responses shorter than GPU runs, but long enough to finish a useful answer.
                max_new = min(max_new, 96)

            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new,
                temperature=generation_settings["temperature"],
                pad_token_id=self.tokenizer.eos_token_id,
                do_sample=generation_settings["do_sample"],
                repetition_penalty=1.1,
            )

        latency = time.time() - start_time
        cpu_usage = psutil.cpu_percent(interval=None)
        energy_wh = cpu_usage * latency * 0.0001

        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        response = self._clean_response(response, full_prompt, user_prompt)

        token_count = len(outputs[0])
        return response, round(latency, 2), round(energy_wh, 4), token_count
