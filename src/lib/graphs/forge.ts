// Skill Forge: turns a plain-English idea into a valid Claude SKILL.md.
//
//   START ─► architect ─► writer ─► critic ─► END
//                           ▲         │
//                           └ revise ─┘   (max 2 revisions)

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ask, askJSON, type Model } from "../llm";

export interface Blueprint {
  name: string;
  description: string;
  triggers: string[];
  inputs: string[];
  steps: string[];
  outputFormat: string;
  guardrails: string[];
}

export interface Critique {
  score: number;
  issues: string[];
  verdict: "pass" | "revise";
}

const last = <T,>(d: T) => ({ reducer: (_: T, b: T) => b, default: () => d });

export const ForgeState = Annotation.Root({
  idea: Annotation<string>,
  examples: Annotation<string>,
  blueprint: Annotation<Blueprint | null>(last<Blueprint | null>(null)),
  skillMd: Annotation<string>(last("")),
  critique: Annotation<Critique | null>(last<Critique | null>(null)),
  iterations: Annotation<number>(last(0)),
});

type S = typeof ForgeState.State;

/** Deterministic checks against Claude's skill format rules. */
export function validateSkillMd(md: string): string[] {
  const issues: string[] = [];
  const fm = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fm) return ["Missing YAML frontmatter (--- name / description ---) at the very top."];
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (!name) issues.push("Frontmatter is missing `name`.");
  else if (!/^[a-z0-9-]{1,64}$/.test(name)) issues.push("`name` must be lowercase letters, numbers and hyphens only (max 64 chars).");
  if (!desc) issues.push("Frontmatter is missing `description`.");
  else if (desc.length > 1024) issues.push(`\`description\` is ${desc.length} chars; max is 1024.`);
  if (md.split("\n").length > 500) issues.push("SKILL.md is over 500 lines; move detail to reference files.");
  return issues;
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "my-skill";

export function buildForgeGraph(model: Model) {
  const architect = async (s: S) => {
    const bp = await askJSON<Blueprint>(
      model,
      `You are the Skill Architect. Design an Agent Skill for Claude (a folder with SKILL.md that Claude loads when relevant). The description is the MOST important field: it must say what the skill does AND when to use it, with concrete trigger phrases, in third person, under 900 characters. Name: short kebab-case.`,
      `IDEA:\n${s.idea}\n\nEXAMPLES / CONTEXT:\n${s.examples || "none"}`,
      { name: slugify(s.idea), description: "", triggers: [], inputs: [], steps: [], outputFormat: "", guardrails: [] },
      `{"name":"kebab-case","description":"what + when","triggers":["phrases that should activate it"],"inputs":["what the user provides"],"steps":["imperative step"],"outputFormat":"exact output structure","guardrails":["things it must never do"]}`,
    );
    return { blueprint: { ...bp, name: slugify(bp.name || s.idea) } };
  };

  const writer = async (s: S) => {
    const fix = s.critique?.verdict === "revise" ? `\n\nPREVIOUS DRAFT:\n${s.skillMd}\n\nFIX THESE ISSUES:\n- ${s.critique.issues.join("\n- ")}` : "";
    const md = await ask(
      model,
      `You are the Skill Writer. Write a complete SKILL.md for Claude.
Format rules:
- Start with YAML frontmatter exactly:
---
name: <kebab-case name>
description: <one line, what + when, ≤1024 chars>
---
- Then a markdown body: # Title, a one-paragraph purpose, ## When to use, ## Inputs, ## Steps (numbered, imperative), ## Output format (show a template), ## Examples (one short input → output), ## Guardrails.
- Concise: assume Claude is smart; only add context it wouldn't already have. Under 200 lines.
Return ONLY the SKILL.md content, no fences, no commentary.`,
      `BLUEPRINT:\n${JSON.stringify(s.blueprint, null, 2)}\n\nORIGINAL IDEA:\n${s.idea}${fix}`,
    );
    return { skillMd: md.replace(/^```(?:markdown|md)?\s*\n?|\n?```\s*$/g, "").trim() + "\n", iterations: s.iterations + 1 };
  };

  const critic = async (s: S) => {
    const hard = validateSkillMd(s.skillMd);
    const out = await askJSON<Critique>(
      model,
      `You are the Skill Critic. Review this SKILL.md against Claude skill best practices: valid frontmatter; description states WHAT and WHEN with trigger phrases; steps are imperative and testable; output format is explicit; has an example; concise; no vague advice. Score 0–100. verdict "pass" if score ≥ 80 and no blocking issues.`,
      `SKILL.md:\n"""\n${s.skillMd}\n"""\n\nAutomated validator issues: ${hard.join(" | ") || "none"}`,
      { score: 70, issues: [], verdict: "revise" },
      `{"score":0,"issues":["..."],"verdict":"pass|revise"}`,
    );
    const issues = [...hard, ...(out.issues ?? []).map(String)];
    const score = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0))) - hard.length * 15;
    return { critique: { score, issues, verdict: hard.length || score < 80 ? "revise" : "pass" } as Critique };
  };

  return new StateGraph(ForgeState)
    .addNode("architect", architect)
    .addNode("writer", writer)
    .addNode("critic", critic)
    .addEdge(START, "architect")
    .addEdge("architect", "writer")
    .addEdge("writer", "critic")
    .addConditionalEdges("critic", (s: S) => (s.critique?.verdict === "revise" && s.iterations < 3 ? "writer" : END), ["writer", END])
    .compile();
}
