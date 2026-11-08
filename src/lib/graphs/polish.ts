// Polish Pipeline: 5 analyst agents run in parallel → Rewriter → Scorer.
// The Scorer can send the draft back to the Rewriter (max 2 revisions).
//
//   START ─┬─ aiHunter ──┐
//          ├─ factCheck ─┤
//          ├─ hookDoctor ┼─► rewriter ─► scorer ─► END
//          ├─ redPen ────┤      ▲          │
//          └─ griller ───┘      └─ revise ─┘

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ask, askJSON, type Model } from "../llm";
import { humanScore, scan } from "../scanner";

export interface Finding {
  agent: string;
  severity: "high" | "medium" | "low";
  quote: string;
  issue: string;
  fix: string;
}

export interface Score {
  total: number;
  hook: number;
  specificity: number;
  readability: number;
  human: number;
  payoff: number;
  feedback: string[];
  verdict: "ship" | "revise";
}

const concat = <T,>() => ({ reducer: (a: T[], b: T[]) => a.concat(b), default: () => [] as T[] });
const last = <T,>(d: T) => ({ reducer: (_: T, b: T) => b, default: () => d });

export const PolishState = Annotation.Root({
  draft: Annotation<string>,
  goal: Annotation<string>,
  voice: Annotation<string>,
  findings: Annotation<Finding[]>(concat<Finding>()),
  questions: Annotation<string[]>(concat<string>()),
  hooks: Annotation<string[]>(last<string[]>([])),
  rewrite: Annotation<string>(last("")),
  score: Annotation<Score | null>(last<Score | null>(null)),
  iterations: Annotation<number>(last(0)),
});

type S = typeof PolishState.State;

const FINDINGS_SHAPE = `{"findings":[{"severity":"high|medium|low","quote":"exact text from draft","issue":"what is wrong","fix":"suggested replacement"}]}`;

const ctx = (s: S) => `GOAL / PLATFORM: ${s.goal || "LinkedIn post"}\n\nDRAFT:\n"""\n${s.draft}\n"""`;

const tag = (agent: string, list: Omit<Finding, "agent">[] | undefined): Finding[] =>
  (Array.isArray(list) ? list : []).slice(0, 8).map((f) => ({
    agent,
    severity: (["high", "medium", "low"].includes(f.severity) ? f.severity : "medium") as Finding["severity"],
    quote: String(f.quote ?? ""),
    issue: String(f.issue ?? ""),
    fix: String(f.fix ?? ""),
  }));

