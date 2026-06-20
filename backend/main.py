from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from llm_service import MedicalLLMService
from schemas import AnalyzeRequest, AnalyzeResponse, ModelStatusResponse

app = FastAPI(title="EcoLLM Medical AI Backend")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize medical LLM service
llm_service = MedicalLLMService()

@app.on_event("startup")
async def startup():
    # Load Phi-2 on startup
    llm_service.load_model()

@app.get("/")
def home():
    return {"message": "EcoLLM Medical AI API is running."}

@app.get("/status", response_model=ModelStatusResponse)
def model_status():
    return {
        "model_id": llm_service.model_id,
        "is_loaded": llm_service.is_loaded,
        "use_remote": llm_service.use_remote,
        "available_models": llm_service.get_available_models(),
    }

@app.post("/models/load", response_model=ModelStatusResponse)
def load_selected_model(request: AnalyzeRequest):
    try:
        llm_service.load_model(request.model_id)
        return {
            "model_id": llm_service.model_id,
            "is_loaded": llm_service.is_loaded,
            "use_remote": llm_service.use_remote,
            "available_models": llm_service.get_available_models(),
        }
    except Exception as e:
        print(f"Model Load Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    try:
        # Generate response using medical service
        answer, latency, energy, tokens = llm_service.generate_response(
            request.prompt, 
            request.prompt_type,
            request.model_id
        )
        
        return {
            "answer": answer,
            "latency": latency,
            "energy": energy,
            "tokens": tokens
        }
        
    except Exception as e:
        print(f"Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
