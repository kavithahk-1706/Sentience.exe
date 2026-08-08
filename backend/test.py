import requests
import json
import base64
import os

BASE_URL="http://localhost:8000/chat/completions"
messages=[]

print("====sentience.exe test client====")
print("type your messages below. prefix with 'img:<path>' to attach an image. ctrl+c to quit\n")

while True:
    user_input=input("you: ").strip()
    
    if user_input.startswith("img:"):
        parts=user_input[4:].split(" ",1)
        img_path=parts[0].strip()
        text=parts[1].strip() if len(parts)>1 else ""
        with open(img_path,"rb") as f:
            img_data=base64.b64encode(f.read()).decode("utf-8")
        ext=os.path.splitext(img_path)[1].lower()
        mime={"jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png","gif":"image/gif","webp":"image/webp"}.get(ext.lstrip("."),"image/jpeg")
        content=[{"type":"image","data":img_data,"media_type":mime}]
        if text:
            content.append({"type":"text","text":text})
    else:
        content=user_input
    
    messages.append({"role":"user","content":content})
    
    response=requests.post(BASE_URL, json={
        "model": "sentience",
        "messages":messages
    })
    
    reply=response.json()["choices"][0]["message"]["content"]
    messages.append({"role":"assistant","content":reply})
    
    print("\nbot:")
    for fragment in reply.split("\n"):
        print(f" {fragment}")
    print()