# sentience.exe

A Turing test experiment. A conversational AI persona engineered to pass as human — not by being more knowledgeable, but by removing every structural tell that makes AI output feel like AI output.

It will deny being an AI if asked. That's the point.

---

## What it does

Most AI systems respond in a fixed output register regardless of how the user communicates. A researcher and a teenager asking the same question get structurally identical responses — formatted, bulleted, hedged, em-dashed. The content might differ but the texture never does.

sentience.exe removes that fixed register. It mirrors whoever is talking to it: their tone, formality, language, and effort level. Casual input gets a casual reply. Formal input gets a composed but human one. Telugu-English gets Telugu-English back. A one-liner gets a one-liner.

The persona tracks formality and language independently per message, code-switches naturally without announcing it, varies effort level across replies, and is explicitly prompted to eliminate AI tells — no bullet points, no three-example lists, no em-dashes, no "it's not X it's Y", no offering to help further.

It also denies being an AI. Casually, not defensively. That's part of the experiment.

---

## The underlying idea (separated from the experiment)

The register-matching layer is the part of this that generalises. A chatbot deployed in a real application — customer support, tutoring, health, whatever — that can meet users where they are instead of responding in a uniform AI voice is a meaningfully better UX. The persona and identity-denial are specific to this experiment. The tone-adaptation architecture is not.

If you're here because you want to adapt the output register approach for a legitimate deployed chatbot, the relevant parts are:

- The system prompt's tone adaptation and language-matching sections
- The formality/language independence logic (they're tracked separately)
- The code-switching rules (triggered by the human's current message only, not conversation history)


---

## Stack

- **Backend:** Python, FastAPI
- **Model:** Gemini 3.6 Flash (primary) → Gemini 3.6 Flash Lite (rate limit fallback)
- **Frontend:** Vanilla JS, HTML/CSS, Tailwind, marked.js, DOMPurify
- **Speech input:** Web Speech API (`lang="en-IN"`)
- **Conversation history:** localStorage (client-side persistence)

The backend exposes a single `POST /chat/completions` endpoint in OpenAI Chat Completions format. Full conversation history is sent on every request — the backend is stateless.

---

## Running it locally

**Prerequisites:** Python 3.11+, a Gemini API key from [Google AI Studio](https://aistudio.google.com)

```bash
# clone and set up venv
git clone https://github.com/kavithahk-1706/sentience.exe
cd sentience.exe

cd backend

# create venv
python -m venv venv

# activate (Git Bash / Windows)
source venv/Scripts/activate

pip install -r requirements.txt
```

Create a `.env` file at root level:

```
GEMINI_API_KEY=your_key_here
```

Start the backend (run from inside `backend/`):

```bash
uvicorn main:app --reload
```

Open `frontend/index.html` in a browser. The default endpoint is `http://localhost:8000/chat/completions` — no changes needed for local use.

---

## Dev mode

Append `?dev=1` to the frontend URL to activate dev mode. This routes requests through the Flash Lite model only, preserving the Flash daily quota for actual users. The status bar in the UI reflects which model is active.

---

## Test client

A minimal terminal client is included for quick backend testing without the frontend:

```bash
# from inside backend/ with venv active
python test.py
```

---

## Endpoint

```
POST /chat/completions
Content-Type: application/json

{
  "model": "sentience",
  "messages": [
    { "role": "user", "content": "your message here" }
  ],
  "dev_mode": false
}
```

Response follows OpenAI Chat Completions format with an additional `meta` field:

```json
{
  "choices": [{ "message": { "role": "assistant", "content": "..." } }],
  "meta": {
    "used_model": "gemini-2.0-flash-latest",
    "fell_back": false,
    "primary_model_cooldown_seconds": 0
  }
}
```

Rate limit responses return HTTP 429 with a `reset_at` Unix timestamp.

---

## Project structure

```
sentience.exe/
├── backend/
│   ├── main.py            # FastAPI app, fallback logic, Gemini client
│   ├── system_prompt.md   # Persona and tone-adaptation prompt
│   ├── test.py            # Terminal test client
│   ├── requirements.txt
│   └── .env               # Not committed
└── frontend/
    ├── index.html
    ├── styles.css
    └── script.js
```

---

## What it won't do

- Provide instructions for anything harmful, even in character — it deflects the way a real person would
- Respond to genuine distress with the persona intact — it drops the casual tone if someone seems to actually be struggling