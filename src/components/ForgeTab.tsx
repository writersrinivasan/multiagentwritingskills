"use client";

import { Download, Hammer, Lightbulb, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Blueprint, Critique } from "@/lib/graphs/forge";
import { download, skillZip, streamGraph, useSettings } from "@/lib/client";
import { AgentFlow, type FlowNode, type NodeStatus } from "./AgentFlow";
import { Card, CopyButton, ErrorBox, Field, Markdown, ScoreRing } from "./ui";

const STAGES: FlowNode[][] = [
  [{ id: "architect", label: "Architect", emoji: "📐", gradient: "from-cyan-400 to-sky-600" }],
  [{ id: "writer", label: "Writer", emoji: "✍️", gradient: "from-fuchsia-500 to-pink-500" }],
  [{ id: "critic", label: "Critic", emoji: "🧐", gradient: "from-amber-400 to-orange-500" }],
  [{ id: "out", label: "SKILL.md", emoji: "📦", gradient: "from-emerald-500 to-teal-500" }],
];

const IDEAS = [
  "Turn messy meeting notes into a decisions + action-items summary with owners and due dates",
  "Review a pull request description and rewrite it with context, testing notes and risk",
  "Convert a rough product idea into a one-page PRD with goals, non-goals and success metrics",
  "Write weekly status updates for my manager from a bullet dump of what I did",
  "Explain a LangGraph error stack trace and suggest the fix",
];

const nameOf = (md: string) => md.match(/^name:\s*["']?([a-z0-9-]+)/m)?.[1] ?? "my-skill";

export function ForgeTab({ seed }: { seed?: string }) {
  const { apiKey, model, setOpenSettings } = useSettings();
  const [idea, setIdea] = useState(seed ?? "");
  const [examples, setExamples] = useState("");
  const [status, setStatus] = useState<Record<string, NodeStatus>>({});
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [md, setMd] = useState("");
  const [critique, setCritique] = useState<Critique | null>(null);
  const [rounds, setRounds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"preview" | "source">("preview");

  async function run() {
    if (!apiKey) return setOpenSettings(true);
    setBusy(true);
    setError("");
    setBlueprint(null);
    setMd("");
    setCritique(null);
    setRounds(0);
    const st: Record<string, NodeStatus> = { architect: "running" };
    setStatus({ ...st });
    try {
      await streamGraph("/api/forge", apiKey, { idea, examples, model }, (e) => {
        if (e.type === "error") return setError(e.message);
        if (e.type !== "update") return;
        const u = e.update as { blueprint?: Blueprint; skillMd?: string; critique?: Critique; iterations?: number };
        st[e.node] = "done";
        if (u.blueprint) {
          setBlueprint(u.blueprint);
          st.writer = "running";
        }
        if (u.skillMd) {
          setMd(u.skillMd);
          setRounds(u.iterations ?? 1);
          st.critic = "running";
        }
        if (u.critique) {
          setCritique(u.critique);
          if (u.critique.verdict === "revise") st.writer = "running";
        }
        setStatus({ ...st });
      });
      setStatus((s) => ({ ...s, out: "done" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setStatus((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v === "running" ? "idle" : v])));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-4">
        <Card title="Describe a skill" icon={<Hammer size={16} className="text-amber-400" />}>
          <p className="mb-4 text-sm text-white/60">Three agents design, write and review a Claude Agent Skill for a task you repeat every day. You get a zip that installs straight into Claude.</p>
          <div className="space-y-4">
            <Field label="What should Claude do?">
              <textarea className="input min-h-36" placeholder="e.g. Turn my voice-memo transcripts into a tidy daily journal entry…" value={idea} onChange={(e) => setIdea(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {IDEAS.map((i) => (
                <button key={i} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10" onClick={() => setIdea(i)}>
                  <Lightbulb size={10} className="mr-1 inline" />
                  {i.split(" ").slice(0, 5).join(" ")}…
                </button>
              ))}
            </div>
            <Field label="Examples, rules or house style (optional)">
              <textarea className="input min-h-24" placeholder="Paste a good example output, a template, or rules it must follow" value={examples} onChange={(e) => setExamples(e.target.value)} />
            </Field>
            <button className="btn-primary w-full justify-center" disabled={busy || !idea.trim()} onClick={run}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Hammer size={18} />} Forge skill
            </button>
          </div>
        </Card>

        {blueprint && (
          <Card title="Blueprint" icon={<span>📐</span>}>
            <div className="space-y-3 text-sm">
              <div>
                <code className="rounded bg-cyan-500/20 px-2 py-0.5 text-cyan-200">{blueprint.name}</code>
              </div>
              <p className="text-white/75">{blueprint.description}</p>
              {blueprint.triggers?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {blueprint.triggers.map((t, i) => (
                    <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                      “{t}”
                    </span>
                  ))}
                </div>
              )}
              {blueprint.steps?.length > 0 && (
                <ol className="list-decimal space-y-0.5 pl-5 text-white/70">
                  {blueprint.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card title="LangGraph agent flow" icon={<span>🕸️</span>}>
          <AgentFlow stages={STAGES} status={status} badges={rounds > 1 ? { writer: `v${rounds}` } : {}} loopNote="The Critic runs a format validator plus a best-practice review. Below 80/100, the Writer revises (up to 2 times)." />
        </Card>

        {error && <ErrorBox message={error} />}

        {critique && (
          <Card>
            <div className="flex items-center gap-5">
              <ScoreRing value={Math.max(0, critique.score)} label="Critic score" />
              <div className="flex-1 text-sm">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  {critique.verdict === "pass" ? <ShieldCheck size={16} className="text-emerald-400" /> : <ShieldAlert size={16} className="text-amber-400" />}
                  {critique.verdict === "pass" ? "Passed review" : busy ? "Sent back for revision…" : "Best effort after revisions"}
                </p>
                <ul className="space-y-0.5 text-white/65">
                  {critique.issues.slice(0, 5).map((i, k) => (
                    <li key={k}>• {i}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {md ? (
          <Card
            title={`${nameOf(md)}/SKILL.md`}
            icon={<span>📦</span>}
            right={
              <div className="flex flex-wrap gap-2">
                <div className="flex rounded-full bg-white/5 p-0.5 text-xs">
                  {(["preview", "source"] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 capitalize ${view === v ? "bg-white text-black" : ""}`}>
                      {v}
                    </button>
                  ))}
                </div>
                <CopyButton text={md} />
                <button className="btn-ghost" onClick={() => download("SKILL.md", md)}>
                  <Download size={14} /> .md
                </button>
                <button className="btn-primary !py-1.5 !text-sm" onClick={async () => download(`${nameOf(md)}.zip`, await skillZip([{ name: nameOf(md), md }]))}>
                  <Download size={14} /> Claude .zip
                </button>
              </div>
            }
          >
            {view === "source" ? (
              <textarea className="input min-h-[28rem] font-mono text-xs" value={md} onChange={(e) => setMd(e.target.value)} />
            ) : (
              <Markdown>{md.replace(/^---[\s\S]*?---\n/, "")}</Markdown>
            )}
          </Card>
        ) : (
          !busy && (
            <div className="glass flex flex-col items-center rounded-2xl p-10 text-center text-white/60">
              <div className="mb-3 text-5xl">⚒️📦</div>
              <p className="max-w-sm">Describe a task you do every day. The Forge returns an installable Claude skill for it.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
