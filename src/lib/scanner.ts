// Deterministic AI-tell scanner. Runs instantly in the browser and on the server
// (no API key needed) so the agents get hard evidence, not just vibes.

export interface Tell {
  label: string;
  re: RegExp;
  hint: string;
}

const w = (words: string[]) => new RegExp(`\\b(${words.join("|")})\\b`, "gi");

export const TELLS: Tell[] = [
  { label: "delve", re: w(["delve", "delves", "delving", "delved"]), hint: "Nobody talks like that. Say 'look at' or cut it." },
  { label: "crucial / pivotal", re: w(["crucial", "pivotal", "paramount", "vital"]), hint: "Almost nothing is that pivotal." },
  { label: "tapestry", re: w(["tapestry", "symphony", "mosaic"]), hint: "Pure AI decoration." },
  { label: "here's the thing", re: /\bhere'?s the (thing|kicker|deal|truth)\b/gi, hint: "Just say the thing." },
  { label: "hope this helps", re: /\bhope this helps\b/gi, hint: "Sign-off filler." },
  { label: "after careful consideration", re: /\bafter careful consideration\b/gi, hint: "Formal padding." },
  { label: "quick update", re: /\bto provide (you with )?a (quick|brief) update\b/gi, hint: "Just give the update." },
  { label: "most people…", re: /\bmost people\b/gi, hint: "Lazy generalisation." },
  { label: "robust / seamless / realm", re: w(["robust", "seamless", "seamlessly", "realm", "leverage", "leveraging", "unlock", "unlocking", "elevate", "foster", "embark", "testament", "game-changer", "game changer", "landscape"]), hint: "Corporate-AI vocabulary." },
  { label: "adverb padding", re: w(["quietly", "effortlessly", "truly", "deeply", "incredibly", "fundamentally", "ultimately"]), hint: "Adverbs that add drama, not meaning." },
  { label: "it's not X, it's Y", re: /\b(it'?s|this is|that'?s) not (just )?[^.!?\n]{1,50}?[,;:—–-]\s*(it'?s|but)\b/gi, hint: "The most recognisable AI construction." },
  { label: "isn't X. It's Y.", re: /\b(isn'?t|aren'?t|wasn'?t) (just )?(a |an |the )?[^.!?\n]{1,40}[.!]\s+(it'?s|they'?re|this is)\b/gi, hint: "'This isn't a budget. It's a statement of intent.'" },
  { label: "in today's fast-paced world", re: /\bin today'?s (fast[- ]paced|digital|ever[- ]changing|rapidly evolving)\b/gi, hint: "Stock AI opener." },
  { label: "em-dash", re: /—/g, hint: "One is fine. Five is a tell." },
];

export interface Match {
  label: string;
  hint: string;
  text: string;
  index: number;
}

export function scan(text: string): Match[] {
  const out: Match[] = [];
  for (const t of TELLS) {
    t.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = t.re.exec(text))) {
      out.push({ label: t.label, hint: t.hint, text: m[0], index: m.index });
      if (m[0].length === 0) t.re.lastIndex++;
    }
  }
  // Em-dashes only count when overused
  const dashes = out.filter((m) => m.label === "em-dash");
  const rest = out.filter((m) => m.label !== "em-dash");
  return (dashes.length >= 3 ? [...rest, ...dashes] : rest).sort((a, b) => a.index - b.index);
}

/** 0–100, higher = more human. */
export function humanScore(text: string): number {
  if (!text.trim()) return 100;
  const words = text.trim().split(/\s+/).length;
  const hits = scan(text).length;
  const density = (hits / Math.max(words, 1)) * 100; // tells per 100 words
  return Math.max(0, Math.round(100 - density * 18));
}

/** Non-overlapping segments for highlighting. */
export function segments(text: string): { text: string; match?: Match }[] {
  const matches = scan(text);
  const segs: { text: string; match?: Match }[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.index < pos) continue;
    if (m.index > pos) segs.push({ text: text.slice(pos, m.index) });
    segs.push({ text: m.text, match: m });
    pos = m.index + m.text.length;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) });
  return segs;
}
