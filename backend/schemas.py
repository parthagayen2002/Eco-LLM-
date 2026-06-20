from typing import List

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    prompt: str = ""
    prompt_type: str = "zero-shot"
    model_id: str = "microsoft/phi-2"


class AnalyzeResponse(BaseModel):
    answer: str
    latency: float
    energy: float
    tokens: int


class ModelOption(BaseModel):
    id: str
    label: str


class ModelStatusResponse(BaseModel):
    model_id: str
    is_loaded: bool
    use_remote: bool
    available_models: List[ModelOption]
