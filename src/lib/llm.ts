import { ChatGroq } from "@langchain/groq";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/** BYOK: the key comes from the request header on every call and is never stored server-side. */
export function makeModel(apiKey: string, model = DEFAULT_MODEL, temperature = 0.5) {
  return new ChatGroq({ apiKey, model, temperature, maxRetries: 1 });
}

export type Model = ReturnType<typeof makeModel>;

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((c) => (typeof c === "string" ? c : c && typeof c === "object" && "text" in c ? String((c as { text: unknown }).text) : ""))
      .join("");
  return "";
}

/** Strip reasoning blocks some Groq-hosted models emit. */
const clean = (s: string) => s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

export async function ask(model: Model, system: string, user: string): Promise<string> {
  const res = await model.invoke([
    ["system", system],
    ["human", user],
  ]);
  return clean(contentToText(res.content));
}

export function parseJSON<T>(text: string, fallback: T): T {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) return fallback;
  try {
    return { ...fallback, ...JSON.parse(unfenced.slice(start, end + 1)) };
  } catch {
    return fallback;
  }
}

export async function askJSON<T>(model: Model, system: string, user: string, fallback: T, shape: string): Promise<T> {
  const text = await ask(
    model,
    `${system}\n\nRespond with ONE JSON object and nothing else. No markdown fences. Shape:\n${shape}`,
    user,
  );
  return parseJSON(text, fallback);
}

export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/401|invalid api key|unauthorized/i.test(msg)) return "Groq rejected your API key. Check it in Settings (🔑).";
  if (/429|rate limit/i.test(msg)) return "Groq rate limit hit. Wait a few seconds or pick a smaller model.";
  if (/model.*(not found|decommissioned|does not exist)/i.test(msg)) return "That model isn't available on your Groq account. Pick another in Settings.";
  return msg.slice(0, 400);
}

/** Turn a LangGraph `updates` stream into an NDJSON HTTP response. */
export function streamGraph(iter: Promise<AsyncIterable<Record<string, unknown>>>): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        for await (const chunk of await iter) {
          for (const [node, update] of Object.entries(chunk)) {
            if (node.startsWith("__")) continue;
            send({ type: "update", node, update });
          }
        }
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: friendlyError(e) });
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" } });
}

export function requireKey(req: Request): string | Response {
  const key = req.headers.get("x-groq-key")?.trim();
  if (!key) return Response.json({ error: "Add your Groq API key in Settings (🔑) first." }, { status: 401 });
  return key;
}
