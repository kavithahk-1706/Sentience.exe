import os
import re
import time
import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import errors

#init env vars
load_dotenv()

#init api key and client
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")
client=genai.Client(api_key=GEMINI_API_KEY)

#set system_prompt from md file
with open("system_prompt.md","r") as f:
    SYSTEM_PROMPT=f.read()
    
#MODEL CHAIN: We use models in this order
MODEL_CHAIN=["gemini-flash-latest","gemini-flash-lite-latest"]

#model cooldown tracker: to estimate how long before a model's rate limits reset once hit
model_cooldowns={name:0 for name in MODEL_CHAIN}

def next_midnight_pacific() -> float:
    """
    Calculates daily Gemini quota reset time at midnight Pacific
    """
    pacific=ZoneInfo("America/Los_Angeles")
    now=datetime.now(pacific)
    reset=(now+timedelta(days=1)).replace(hour=0,minute=0,second=0,microsecond=0)
    return reset.timestamp()


def mark_model_cooldown(model_name: str, exception_obj:errors.ClientError)->float:
    """
    Parses Google GenAI 429 errors from the exception metadata
    Locks the model until a short window (if RPM limit hit) or until Pacific midnight (if RPD limit hit)
    """
    
    now=time.time()
    error_text=str(exception_obj)
    
    # First check: look for retry delay seconds embed
    match=re.search(r'retryDelay.*?(\d+)s', error_text, re.IGNORECASE)
    if match:
        cooldown_until=now+int(match.group(1))
    elif "perday" in error_text.lower() or "daily" in error_text.lower():
        cooldown_until=next_midnight_pacific()
    else:
        cooldown_until=now+60.0
        
    model_cooldowns[model_name]=cooldown_until
    return cooldown_until
    
    
    
    
def call_gemini_chat_stateless(gemini_history,new_message_text, model_name):
    """
    Spins up a native Gemini Chat session on the fly, populates it with past history,
    and executes only the latest message turn.
    """
    
    chat=client.chats.create(
        model=model_name,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "temperature": 1.0,
            "max_output_tokens":850
        },
        history=gemini_history
    )
    
    return chat.send_message(new_message_text)
    

#main
app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/chat/completions")
async def chat_endpoint(request: Request):
    body=await request.json()
    messages=body.get("messages",[])
    requested_model=body.get("model","default")
    
    if not messages:
        return JSONResponse(status_code=400, content={"error": "No messages provided"})
    
    # very last msg is the active prompt; the rest of it is chat history
    latest_user_msg=messages[-1].get("content","")
    past_messages=messages[:-1]
    
    # format past messages into gemini's chat history format
    gemini_history=[]
    for msg in past_messages:
        role=msg.get("role")
        content=msg.get("content","")
        if role=="system":
            continue
        gemini_role="model" if role=="assistant" else "user"
        gemini_history.append({"role": gemini_role, "parts": [{"text":content}]})
        
    now=time.time()
    used_model=None
    fell_back=False
    response=None
    
    #fallback exec loop 
    for i,model_name in enumerate(MODEL_CHAIN):
        if model_cooldowns[model_name]>now:
            continue
        try:
            response=await asyncio.to_thread(
                call_gemini_chat_stateless,
                gemini_history,
                latest_user_msg,
                model_name
            )
            
            used_model=model_name
            fell_back=(i>0)
            
            if fell_back:
                print(f"[FALLBACK] Primary Model rate-limited. Using fallback model {used_model} instead.")
            else:
                print(f"[NORMAL] Used Primary Model {used_model}")
            break
        
        except errors.ClientError as e:
            if e.code==429:
                mark_model_cooldown(model_name, e)
                continue
            raise
        
        except Exception:
            raise
        
    #if all fallback models have been exhausted
    if response is None:
        soonest_reset=min(model_cooldowns.values())
        seconds_left=max(0,int(soonest_reset-now))
        
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "type": "rate_limited",
                    "message": "All model tiers have been exhausted.",
                    "suggested_retry_delay_seconds": seconds_left,
                    "global_cooldown_details": {
                        name: max(0, int(ts-now)) for name, ts in model_cooldowns
                    }
                }
            },
        )
    
    primary_model=MODEL_CHAIN[0]
    primary_wait_seconds=max(0, int(model_cooldowns[primary_model]-now))
    
    #store response text
    reply=response.text
    
    #output
    return JSONResponse(content={
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": requested_model,
        "meta": {
            "used_model": used_model,
            "fell_back": fell_back,
            "primary_model_cooldown_seconds": primary_wait_seconds
        },
        
        "choices": [
            {
                "message": {"role": "assistant", "content":reply},
                "finish_reason":"stop"
            }
        ]
        
    })
