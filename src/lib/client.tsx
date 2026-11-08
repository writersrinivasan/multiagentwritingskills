"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

interface Settings {
  apiKey: string;
  model: string;
  voice: string;
  ready: boolean;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  setVoice: (v: string) => void;
  openSettings: boolean;
  setOpenSettings: (o: boolean) => void;
}

const Ctx = createContext<Settings | null>(null);

const read = (k: string, d = "") => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const write = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {}
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKey, setK] = useState("");
  const [model, setM] = useState(DEFAULT_MODEL);
  const [voice, setV] = useState("");
  const [ready, setReady] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    setK(read("ss.groqKey"));
    setM(read("ss.model", DEFAULT_MODEL));
    setV(read("ss.voice"));
    setReady(true);
  }, []);

  const setApiKey = useCallback((k: string) => (setK(k), write("ss.groqKey", k)), []);
  const setModel = useCallback((m: string) => (setM(m), write("ss.model", m)), []);
  const setVoice = useCallback((v: string) => (setV(v), write("ss.voice", v)), []);

  return (
    <Ctx.Provider value={{ apiKey, model, voice, ready, setApiKey, setModel, setVoice, openSettings, setOpenSettings }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSettings outside provider");
  return c;
}

export async function postJSON<T>(url: string, key: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-groq-key": key }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok || data.error) throw new Error(data.error ?? `HTTP ${r.status}`);
  return data as T;
}

export type GraphEvent = { type: "update"; node: string; update: Record<string, unknown> } | { type: "done" } | { type: "error"; message: string };

/** POST and read an NDJSON stream of LangGraph updates. */
export async function streamGraph(url: string, key: string, body: unknown, onEvent: (e: GraphEvent) => void, signal?: AbortSignal) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-groq-key": key }, body: JSON.stringify(body), signal });
  if (!r.ok || !r.body) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${r.status}`);
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}

export function download(filename: string, content: Blob | string, type = "text/markdown") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Claude expects a zip containing a folder named after the skill with SKILL.md inside. */
export async function skillZip(skills: { name: string; md: string }[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const s of skills) zip.folder(s.name)!.file("SKILL.md", s.md);
  return zip.generateAsync({ type: "blob" });
}
