# EcoLLM Dashboard

This is a basic React + FastAPI medical AI dashboard for project presentation.

The project is now tuned for fast classroom demos:
- Default model: `microsoft/phi-2`
- Fastest mode: `Phi-2 + Zero-Shot`
- Presentation mode is enabled by default for shorter answers
- Medical Q&A prompting now follows a verdict-first answer format

## Backend Setup

From the project root:

```powershell
cd "c:\Users\Partha\OneDrive\Desktop\minor project"
backend\venv\Scripts\pip.exe install -r backend\requirements.txt
```

Create `backend/.env` with:

```env
HF_TOKEN=your_huggingface_token
MODEL_ID=microsoft/phi-2
PRESENTATION_MODE=1
USE_4BIT=1
USE_8BIT=0
# USE_REMOTE_HF=1
```

Run backend:

```powershell
cd "c:\Users\Partha\OneDrive\Desktop\minor project\backend"
.\venv\Scripts\uvicorn.exe main:app --reload
```

Backend URL:
`http://127.0.0.1:8000`

## Frontend Setup

From the project root:

```powershell
npm install
npm start
```

Frontend URL:
`http://localhost:3000`

## Prompt Strategies

The frontend is connected to all three modes:
- `zero-shot`
- `few-shot`
- `cot`

The medical prompt templates now use a medical research Q&A style:
- verdict-first answers such as `Yes`, `No`, or `Maybe`
- concise evidence-based explanations
- few-shot examples shaped like medical research questions

For the fastest presentation response, use:
- Model: `Phi-2`
- Strategy: `Zero-Shot`

## Gemma 2B Requirements

If you want to show `gemma-2b`, you usually need:
- A Hugging Face account
- Access approval for the Gemma model
- `HF_TOKEN` in `backend/.env`
- Enough RAM/VRAM for local loading
- Patience, because Gemma is slower than Phi-2 on many laptops

For presentation, it is better to keep the main demo on `Phi-2` and only mention Gemma as an additional supported option.
