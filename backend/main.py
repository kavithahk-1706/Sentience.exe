from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import time
import os
from google import genai
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

#gemini inits
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")
client=genai.Client(api_key=GEMINI_API_KEY)


#load prompt
with open("system_prompt.md","r") as f:
    SYSTEM_PROMPT=f.read()


#helper
def openai_format_to_gemini(messages):
    """
    The response format given by the competition is OpenAI's LLM call format.
    Since we're using Gemini, we need to convert the format to suit Gemini's response format.
    This function helps us do that.
    
    OpenAI Format:
        
    {
        "model": "some-model",
        "messages": [
            {"role": "system", "content": "you are a helpful assistant"},
            {"role": "user", "content": "hey what's up"},
            {"role": "assistant", "content": "nothing much u?"},
            {"role": "user", "content": "just chilling"}
        ]
    }
    
    Gemini Format:
    
    {
        "model": "gemini-2.0-flash",
        "config": {
            "system_instruction": "you are a person having a conversation...",
            "temperature": 1.0,
            "max_output_tokens": 300
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "hey what's up"}]
            },
            {
                "role": "model",
                "parts": [{"text": "nothing much u?"}]
            },
            {
                "role": "user",
                "parts": [{"text": "just chilling"}]
            }
        ]
    }
    
    
    
    """
    history=[]
    for msg in messages:
        role=msg.get("role")
        content=msg.get("content","")
        
        if role=="system":
            continue
        
        gemini_role="model" if role=="assistant" else "user"
        
        history.append({
            "role": gemini_role,
            "parts": [{"text":content}]
        })
        
    return history


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
    body = await request.json()
    messages = body.get("messages", [])
    model = body.get("model", "default")
    
    gemini_messages=openai_format_to_gemini(messages)

    response=client.models.generate_content(
        model="gemini-flash-latest",
        config={
            "system_instruction": SYSTEM_PROMPT,
            "temperature":1.0,
            "max_output_tokens":1024
        },
        contents=gemini_messages
    )
    
    reply=response.text

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