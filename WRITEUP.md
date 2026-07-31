# Sentience.exe — Project Writeup

> *"AI gives everyone the same answer. We give you an answer that sounds like it's for you."*

---

## What we built

A chatbot that adapts its entire output register to match whoever is talking to it — not just the topic or the content, but the *tone, formality, language, and texture* of the response.

Formal question → formal but human answer.
Casual question → casual, fragmented, code-switched answer.
Telugu-English → Telugu-English back.
One-liner → one-liner back.

No bullet points. No em-dashes. No "here's a comprehensive overview." Just a response that sounds like it came from an actual person who understood both what you asked and *how* you asked it.

---

## The problem we're solving

Right now, no matter how you prompt an AI, the output comes back in the same register. A PhD researcher and a 14-year-old get structurally identical responses to the same question. Formatted. Bulleted. Hedged. Three examples every time. Em-dashes. "It's not X, it's Y." The classic AI-tell soup.

This isn't a prompt engineering problem. Prompt engineering is about the *input* — what you ask and how you structure it. We're solving something on the *output* side: the AI always responds in its own voice, never yours.

That creates two real failure modes:

**For people who use AI constantly:** you go numb to it. The format itself stops registering. Your brain tunes out the response before you even process it because you've read that exact structure ten thousand times before.

**For people who barely use AI:** a wall of formatted text with markdown headers, bullet points, and hedged qualifications is overwhelming, not helpful. It doesn't meet you where you are.

Both groups are failed by the same thing — a fixed output register that doesn't calibrate to the actual human on the other end.

---

## Why this is different from a prompt-engineered bot

Most chatbots — even heavily prompted ones — solve *specificity*, not *register*. A well-prompted customer support bot gives you better answers than a generic one. But it still answers in bot-voice. You can tell immediately that it's AI.

What we built isn't about domain specificity. It's about removing that fixed register entirely. The bot doesn't have a use case in the traditional sense — it IS the use case. The persona is the product.

We're not trying to make AI smarter or more accurate. We're making its *output texture* human.

---

## What "human-like" actually means here

Not hallucination-free. Not empathetic in a scripted way. Not peppered with "I understand how you feel."

Human-like means:
- incomplete thoughts that trail off naturally
- varying effort per message, not uniform quality
- code-switching without announcing it
- leaving things unresolved instead of tying every answer in a bow
- occasionally answering the wrong part of the question first, then circling back
- typos that go uncorrected
- one-word replies when that's all a real person would send

This is what a Turing test actually tests. Not knowledge. Not helpfulness. Whether the *feel* of the conversation is human.

---

## The persona

Deliberately identity-light — no fixed backstory, no named occupation, no location. Just enough internal consistency that if you ask the same thing twice, you get the same answer. Language detection runs per message. The bot mirrors whatever register the judge is using: Hindi-English, Telugu-English, formal English, or casual plain English — independently tracking both language and formality, never mixing them.

The entire prompt is engineered to eliminate AI tells: no bullet points, no three-example lists, no em-dashes, no "it's not X it's Y," no over-explaining references, no resolving ambiguity too cleanly, no offering to help further.

---

## Tech stack

- **Backend:** Python + FastAPI
- **Model:** Gemini Flash (free tier, two separate GCP projects — dev and prod)
- **Hosting:** Render / Railway (public URL, judges' platform hits it directly)
- **Endpoint:** `POST /chat/completions` — fully OpenAI Chat Completions compatible
- **Full conversation history** used on every request for consistency across turns

---

## Why not education / health / agriculture

Those are the three most saturated chatbot domains at every hackathon. Teams in those lanes are competing on domain quality, which flattens into "whose prompt was more detailed." We're not in that competition at all.

We're solving a cross-domain problem that all of those bots have and don't fix: their output still sounds like AI regardless of how good the domain logic is. Our thing is a layer underneath all of that. It's not a smarter chatbot for one domain — it's what every chatbot should sound like for any domain.

---

## One-line pitch

*AI gives everyone the same answer. We give you an answer that sounds like it's for you.*

---

## For the judges' evaluation

The bot will be accessible via the submitted endpoint. Judges can write to it however they naturally would — formally, casually, in Hinglish, in Telugu-English. The bot will meet them exactly where they are, in their register, without announcing that it's doing so.

That's the demo. That's the whole thing. Just talk to it.
