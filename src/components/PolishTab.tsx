"use client";

import { Flame, Lightbulb, ListChecks, Loader2, Play, Sparkles, Square, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Finding, Score } from "@/lib/graphs/polish";
import { streamGraph, useSettings } from "@/lib/client";
import { scan } from "@/lib/scanner";
import { AgentFlow, type FlowNode, type NodeStatus } from "./AgentFlow";
import { Card, CopyButton, ErrorBox, Field, Highlighted, HumanMeter, ScoreRing, scoreColor } from "./ui";

const ANALYSTS: FlowNode[] = [
  { id: "aiHunter", label: "AI Hunter", emoji: "🧹", gradient: "from-rose-500 to-orange-500" },
  { id: "factCheck", label: "Fact Checker", emoji: "🔎", gradient: "from-emerald-500 to-teal-500" },
  { id: "hookDoctor", label: "Hook Doctor", emoji: "🪝", gradient: "from-amber-400 to-orange-500" },
  { id: "redPen", label: "Red Pen", emoji: "🖍️", gradient: "from-red-500 to-rose-600" },
  { id: "griller", label: "Griller", emoji: "🔥", gradient: "from-orange-500 to-red-600" },
];
const STAGES: FlowNode[][] = [
  [{ id: "input", label: "Your draft", emoji: "📝", gradient: "from-slate-500 to-slate-700" }],
  ANALYSTS,
  [{ id: "rewriter", label: "Rewriter", emoji: "✍️", gradient: "from-fuchsia-500 to-pink-500" }],
  [{ id: "scorer", label: "Scorer", emoji: "💯", gradient: "from-sky-500 to-blue-600" }],
];

const GOALS = ["LinkedIn post", "X / Twitter thread", "Newsletter intro", "Cold email", "Product announcement", "Blog intro", "Slack update to my team"];

const SAMPLE = `In today's fast-paced world, AI is not just a tool — it's a revolution.

Here's the thing. Most people don't realize how crucial it is to delve into multi-agent systems. After careful consideration, I've found that LangGraph seamlessly unlocks a robust tapestry of possibilities.

Studies show 87% of companies will adopt agents by next year. As Sam Altman said, "Agents are the new apps."

This isn't a framework. It's a statement of intent.

Hope this helps!`;

const SEV: Record<Finding["severity"], string> = {
  high: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  medium: "bg-amber-500/20 text-amber-100 border-amber-500/40",
  low: "bg-sky-500/20 text-sky-100 border-sky-500/40",
};

