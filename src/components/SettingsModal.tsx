"use client";

import { ExternalLink, KeyRound, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_MODEL, useSettings } from "@/lib/client";
import { ErrorBox, Field } from "./ui";

const FALLBACK = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

export function SettingsModal() {
  const { apiKey, setApiKey, model, setModel, openSettings, setOpenSettings } = useSettings();
  const [draftKey, setDraftKey] = useState(apiKey);
  const [models, setModels] = useState<string[]>(FALLBACK);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (openSettings) {
      setDraftKey(apiKey);
      setMsg(null);
      if (apiKey) void check(apiKey, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSettings]);

  async function check(key: string, save = true) {
    setChecking(true);
    setMsg(null);
    try {
      const r = await fetch("/api/models", { headers: { "x-groq-key": key } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      const ids: string[] = data.models.map((m: { id: string }) => m.id);
      if (ids.length) setModels(ids);
      if (save) setApiKey(key);
      if (!ids.includes(model) && ids.length) setModel(ids.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : ids[0]);
      setMsg({ ok: true, text: `Key works. ${ids.length} models available.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setChecking(false);
    }
  }

  if (!openSettings) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpenSettings(false)}>
      <div className="glass w-full max-w-lg rounded-3xl bg-[#0d0b1a]/95 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <KeyRound className="text-fuchsia-400" /> Bring your own Groq key
          </h2>
          <button onClick={() => setOpenSettings(false)} className="rounded-full p-1 hover:bg-white/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Groq API key">
            <input
              type="password"
              className="input font-mono text-sm"
              placeholder="gsk_…"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline">
            Get a free key at console.groq.com <ExternalLink size={12} />
          </a>

          <Field label="Model" hint="Bigger models write better; 8B is fastest and gentlest on rate limits.">
            <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
              {[...new Set([model, ...models])].map((m) => (
                <option key={m} value={m} className="bg-[#0d0b1a]">
                  {m}
                </option>
              ))}
            </select>
          </Field>

          {msg && (msg.ok ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{msg.text}</div> : <ErrorBox message={msg.text} />)}

          <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs text-white/60">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            Your key is kept in this browser&apos;s localStorage and sent only with your own requests to this app&apos;s API routes, which forward it to Groq. The server never stores or logs it.
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              className="btn-ghost text-rose-300"
              onClick={() => {
                setApiKey("");
                setDraftKey("");
                setMsg(null);
              }}
            >
              <Trash2 size={14} /> Forget key
            </button>
            <button className="btn-primary" disabled={!draftKey.trim() || checking} onClick={() => check(draftKey.trim())}>
              {checking ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Verify & save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
