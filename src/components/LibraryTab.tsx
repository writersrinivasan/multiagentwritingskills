"use client";

import { Download, Eye, Hammer, Package, Play, X } from "lucide-react";
import { useState } from "react";
import { download, skillZip } from "@/lib/client";
import { SKILLS, skillToMarkdown, type Skill, type SkillId } from "@/lib/skills";
import { Card, CopyButton, Markdown } from "./ui";

export function LibraryTab({ onRun, onForge }: { onRun: (id: SkillId) => void; onForge: (idea: string) => void }) {
  const [preview, setPreview] = useState<Skill | null>(null);

  const zipOne = async (s: Skill) => download(`${s.id}.zip`, await skillZip([{ name: s.id, md: skillToMarkdown(s) }]));
  const zipAll = async () => download("skill-studio-12-skills.zip", await skillZip(SKILLS.map((s) => ({ name: s.id, md: skillToMarkdown(s) }))));

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">12 writing skills for Claude, ready to install</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              Each card is a real Claude Agent Skill (a folder containing SKILL.md). Download a zip, then in Claude go to <b>Settings → Capabilities → Skills → Upload skill</b>. Or try any of them here first on Groq.
            </p>
          </div>
          <button className="btn-primary shrink-0" onClick={zipAll}>
            <Package size={18} /> Download all 12
          </button>
        </div>
        <p className="mt-3 text-xs text-white/40">The all-in-one zip holds 12 folders. Claude takes one skill per upload, so unzip it and re-zip each folder you want, or use the per-skill buttons.</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SKILLS.map((s) => (
          <div key={s.id} className="glass group flex flex-col overflow-hidden rounded-2xl">
            <div className={`bg-gradient-to-br ${s.gradient} p-4`}>
              <div className="flex items-center justify-between">
                <span className="text-3xl drop-shadow">{s.emoji}</span>
                <code className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold">/{s.id}</code>
              </div>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="text-sm text-white/90">{s.tagline}</p>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="line-clamp-3 flex-1 text-xs text-white/60">{s.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => onRun(s.id)}>
                  <Play size={14} /> Try
                </button>
                <button className="btn-ghost" onClick={() => setPreview(s)}>
                  <Eye size={14} /> SKILL.md
                </button>
                <button className="btn-ghost" onClick={() => zipOne(s)}>
                  <Download size={14} /> .zip
                </button>
                <button className="btn-ghost" title="Customise this skill with the Forge agents" onClick={() => onForge(`A customised version of the "${s.id}" skill: ${s.description}\n\nMy tweaks: `)}>
                  <Hammer size={14} /> Remix
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="glass flex max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl bg-[#0d0b1a]/95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h3 className="font-bold">
                {preview.emoji} {preview.id}/SKILL.md
              </h3>
              <div className="flex gap-2">
                <CopyButton text={skillToMarkdown(preview)} />
                <button className="btn-ghost" onClick={() => zipOne(preview)}>
                  <Download size={14} /> .zip
                </button>
                <button onClick={() => setPreview(null)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-2">
              <pre className="overflow-auto border-white/10 p-4 font-mono text-xs leading-relaxed text-white/80 md:border-r">{skillToMarkdown(preview)}</pre>
              <div className="overflow-auto p-4">
                <Markdown>{skillToMarkdown(preview).replace(/^---[\s\S]*?---\n/, "")}</Markdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
