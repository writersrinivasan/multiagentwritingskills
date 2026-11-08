# ✦ Skill Studio

A multi-agent writing studio built from the 12 Claude writing skills in [Ruben Hassid's LinkedIn post](https://www.linkedin.com/feed/update/urn:li:activity:7525074631817334784/).
Built with Next.js 15, LangGraph.js and Groq. **BYOK**: you paste your own Groq key, it lives in your browser's localStorage, and the server passes it through per request without storing it.

## Run

```bash
npm install
npm run dev        # http://localhost:3000, then click "Add Groq key"
```

Get a free key at https://console.groq.com/keys.

## What's inside

| Tab | What it does | Under the hood |
|---|---|---|
| **Polish Pipeline** | Paste a draft and get a critiqued, rewritten, scored version | LangGraph: 5 parallel analysts (AI Hunter, Fact Checker, Hook Doctor, Red Pen, Griller) → Rewriter → Scorer, which loops back to the Rewriter if the score is below 80 (max 2 revisions) |
| **Skill Runner** | Run any of the 12 skills; chain them with "Use as input" | Single Groq call with the skill's SKILL.md as the system prompt |
| **Skill Library** | Download each skill as a Claude-ready `.zip` (folder + SKILL.md) | Client-side JSZip |
| **Skill Forge** | Describe a daily task and get a new installable Claude skill | LangGraph: Architect → Writer → Critic (format validator + review), which loops back to the Writer if needed |
| **Voice DNA** | Extract your writing voice and reuse it across every agent; export it as a `my-voice` Claude skill | Stored locally and injected into the Rewriter and voice-aware skills |

A deterministic AI-tell scanner (`src/lib/scanner.ts`) highlights words like *delve, crucial, tapestry* and patterns like *"it's not X, it's Y"* as you type. It needs no key.

Installing a skill in Claude: **Settings → Capabilities → Skills → Upload skill** and pick the zip.

## Layout

```
src/lib/skills.ts         the 12 skill definitions (prompt + SKILL.md source)
src/lib/graphs/polish.ts  7-agent polish graph
src/lib/graphs/forge.ts   3-agent skill-builder graph + SKILL.md validator
src/lib/llm.ts            ChatGroq factory, JSON parsing, NDJSON streaming
src/app/api/*             polish · forge · skill · models (key check)
src/components/*          tabs and UI
```
