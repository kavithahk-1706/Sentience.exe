# Sentience.exe — Project Overview & Roadmap

## What we're actually building

The judges will chat with our bot through an API endpoint (no live human comparison — confirmed by the technical organizer). Our goal is simple to state, hard to execute: **make the bot's responses indistinguishable from a real person texting casually or formally, depending on how the judge writes to it.**

There is no fixed "problem statement" to solve in the traditional hackathon sense — every team is doing the same thing. The differentiator is entirely in execution quality of the persona.

## Key confirmed facts (as of Day 1 session)

- No human-vs-AI side-by-side comparison. Judges only talk to our endpoint, standalone.
- The bot must **adapt its tone to match the judge's input** — informal input gets informal output, formal/professional input gets more composed output. This is not optional, it's the core requirement.
- Endpoint must expose `POST /chat/completions` matching OpenAI's Chat Completions format exactly (see Section 2).
- Full conversation history is sent on every request, not just the latest message — we can and should use this for consistency and for occasionally responding to earlier points rather than only the latest message.
- We're allowed to start building before the official event start — using this time for setup, testing, and research so Day 2 is pure execution, not scrambling.

## Tech stack

- **Backend:** Python + FastAPI (or similar) exposing the required route
- **Model:** Gemini (Flash tier, free), two separate Google Cloud projects — one for dev/testing, one reserved purely for production/judging to avoid rate-limit collisions
- **Hosting:** Render or Railway (free tier), for a public URL judges' platform can hit
- **Testing:** a minimal custom frontend (single page, hits our own endpoint, displays raw returned text) purely to observe rendering behavior on our end

## Pipeline, step by step

1. Judge's platform sends a POST request to our endpoint with the full `messages` history
2. Our backend takes that history + our system/persona prompt and sends it to Gemini
3. Gemini generates a response following our persona rules (tone-adaptive, fragmented, code-switched where relevant, anti-AI-tell)
4. Our backend formats that response into the required JSON response shape
5. Returns HTTP 200 with `choices[0].message.content` containing the actual reply

## Roadmap / order of operations

- [x] Understand endpoint spec
- [x] Clarify open questions with organizers (adaptive tone, no human comparison, line-break unknown)
- [ ] Build bare-bones FastAPI skeleton, confirm it returns valid dummy responses matching required shape
- [ ] Set up two separate Gemini projects/keys (dev + prod), confirm both work independently
- [ ] Draft baseline persona prompt (in progress — draft exists, needs iteration)
- [ ] Research + prompt iteration work (assigned separately — see role doc)
- [ ] Integrate final prompt into the live backend
- [ ] End-to-end test: full conversations through the deployed endpoint, checking tone adaptation, consistency, and absence of AI tells
- [ ] Submit endpoint details (base URL, model name, API key or "none") before deadline
- [ ] Final live test using curl exactly as instructed in their doc, before submission is locked in

## Checklist

- [ ] Endpoint deployed and publicly reachable
- [ ] Passes the organizer's own curl test with a normal, correctly-shaped response
- [ ] Persona prompt handles both casual and formal input naturally, without hardcoding a single register
- [ ] At least a few full test conversations run through the actual deployed pipeline (not just prompt-only testing in Gemini's chat UI) to confirm nothing breaks between Gemini's raw output and the final returned JSON

## Contingency — two submission paths now allowed

Organizers announced two options for evaluation, since several teams are struggling with deployment:

- **Option 1 — Submit endpoint:** as originally planned, deploy the FastAPI backend publicly, submit the base URL/model/key through their form, judges hit it through their platform.
- **Option 2 — Offline live demo:** if deployment is an issue, bring a working local setup (laptop/local server) and walk judges through it in person during the evaluation slot. No public hosting required.

**Plan: build for Option 1 first, treat Option 2 as a lightweight fallback on the same core logic.** The persona prompt, Gemini integration, and actual chat handling are identical either way — only the last mile differs (public deployment + exact JSON shape for Option 1, vs. just something a judge can type into locally for Option 2). Given how disorganized the event's rollout has been so far, it's realistic that the organizers may end up collapsing to one option last-minute — better to have both ready than assume either.

- [ ] Build a minimal local chat interface (bare terminal loop or simple local webpage) that hits the same backend logic — no deployment, no public URL needed — as the Option 2 fallback

