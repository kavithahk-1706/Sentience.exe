import requests
import json

BASE_URL="http://localhost:8000/chat/completions"
messages=[]

print("====sentience.exe test client====")
print("type your messages below. ctrl+c to quit\n")

while True:
    user_input=input("you: ")
    
    messages.append({"role":"user","content":user_input})
    
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
