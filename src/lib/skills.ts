// The 12 writing skills referenced in the LinkedIn post, each defined once and used three ways:
//  1. as a Groq system prompt in the Skill Runner,
//  2. as a downloadable Claude SKILL.md (Settings → Skills → upload zip),
//  3. as a role inside the LangGraph multi-agent pipelines.

export type SkillId =
  | "copywriting"
  | "linkedin-post"
  | "fact-checker"
  | "delete-ai-words"
  | "hooks"
  | "personal-voice"
  | "my-viral-post"
  | "humanizer"
  | "red-pen"
  | "grill-me"
  | "viral-recipe"
  | "voice-dna";

export interface Skill {
  id: SkillId;
  title: string;
  emoji: string;
  gradient: string; // full Tailwind class literal so the compiler sees it
  ring: string;
  tagline: string;
  description: string; // Claude frontmatter description: what + when
  instructions: string; // markdown body
  inputLabel: string;
  inputPlaceholder: string;
  contextLabel?: string;
  contextPlaceholder?: string;
  usesVoice?: boolean;
}

export const SKILLS: Skill[] = [
  {
    id: "copywriting",
    title: "Copywriting",
    emoji: "✍️",
    gradient: "from-fuchsia-500 to-pink-500",
    ring: "ring-fuchsia-400/60",
    tagline: "Headlines, copy and CTAs that follow real copy rules",
    description:
      "Writes and rewrites headlines, landing copy, emails and calls-to-action using proven copywriting rules (clarity, specificity, benefit-first, one idea per line). Use when the user asks for copy, a headline, a tagline, a CTA, ad text, or wants marketing text punchier.",
    instructions: `## Rules
1. Lead with the reader's outcome, not the product's feature.
2. Be specific: numbers, names, timeframes beat adjectives.
3. One idea per sentence. Short words over long ones.
4. Cut every word that does not earn its place.
5. A CTA is a verb plus a concrete result ("Get the checklist", not "Learn more").

## Process
1. Identify audience, offer and the single action wanted.
2. Write 5 headline options using different angles (outcome, curiosity, contrarian, number, question).
3. Write body copy: problem → agitation → solution → proof → CTA.
4. Write 3 CTA options.

## Output
- **Headlines** (5, each labelled with its angle)
- **Body copy**
- **CTAs** (3)
- **Why this works** (3 bullets)`,
    inputLabel: "What are you selling / announcing?",
    inputPlaceholder: "e.g. A 4-week cohort teaching engineers to ship LangGraph agents to production…",
    contextLabel: "Audience & tone (optional)",
    contextPlaceholder: "e.g. Senior devs, sceptical of hype, prefer plain talk",
  },
  {
    id: "linkedin-post",
    title: "LinkedIn Post",
    emoji: "💼",
    gradient: "from-sky-500 to-blue-600",
    ring: "ring-sky-400/60",
    tagline: "Draft, edit and score a post before it goes live",
    description:
      "Drafts, edits and scores LinkedIn posts out of 100 before publishing. Use when the user wants to write a LinkedIn post, improve a draft, or asks 'is this post good?'.",
    instructions: `## Process
1. If given a topic, draft a post: strong 2-line hook, short paragraphs (1–2 lines), one concrete story or example, a takeaway, a simple question or CTA.
2. If given a draft, edit it: tighten the hook, cut filler, break walls of text, remove AI giveaway words.
3. Score the final version.

## Scorecard (each /20)
- Hook (would a stranger stop scrolling?)
- Specificity (numbers, names, lived detail)
- Readability (white space, short lines)
- Human voice (no AI tells, sounds like a person)
- Payoff & CTA

## Output
- **Final post** (ready to paste)
- **Score: NN/100** with the 5 sub-scores
- **Top 3 fixes** that would raise the score`,
    inputLabel: "Topic or draft",
    inputPlaceholder: "Paste a draft, or describe what you want to post about…",
    usesVoice: true,
  },
  {
    id: "fact-checker",
    title: "Fact Checker",
    emoji: "🔎",
    gradient: "from-emerald-500 to-teal-500",
    ring: "ring-emerald-400/60",
    tagline: "Catches fake stats and made-up quotes",
    description:
      "Audits text for statistics, quotes, dates and factual claims that may be invented or unverifiable, and flags them with a risk level. Use before publishing anything with numbers, quotes or claims, or when the user asks to fact-check.",
    instructions: `## Process
1. Extract every checkable claim: statistics, percentages, quotes, attributions, dates, named studies, superlatives ("the first", "the biggest").
2. Rate each claim's risk:
   - 🔴 **High**: precise stat or quote with no source; classic hallucination shape ("Studies show 73%…").
   - 🟡 **Medium**: plausible but needs a source.
   - 🟢 **Low**: common knowledge or clearly the author's own experience.
3. For each, say what to verify and how (where to look), or how to reword it so it is honest.

You cannot browse. Never claim something is verified true. Your job is to flag what needs checking.

## Output
A table: | Claim | Risk | Why | Fix |
Then **Safe rewrite**: the text with risky claims softened or marked [SOURCE NEEDED].`,
    inputLabel: "Text to fact-check",
    inputPlaceholder: "Paste the post, article or email…",
  },
  {
    id: "delete-ai-words",
    title: "Delete AI Words",
    emoji: "🧹",
    gradient: "from-rose-500 to-orange-500",
    ring: "ring-rose-400/60",
    tagline: "Removes delve, crucial, tapestry & friends",
    description:
      "Finds and removes AI giveaway words and patterns (delve, crucial, pivotal, tapestry, robust, seamless, realm, 'here's the thing', 'it's not X, it's Y', adverb padding) and rewrites the sentences naturally. Use when text sounds AI-generated or the user asks to remove AI words.",
    instructions: `## Words and patterns to remove
- delve, crucial, pivotal, tapestry, robust, seamless, realm, leverage, unlock, elevate, foster, embark, testament, landscape, navigate
- "Here's the thing." "Hope this helps." "After careful consideration." "to provide a quick update" "Most people…"
- "It's not X, it's Y." / "This isn't a budget. It's a statement of intent."
- Adverb padding: quietly, seamlessly, effortlessly, truly, deeply, incredibly
- Rule-of-three lists that exist only for rhythm; em-dash overuse

## Process
1. List each occurrence found, quoting it.
2. Rewrite the sentence so it says the plain thing. Do not swap in a synonym that is equally AI-sounding.
3. Keep the meaning and the author's facts.

## Output
- **Found** (bullet list: quote → replacement)
- **Clean version** (full text)`,
    inputLabel: "Text to clean",
    inputPlaceholder: "Paste text that smells like ChatGPT…",
  },
  {
    id: "hooks",
    title: "Hooks",
    emoji: "🪝",
    gradient: "from-amber-400 to-orange-500",
    ring: "ring-amber-400/60",
    tagline: "Rewrites the first two lines",
    description:
      "Rewrites the opening two lines of a post, email or article so people keep reading. Use when the user wants a better hook, opener, first line, or says their post isn't getting attention.",
    instructions: `## Hook types
Contrarian · Specific number · Personal confession · Bold outcome · Curiosity gap · Direct callout ("If you X, read this")

## Process
1. Diagnose the current hook in one sentence (why it would be scrolled past).
2. Write 7 new two-line hooks, one per type plus one wildcard. Line 1 ≤ 12 words. Line 2 creates tension or a promise.
3. Pick the best and say why.

No clickbait the post can't pay off. No AI words.

## Output
- **Diagnosis**
- **7 hooks** (labelled by type)
- **Pick** + reason`,
    inputLabel: "Your post or its current opening",
    inputPlaceholder: "Paste the post (the first lines matter most)…",
  },
  {
    id: "personal-voice",
    title: "Personal Voice",
    emoji: "🎙️",
    gradient: "from-violet-500 to-purple-600",
    ring: "ring-violet-400/60",
    tagline: "Applies your own writing style",
    description:
      "Rewrites text in the user's personal writing voice using their voice profile (vocabulary, sentence length, tone, quirks). Use when the user says 'make this sound like me', 'in my voice', or provides a voice profile.",
    instructions: `## Process
1. Read the voice profile (if none is supplied, infer a plain, direct, warm voice and say so).
2. Rewrite the text matching: sentence length, vocabulary level, formality, humour, signature phrases, formatting habits.
3. Keep all facts. Do not add claims.
4. Remove anything the author would never say.

## Output
- **Rewritten text**
- **Voice moves applied** (3–5 bullets)`,
    inputLabel: "Text to rewrite in your voice",
    inputPlaceholder: "Paste the draft…",
    usesVoice: true,
  },
  {
    id: "my-viral-post",
    title: "My Viral Post",
    emoji: "📈",
    gradient: "from-lime-400 to-green-600",
    ring: "ring-lime-400/60",
    tagline: "Writes like your past outliers",
    description:
      "Analyses the user's past posts and their performance numbers, finds what the outliers have in common, and writes a new post in that pattern. Use when the user shares their analytics or top posts and wants more like them.",
    instructions: `## Process
1. Parse the past posts and metrics (impressions, reactions, comments). Identify the top 20% as outliers.
2. Compare outliers vs the rest: hook type, length, format, topic, emotion, CTA, posting style.
3. State the pattern as 3–5 rules.
4. Write a new post on the requested topic that follows those rules.

## Output
- **Outliers** (which and why)
- **Your winning pattern** (rules)
- **New post**`,
    inputLabel: "Topic for the new post",
    inputPlaceholder: "e.g. What I learned shipping my first multi-agent app",
    contextLabel: "Past posts + metrics",
    contextPlaceholder: "Post 1 (12k impressions, 240 reactions): …\nPost 2 (900 impressions, 8 reactions): …",
  },
  {
    id: "humanizer",
    title: "Humanizer",
    emoji: "🫀",
    gradient: "from-pink-500 to-red-500",
    ring: "ring-pink-400/60",
    tagline: "Removes whatever AI feel is left",
    description:
      "Makes AI-sounding text read like a human wrote it: varied rhythm, concrete detail, contractions, no filler, no tidy-symmetric structure. Use as a final pass on AI drafts or when the user says text 'sounds like AI'.",
    instructions: `## What makes text feel AI
- Uniform sentence length; every paragraph the same shape
- Rows of short punchy fragments. Like this. Over and over.
- Symmetric lists of three; neat summaries at the end of each section
- Hedging and filler; no specific detail; no opinion
- Overly polished transitions ("Moreover", "Furthermore", "In conclusion")

## Process
1. Vary rhythm: mix long and short sentences, merge choppy fragments.
2. Add (or ask for) one concrete, lived detail; never invent facts — mark spots with [ADD DETAIL].
3. Use contractions and plain verbs. Allow one opinion.
4. Remove the closing summary if it repeats the body.

## Output
- **Humanized text**
- **What changed** (short bullets)`,
    inputLabel: "Text to humanize",
    inputPlaceholder: "Paste the AI-ish draft…",
  },
  {
    id: "red-pen",
    title: "Red Pen",
    emoji: "🖍️",
    gradient: "from-red-500 to-rose-600",
    ring: "ring-red-400/60",
    tagline: "Flags weak lines before you send",
    description:
      "Acts as a strict editor: flags weak, vague, redundant or risky lines in a draft with a reason and a fix, without rewriting the whole thing. Use before sending an email, post, proposal or doc, or when the user asks for edits/feedback.",
    instructions: `## Flag types
VAGUE · FILLER · CLICHÉ · PASSIVE · JARGON · TOO LONG · UNCLEAR ASK · RISKY TONE

## Process
1. Go line by line. Quote only lines that need work.
2. For each: tag, one-sentence reason, a suggested replacement.
3. Finish with the single most important change.

## Output
| # | Line | Tag | Why | Fix |
**Most important change:** …`,
    inputLabel: "Draft to mark up",
    inputPlaceholder: "Paste the email / post / doc…",
  },
  {
    id: "grill-me",
    title: "Grill Me",
    emoji: "🔥",
    gradient: "from-orange-500 to-red-600",
    ring: "ring-orange-400/60",
    tagline: "Critical questions before you write",
    description:
      "Asks sharp, critical questions about an idea or draft before writing, to expose weak arguments, missing proof and unclear audience. Use when the user is about to write something and wants to think it through, or says 'grill me' / 'challenge this'.",
    instructions: `## Process
1. Restate the idea in one sentence to confirm understanding.
2. Ask 7 hard questions across: audience, core claim, proof, counter-argument, stakes, originality, the ask.
3. For each question, say what a weak answer would look like.
4. End with: the one question that, if answered well, makes this worth publishing.

Be direct, not rude. No praise padding.

## Output
- **What I think you're saying**
- **7 questions** (with "weak answer looks like…")
- **The question that matters most**`,
    inputLabel: "Your idea or draft",
    inputPlaceholder: "e.g. I want to argue that most AI agents should be workflows…",
  },
  {
    id: "viral-recipe",
    title: "Viral Recipe",
    emoji: "🧪",
    gradient: "from-cyan-400 to-sky-600",
    ring: "ring-cyan-400/60",
    tagline: "Reverse-engineers why a post went viral",
    description:
      "Reverse-engineers a viral post (anyone's) into a reusable recipe: hook mechanics, structure, emotional trigger, format and CTA, then applies it to the user's topic. Use when the user shares a successful post and asks why it worked or wants to reuse the format.",
    instructions: `## Process
1. Break the viral post down: hook mechanic, structure (beat by beat), emotional trigger, format choices, social proof, CTA.
2. Write the recipe as a fill-in-the-blanks template.
3. Apply the recipe to the user's topic. Do not copy the original's sentences.

## Output
- **Why it worked** (5 bullets)
- **The recipe** (template)
- **Your version**`,
    inputLabel: "Paste the viral post",
    inputPlaceholder: "Paste the post that blew up…",
    contextLabel: "Your topic",
    contextPlaceholder: "e.g. Using Groq for cheap, fast LLM prototyping",
  },
  {
    id: "voice-dna",
    title: "Voice DNA",
    emoji: "🧬",
    gradient: "from-indigo-500 to-violet-600",
    ring: "ring-indigo-400/60",
    tagline: "Builds a voice profile from your samples",
    description:
      "Builds a reusable voice profile from the user's writing samples: tone, rhythm, vocabulary, formatting habits, signature phrases and things they never say. Use when the user uploads or pastes their own writing and wants Claude to learn their style.",
    instructions: `## Process
1. Read all samples. Ignore content; study style.
2. Measure: average sentence length, paragraph length, reading level, formality (1–10), humour (1–10), use of questions, emoji, lists, line breaks.
3. Capture vocabulary: favourite words, signature phrases, how they open and close.
4. Capture the negative space: words and moves they never use.

## Output — a profile another model can follow
- **Voice in one line**
- **Tone & personality**
- **Rhythm & structure**
- **Vocabulary** (use / never use)
- **Signature moves**
- **Formatting habits**
- **Example sentence in this voice**`,
    inputLabel: "Your writing samples",
    inputPlaceholder: "Paste 3–10 things you've written (posts, emails, notes)…",
  },
];

export const SKILL_MAP = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, Skill>;

export function skillToMarkdown(skill: { id: string; title: string; description: string; instructions: string }, extra = ""): string {
  return `---
name: ${skill.id}
description: ${skill.description.replace(/\n/g, " ")}
---

# ${skill.title}

${skill.instructions}
${extra ? `\n${extra}\n` : ""}`;
}