export function buildPolishGraph(model: Model) {
  const aiHunter = async (s: S) => {
    const hard = scan(s.draft).map((m) => `"${m.text}" (${m.label})`);
    const out = await askJSON(
      model,
      `You are the /delete-ai-words + /humanizer agent. Find AI giveaway words AND subtler AI patterns: repetitive short punchy sentences, rule-of-three lists, "it's not X, it's Y", tidy summaries, hedging, adverb padding, uniform rhythm. The deterministic scanner already found: ${hard.join(", ") || "nothing"}. Include those plus anything subtler.`,
      ctx(s),
      { findings: [] as Omit<Finding, "agent">[] },
      FINDINGS_SHAPE,
    );
    return { findings: tag("AI Hunter", out.findings) };
  };

  const factCheck = async (s: S) => {
    const out = await askJSON(
      model,
      `You are the /fact-checker agent. Flag statistics, quotes, attributions, named studies and superlatives that could be invented or need a source. You cannot browse, so never say something is verified. High = precise unsourced numbers/quotes. If there are no risky claims return an empty list.`,
      ctx(s),
      { findings: [] as Omit<Finding, "agent">[] },
      FINDINGS_SHAPE,
    );
    return { findings: tag("Fact Checker", out.findings) };
  };

  const hookDoctor = async (s: S) => {
    const out = await askJSON(
      model,
      `You are the /hooks agent. Diagnose the first two lines of the draft, then write 4 stronger two-line hooks (contrarian, specific number, personal confession, curiosity gap). Line 1 ≤ 12 words. No clickbait the post can't pay off. No AI words.`,
      ctx(s),
      { diagnosis: "", hooks: [] as string[] },
      `{"diagnosis":"why the current opening gets scrolled past","hooks":["line1\\nline2", "..."]}`,
    );
    const finding: Finding[] = out.diagnosis
      ? [{ agent: "Hook Doctor", severity: "high", quote: s.draft.split("\n").slice(0, 2).join(" ").slice(0, 160), issue: out.diagnosis, fix: out.hooks?.[0] ?? "" }]
      : [];
    return { hooks: (out.hooks ?? []).slice(0, 4).map(String), findings: finding };
  };

  const redPen = async (s: S) => {
    const out = await askJSON(
      model,
      `You are the /red-pen agent: a strict editor. Flag VAGUE, FILLER, CLICHÉ, PASSIVE, JARGON, TOO LONG, UNCLEAR ASK or RISKY TONE lines. Start each issue with its tag in caps. Quote only lines that need work.`,
      ctx(s),
      { findings: [] as Omit<Finding, "agent">[] },
      FINDINGS_SHAPE,
    );
    return { findings: tag("Red Pen", out.findings) };
  };

  const griller = async (s: S) => {
    const out = await askJSON(
      model,
      `You are the /grill-me agent. Ask the 4 hardest questions a sceptical reader would ask about this draft (audience, proof, counter-argument, so-what). Direct, not rude.`,
      ctx(s),
      { questions: [] as string[] },
      `{"questions":["..."]}`,
    );
    return { questions: (out.questions ?? []).slice(0, 5).map(String) };
  };

  const rewriter = async (s: S) => {
    const notes = s.findings.map((f) => `- [${f.agent}/${f.severity}] "${f.quote}" → ${f.issue}. Fix: ${f.fix}`).join("\n");
    const revision = s.score?.verdict === "revise" ? `\n\nPREVIOUS VERSION:\n${s.rewrite}\n\nSCORER FEEDBACK TO FIX:\n- ${s.score.feedback.join("\n- ")}` : "";
    const text = await ask(
      model,
      `You are the rewriter, combining /copywriting, /humanizer and /personal-voice. Rewrite the draft for: ${s.goal || "LinkedIn"}.
Rules: use the strongest hook (you may adapt one of the suggested hooks); apply the editors' fixes; remove every AI giveaway word (delve, crucial, pivotal, tapestry, robust, seamless, realm, leverage, unlock, "here's the thing", "it's not X, it's Y", adverb padding); vary sentence rhythm; short paragraphs; keep every fact from the original, invent no new stats or quotes (write [SOURCE?] next to risky claims); end with a simple question or CTA.
${s.voice ? `\nWRITE IN THIS VOICE PROFILE:\n${s.voice}\n` : ""}
Return ONLY the final post text. No preamble, no notes.`,
      `${ctx(s)}\n\nSUGGESTED HOOKS:\n${s.hooks.join("\n---\n")}\n\nEDITOR FINDINGS:\n${notes || "none"}\n\nSCEPTIC QUESTIONS TO PRE-EMPT:\n${s.questions.join("\n")}${revision}`,
    );
    return { rewrite: text.replace(/^["']|["']$/g, ""), iterations: s.iterations + 1 };
  };

  const scorer = async (s: S) => {
    const leftovers = scan(s.rewrite);
    const out = await askJSON(
      model,
      `You are the /linkedin-post scorer. Score the REWRITE strictly, each category 0–20: hook, specificity, readability, human (sounds like a person, no AI tells), payoff (takeaway + CTA). Give 2–4 concrete feedback items. Be a tough grader: 90+ is rare.`,
      `GOAL: ${s.goal || "LinkedIn"}\n\nREWRITE:\n"""\n${s.rewrite}\n"""\n\nAI words still present (deterministic scan): ${leftovers.map((m) => m.text).join(", ") || "none"}`,
      { hook: 10, specificity: 10, readability: 10, human: 10, payoff: 10, feedback: [] as string[] },
      `{"hook":0,"specificity":0,"readability":0,"human":0,"payoff":0,"feedback":["..."]}`,
    );
    const clamp = (n: unknown) => Math.max(0, Math.min(20, Math.round(Number(n) || 0)));
    const parts = { hook: clamp(out.hook), specificity: clamp(out.specificity), readability: clamp(out.readability), human: clamp(out.human), payoff: clamp(out.payoff) };
    // Blend the LLM's human score with the deterministic one so leftover AI words always cost points.
    parts.human = Math.min(parts.human, Math.round(humanScore(s.rewrite) / 5));
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    const feedback = [...(out.feedback ?? []).map(String), ...(leftovers.length ? [`Remove remaining AI words: ${leftovers.map((m) => m.text).join(", ")}`] : [])];
    const score: Score = { ...parts, total, feedback, verdict: total >= 80 ? "ship" : "revise" };
    return { score };
  };

  const route = (s: S) => (s.score?.verdict === "revise" && s.iterations < 3 ? "rewriter" : END);

  const analysts = ["aiHunter", "factCheck", "hookDoctor", "redPen", "griller"] as const;

  return new StateGraph(PolishState)
    .addNode("aiHunter", aiHunter)
    .addNode("factCheck", factCheck)
    .addNode("hookDoctor", hookDoctor)
    .addNode("redPen", redPen)
    .addNode("griller", griller)
    .addNode("rewriter", rewriter)
    .addNode("scorer", scorer)
    .addEdge(START, "aiHunter")
    .addEdge(START, "factCheck")
    .addEdge(START, "hookDoctor")
    .addEdge(START, "redPen")
    .addEdge(START, "griller")
    .addEdge([...analysts], "rewriter")
    .addEdge("rewriter", "scorer")
    .addConditionalEdges("scorer", route, ["rewriter", END])
    .compile();
}
