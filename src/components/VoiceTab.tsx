"use client";

import { Dna, Download, Loader2, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { download, postJSON, skillZip, useSettings } from "@/lib/client";
import { SKILL_MAP, skillToMarkdown } from "@/lib/skills";
import { Card, CopyButton, ErrorBox, Field, Markdown } from "./ui";

export function VoiceTab() {
  const { apiKey, model, voice, setVoice, setOpenSettings } = useSettings();
  const [samples, setSamples] = useState("");
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  async function build() {
    if (!apiKey) return setOpenSettings(true);
    setBusy(true);
    setError("");
    try {
      const { output } = await postJSON<{ output: string }>("/api/skill", apiKey, { skillId: "voice-dna", input: samples, model });
      setProfile(output);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // A personal-voice skill with the profile baked in, so Claude writes like you everywhere.
  const myVoiceSkill = (p: string) =>
    skillToMarkdown(
      {
        ...SKILL_MAP["personal-voice"],
        id: "my-voice",
        title: "My Voice",
        description: "Rewrites or drafts any text in the user's personal writing voice using their stored voice profile. Use whenever the user asks to write, rewrite or draft posts, emails or messages 'as me' or 'in my voice'.",
      },
      `## My voice profile\n\n${p}`,
    );

  const words = samples.trim() ? samples.trim().split(/\s+/).length : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card title="Your writing samples" icon={<Dna size={16} className="text-indigo-400" />}>
          <p className="mb-4 text-sm text-white/60">Paste things <i>you</i> wrote yourself: posts, emails, Slack messages. More variety gives a better profile. 300+ words works best.</p>
          <textarea className="input min-h-80" placeholder={"Sample 1…\n\n---\n\nSample 2…"} value={samples} onChange={(e) => setSamples(e.target.value)} />
          <div className="mt-2 flex items-center justify-between text-xs text-white/50">
            <span>{words} words</span>
            <span className={words >= 300 ? "text-emerald-400" : ""}>{words >= 300 ? "Plenty ✓" : `${Math.max(0, 300 - words)} more words recommended`}</span>
          </div>
          <button className="btn-primary mt-4 w-full justify-center" disabled={busy || words < 20} onClick={build}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Dna size={18} />} Extract my Voice DNA
          </button>
        </Card>
        {error && <ErrorBox message={error} />}
      </div>

      <div className="space-y-4">
        {profile && (
          <Card
            title="New profile"
            right={
              <div className="flex gap-2">
                <CopyButton text={profile} />
                <button className="btn-primary !py-1.5 !text-sm" onClick={() => (setVoice(profile), setProfile(""))}>
                  <Save size={14} /> Save as my voice
                </button>
              </div>
            }
          >
            <Markdown>{profile}</Markdown>
          </Card>
        )}

        <Card
          title="Active voice"
          icon={<span>🧬</span>}
          right={
            voice && (
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => (setEditing(!editing), setDraft(voice))}>
                  {editing ? "Cancel" : "Edit"}
                </button>
                <button className="btn-ghost" onClick={async () => download("my-voice.zip", await skillZip([{ name: "my-voice", md: myVoiceSkill(voice) }]))}>
                  <Download size={14} /> As Claude skill
                </button>
                <button className="btn-ghost text-rose-300" onClick={() => confirm("Delete your saved voice profile?") && setVoice("")}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          }
        >
          {!voice ? (
            <p className="text-sm text-white/50">No voice saved yet. Once you save one, the Polish Pipeline, /linkedin-post and /personal-voice will write like you.</p>
          ) : editing ? (
            <div className="space-y-3">
              <Field label="Edit profile">
                <textarea className="input min-h-72 font-mono text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} />
              </Field>
              <button className="btn-primary" onClick={() => (setVoice(draft), setEditing(false))}>
                <Save size={14} /> Save
              </button>
            </div>
          ) : (
            <div className="max-h-[32rem] overflow-auto">
              <Markdown>{voice}</Markdown>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
