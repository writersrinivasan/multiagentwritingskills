"use client";

import { BookOpen, Dna, Hammer, KeyRound, Layers, Wand2 } from "lucide-react";
import { useState } from "react";
import { ForgeTab } from "@/components/ForgeTab";
import { LibraryTab } from "@/components/LibraryTab";
import { PolishTab } from "@/components/PolishTab";
import { RunnerTab } from "@/components/RunnerTab";
import { SettingsModal } from "@/components/SettingsModal";
import { VoiceTab } from "@/components/VoiceTab";
import { SettingsProvider, useSettings } from "@/lib/client";
import type { SkillId } from "@/lib/skills";

type Tab = "polish" | "runner" | "library" | "forge" | "voice";

const TABS: { id: Tab; label: string; icon: typeof Wand2; grad: string; blurb: string }[] = [
  { id: "polish", label: "Polish Pipeline", icon: Wand2, grad: "from-fuchsia-500 to-orange-500", blurb: "7 agents in a LangGraph critique, rewrite and score your draft" },
  { id: "runner", label: "Skill Runner", icon: Layers, grad: "from-sky-500 to-indigo-500", blurb: "Run any of the 12 skills on your text and chain them together" },
  { id: "library", label: "Skill Library", icon: BookOpen, grad: "from-emerald-500 to-teal-500", blurb: "Download installable SKILL.md zips for Claude" },
  { id: "forge", label: "Skill Forge", icon: Hammer, grad: "from-amber-400 to-rose-500", blurb: "Architect, Writer and Critic agents build a new Claude skill for you" },
  { id: "voice", label: "Voice DNA", icon: Dna, grad: "from-indigo-500 to-violet-600", blurb: "Teach the agents how you write" },
];

function Studio() {
  const { apiKey, model, voice, ready, setOpenSettings } = useSettings();
  const [tab, setTab] = useState<Tab>("polish");
  const [runSkill, setRunSkill] = useState<SkillId | undefined>();
  const [forgeSeed, setForgeSeed] = useState<string | undefined>();
  const [runNonce, setRunNonce] = useState(0);
  const [forgeNonce, setForgeNonce] = useState(0);
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-orange-400 to-sky-500 text-xl shadow-lg shadow-fuchsia-500/30">✦</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Skill <span className="gradient-text">Studio</span>
            </h1>
            <p className="text-xs text-white/50">Multi-agent writing skills for Claude · LangGraph + Groq</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {voice && <span className="hidden rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs text-indigo-200 sm:inline">🧬 Voice on</span>}
          <button onClick={() => setOpenSettings(true)} className={`btn-ghost ${ready && !apiKey ? "!border-fuchsia-400 text-fuchsia-200 running" : ""}`}>
            <KeyRound size={14} />
            {ready && apiKey ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="max-w-40 truncate font-mono text-xs">{model}</span>
              </>
            ) : (
              "Add Groq key"
            )}
          </button>
        </div>
      </header>

      <nav className="glass mb-3 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === t.id ? `bg-gradient-to-r ${t.grad} text-white shadow-lg` : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </nav>
      <p className="mb-6 px-1 text-sm text-white/50">{active.blurb}</p>

      {ready && !apiKey && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/10 to-orange-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <b>Bring your own key.</b> Skill Studio runs on your free Groq API key. It stays in your browser.
          </p>
          <button className="btn-primary !py-2 !text-sm" onClick={() => setOpenSettings(true)}>
            <KeyRound size={14} /> Add key
          </button>
        </div>
      )}

      <main>
        <div hidden={tab !== "polish"}>
          <PolishTab />
        </div>
        <div hidden={tab !== "runner"}>
          <RunnerTab key={`r${runNonce}`} initial={runSkill} />
        </div>
        {tab === "library" && (
          <LibraryTab
            onRun={(id) => (setRunSkill(id), setRunNonce((n) => n + 1), setTab("runner"))}
            onForge={(idea) => (setForgeSeed(idea), setForgeNonce((n) => n + 1), setTab("forge"))}
          />
        )}
        <div hidden={tab !== "forge"}>
          <ForgeTab key={`f${forgeNonce}`} seed={forgeSeed} />
        </div>
        <div hidden={tab !== "voice"}>
          <VoiceTab />
        </div>
      </main>

      <footer className="mt-16 text-center text-xs text-white/35">
        Inspired by Ruben Hassid&apos;s list of 12 Claude writing skills. Runs on your own Groq key, and no data is stored on the server.
      </footer>
      <SettingsModal />
    </div>
  );
}

export default function Page() {
  return (
    <SettingsProvider>
      <Studio />
    </SettingsProvider>
  );
}
