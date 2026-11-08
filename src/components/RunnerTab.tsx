"use client";

import { Loader2, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { postJSON, useSettings } from "@/lib/client";
import { SKILLS, SKILL_MAP, type SkillId } from "@/lib/skills";
import { Card, CopyButton, ErrorBox, Field, Markdown } from "./ui";

interface Run {
  skill: SkillId;
  input: string;
  output: string;
  at: number;
}

export function RunnerTab({ initial }: { initial?: SkillId }) {
  const { apiKey, model, voice, setOpenSettings } = useSettings();
  const [sel, setSel] = useState<SkillId>(initial ?? "humanizer");
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const skill = SKILL_MAP[sel];
  const latest = runs.find((r) => r.skill === sel);

  async function run(text = input) {
    if (!apiKey) return setOpenSettings(true);
    setBusy(true);
    setError("");
    try {
      const { output } = await postJSON<{ output: string }>("/api/skill", apiKey, { skillId: sel, input: text, context, voice, model });
      setRuns((r) => [{ skill: sel, input: text, output, at: Date.now() }, ...r].slice(0, 30));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SKILLS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSel(s.id);
              setError("");
            }}
            className={`group rounded-2xl p-3 text-left transition-all ${
              sel === s.id ? `bg-gradient-to-br ${s.gradient} shadow-xl ring-2 ${s.ring}` : "glass hover:bg-white/10"
            }`}
          >
            <div className="text-2xl">{s.emoji}</div>
            <div className="mt-1 text-sm font-semibold">/{s.id}</div>
            <div className={`mt-0.5 line-clamp-2 text-[11px] ${sel === s.id ? "text-white/90" : "text-white/50"}`}>{s.tagline}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`/${skill.id}`} icon={<span className="text-lg">{skill.emoji}</span>}>
          <p className="mb-4 text-sm text-white/60">{skill.description}</p>
          <div className="space-y-4">
            <Field label={skill.inputLabel}>
              <textarea className="input min-h-48" placeholder={skill.inputPlaceholder} value={input} onChange={(e) => setInput(e.target.value)} />
            </Field>
            {skill.contextLabel && (
              <Field label={skill.contextLabel}>
                <textarea className="input min-h-24" placeholder={skill.contextPlaceholder} value={context} onChange={(e) => setContext(e.target.value)} />
              </Field>
            )}
            {skill.usesVoice && <p className="text-xs text-white/50">{voice ? "🧬 Your Voice DNA profile will be applied." : "Tip: build a Voice DNA profile so this skill writes like you."}</p>}
            <button className="btn-primary w-full justify-center" disabled={busy || !input.trim()} onClick={() => run()}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Run /{skill.id}
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          {error && <ErrorBox message={error} />}
          {latest ? (
            <Card
              title="Result"
              right={
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Feed this result back in as the new input" onClick={() => setInput(latest.output)}>
                    <RotateCcw size={14} /> Use as input
                  </button>
                  <CopyButton text={latest.output} />
                </div>
              }
            >
              <Markdown>{latest.output}</Markdown>
            </Card>
          ) : (
            <div className="glass flex h-full min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center text-white/50">
              <div className={`mb-3 rounded-2xl bg-gradient-to-br ${skill.gradient} p-4 text-4xl`}>{skill.emoji}</div>
              Pick a skill, paste your text, run it. Chain skills with “Use as input”: try /grill-me → /copywriting → /humanizer.
            </div>
          )}
          {runs.length > 1 && (
            <Card title="Recent runs">
              <div className="flex flex-wrap gap-2">
                {runs.slice(0, 12).map((r) => (
                  <button key={r.at} className="btn-ghost" onClick={() => (setSel(r.skill), setInput(r.input), setRuns((all) => [r, ...all.filter((x) => x !== r)]))}>
                    {SKILL_MAP[r.skill].emoji} /{r.skill} · {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