export function PolishTab() {
  const { apiKey, model, voice, setOpenSettings } = useSettings();
  const [draft, setDraft] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [useVoice, setUseVoice] = useState(true);
  const [status, setStatus] = useState<Record<string, NodeStatus>>({});
  const [findings, setFindings] = useState<Finding[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [hooks, setHooks] = useState<string[]>([]);
  const [versions, setVersions] = useState<{ text: string; score?: Score }[]>([]);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  async function run() {
    if (!apiKey) return setOpenSettings(true);
    setError("");
    setFindings([]);
    setQuestions([]);
    setHooks([]);
    setVersions([]);
    setRunning(true);
    const st: Record<string, NodeStatus> = { input: "done", ...Object.fromEntries(ANALYSTS.map((a) => [a.id, "running" as const])) };
    setStatus({ ...st });
    abort.current = new AbortController();
    try {
      await streamGraph(
        "/api/polish",
        apiKey,
        { draft, goal, voice: useVoice ? voice : "", model },
        (e) => {
          if (e.type === "error") return setError(e.message);
          if (e.type !== "update") return;
          const u = e.update as { findings?: Finding[]; questions?: string[]; hooks?: string[]; rewrite?: string; score?: Score };
          if (u.findings?.length) setFindings((f) => [...f, ...u.findings!]);
          if (u.questions?.length) setQuestions(u.questions);
          if (u.hooks?.length) setHooks(u.hooks);
          st[e.node] = "done";
          if (ANALYSTS.every((a) => st[a.id] === "done") && e.node !== "rewriter" && e.node !== "scorer") st.rewriter = "running";
          if (e.node === "rewriter" && u.rewrite) {
            st.scorer = "running";
            setVersions((v) => {
              setShown(v.length);
              return [...v, { text: u.rewrite! }];
            });
          }
          if (e.node === "scorer" && u.score) {
            setVersions((v) => v.map((x, i) => (i === v.length - 1 ? { ...x, score: u.score } : x)));
            if (u.score.verdict === "revise") st.rewriter = "running";
          }
          setStatus({ ...st });
        },
        abort.current.signal,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setRunning(false);
      setStatus((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v === "running" ? "idle" : v])));
    }
  }

  const current = versions[shown];
  const best = versions.reduce<number>((b, v, i) => ((v.score?.total ?? -1) > (versions[b]?.score?.total ?? -1) ? i : b), 0);
  const byAgent = ANALYSTS.map((a) => ({ a, items: findings.filter((f) => f.agent === a.label) }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Input */}
      <div className="space-y-4">
        <Card
          title="Your draft"
          icon={<Sparkles size={16} className="text-fuchsia-400" />}
          right={
            <button className="btn-ghost" onClick={() => setDraft(SAMPLE)}>
              <Lightbulb size={14} /> Sloppy sample
            </button>
          }
        >
          <textarea className="input min-h-64 font-[450]" placeholder="Paste a draft written by you, ChatGPT or Claude…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <HumanMeter text={draft} />
            <span className="text-xs text-white/50">{scan(draft).length} AI tells · {draft.trim() ? draft.trim().split(/\s+/).length : 0} words</span>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Where is this going?">
              <select className="input" value={goal} onChange={(e) => setGoal(e.target.value)}>
                {GOALS.map((g) => (
                  <option key={g} className="bg-[#0d0b1a]">
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Voice" hint={voice ? "Uses the profile from Voice DNA" : "Build one in the Voice DNA tab"}>
              <label className="input flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={useVoice && !!voice} disabled={!voice} onChange={(e) => setUseVoice(e.target.checked)} className="accent-fuchsia-500" />
                <span className={voice ? "" : "text-white/40"}>Write in my voice 🧬</span>
              </label>
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button className="btn-primary flex-1 justify-center" disabled={running || !draft.trim()} onClick={run}>
              {running ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {running ? "Agents working…" : "Run 7-agent pipeline"}
            </button>
            {running && (
              <button className="btn-ghost" onClick={() => abort.current?.abort()}>
                <Square size={14} /> Stop
              </button>
            )}
          </div>
        </Card>

        {draft && scan(draft).length > 0 && (
          <Card title="AI tells in your draft" icon={<Flame size={16} className="text-rose-400" />}>
            <Highlighted text={draft} />
            <p className="mt-3 text-xs text-white/40">Hover a highlight to see why. This check runs locally and needs no key.</p>
          </Card>
        )}
      </div>

      {/* Output */}
      <div className="space-y-4">
        <Card title="LangGraph agent flow" icon={<Wand2 size={16} className="text-sky-400" />}>
          <AgentFlow
            stages={STAGES}
            status={status}
            badges={versions.length > 1 ? { rewriter: `v${versions.length}` } : {}}
            loopNote="5 analysts run in parallel. If the Scorer gives less than 80/100, it sends the draft back to the Rewriter (up to 2 revisions)."
          />
        </Card>

        {error && <ErrorBox message={error} />}

        {current && (
          <Card
            title="Polished version"
            icon={<Sparkles size={16} className="text-emerald-400" />}
            right={
              <div className="flex flex-wrap items-center gap-2">
                {versions.map((v, i) => (
                  <button key={i} onClick={() => setShown(i)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${i === shown ? "bg-white text-black" : "bg-white/10"}`}>
                    v{i + 1}
                    {v.score && <span style={{ color: i === shown ? undefined : scoreColor(v.score.total) }}> · {v.score.total}</span>}
                    {i === best && v.score && versions.length > 1 ? " ★" : ""}
                  </button>
                ))}
                <CopyButton text={current.text} />
              </div>
            }
          >
            <div className="rounded-xl bg-black/30 p-4">
              <Highlighted text={current.text} />
            </div>
            <div className="mt-3">
              <HumanMeter text={current.text} />
            </div>
          </Card>
        )}

        {current?.score && (
          <Card title="Scorecard" icon={<ListChecks size={16} className="text-sky-400" />}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <ScoreRing value={current.score.total} size={104} label={current.score.verdict === "ship" ? "Ready to ship 🚀" : "Needs work"} />
              <div className="flex-1 space-y-2">
                {(["hook", "specificity", "readability", "human", "payoff"] as const).map((k) => (
                  <div key={k} className="flex items-center gap-3 text-sm">
                    <span className="w-24 capitalize text-white/70">{k}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 transition-all" style={{ width: `${(current.score![k] / 20) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono text-xs">{current.score![k]}/20</span>
                  </div>
                ))}
              </div>
            </div>
            {current.score.feedback.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-white/75">
                {current.score.feedback.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {hooks.length > 0 && (
          <Card title="Alternative hooks" icon={<span>🪝</span>}>
            <div className="grid gap-2 sm:grid-cols-2">
              {hooks.map((h, i) => (
                <div key={i} className="group relative rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm whitespace-pre-wrap">
                  {h}
                  <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
                    <CopyButton text={h} label="" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {findings.length > 0 && (
          <Card title={`Agent findings (${findings.length})`} icon={<span>🧠</span>}>
            <div className="space-y-4">
              {byAgent
                .filter((g) => g.items.length)
                .map(({ a, items }) => (
                  <div key={a.id}>
                    <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${a.gradient} px-3 py-1 text-xs font-semibold`}>
                      {a.emoji} {a.label} · {items.length}
                    </div>
                    <div className="space-y-2">
                      {items.map((f, i) => (
                        <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${SEV[f.severity]}`}>{f.severity}</span>
                            <div className="min-w-0 space-y-1">
                              {f.quote && <p className="italic text-white/60">“{f.quote}”</p>}
                              <p>{f.issue}</p>
                              {f.fix && <p className="text-emerald-300 whitespace-pre-wrap">→ {f.fix}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {questions.length > 0 && (
          <Card title="Grill-me: answer these before you post" icon={<Flame size={16} className="text-orange-400" />}>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-white/85">
              {questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </Card>
        )}

        {!running && !versions.length && !error && (
          <div className="glass flex flex-col items-center rounded-2xl p-10 text-center text-white/60">
            <div className="mb-3 text-5xl">🤖✨</div>
            <p className="max-w-sm">Paste a draft and run the pipeline. Five specialist agents critique it at the same time, a rewriter fixes it, and a scorer grades it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
