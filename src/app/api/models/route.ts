import { requireKey } from "@/lib/llm";

export const runtime = "nodejs";

/** Lists chat models on the caller's Groq account; doubles as a key check. */
export async function GET(req: Request) {
  const key = requireKey(req);
  if (key instanceof Response) return key;
  const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!r.ok) return Response.json({ error: r.status === 401 ? "Groq rejected this API key." : `Groq error ${r.status}` }, { status: r.status });
  const data = (await r.json()) as { data: { id: string; active?: boolean; context_window?: number }[] };
  const models = data.data
    .filter((m) => m.active !== false && !/whisper|tts|guard|playai|orpheus|distil|prompt-guard|safeguard/i.test(m.id))
    .map((m) => ({ id: m.id, ctx: m.context_window ?? 0 }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return Response.json({ models });
}
