from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import time
import os
from google import genai
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import asyncio

load_dotenv()

#gemini inits
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")
client=genai.Client(api_key=GEMINI_API_KEY)


#load prompt
with open("system_prompt.md","r") as f:
    SYSTEM_PROMPT=f.read()
    
async def call_gemini(messages, model_name):
    """
    this calls gemini with custom settings
    wrt harm category management

    
    """
    return client.models.generate_content(
        model=model_name,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "temperature": 1.0,
            "max_output_tokens":800,
            "safety_settings": [
                {"category":"HARM_CATEGORY_HARRASSMENT","threshold":"BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
            ]
        },
        contents=messages
    )



app = FastAPI()

#CORS Setup (so that our frontend can speak to our backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat/completions")
async def chat(request: Request):
    body=await request.json()
    messages=body.get("messages",[])
    model=body.get("model","default")
    
    gemini_messages=[]
    
    for msg in messages:
        role=msg.get("role")
        content=msg.get("content","")
        if role=="system":
            continue
        gemini_role="model" if role=="assistant" else "user"
        gemini_messages.append({
            "role":gemini_role,
            "parts":[{"text":content}]
        })
    
    active_model="gemini-flash-latest"
        
    try:
        response=await asyncio.to_thread(call_gemini,gemini_messages,active_model)
    except Exception as e:
        if "429" in str(e) or "quota" in str(e).lower() or "rate" in str(e).lower():
            active_model="gemini-flash-lite-latest"
            try:
                response=await asyncio.to_thread(call_gemini,active_model)
            except Exception:
                raise HTTPException(status=429, detail="rate limit hit for both models")
        else:
            raise
    reply=response.text    
    
    return JSONResponse(content={
        "id": f"chatcmpl-{int(time.time())}",
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
        ]
    })