from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import time
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")

app = FastAPI()



@app.post("/chat/completions")
async def chat(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    model = body.get("model", "default")

    # placeholder — we'll replace this with Gemini later
    reply = "hello this is a test response"

    return JSONResponse(content={
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": reply
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }
    })