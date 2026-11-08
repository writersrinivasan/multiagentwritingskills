import { buildForgeGraph } from "@/lib/graphs/forge";
import { makeModel, requireKey, streamGraph } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const key = requireKey(req);
  if (key instanceof Response) return key;
  const { idea, examples = "", model } = await req.json();
  if (!idea?.trim()) return Response.json({ error: "Describe the skill you want first." }, { status: 400 });
  const graph = buildForgeGraph(makeModel(key, model, 0.4));
  return streamGraph(graph.stream({ idea: String(idea).slice(0, 6000), examples: String(examples).slice(0, 6000) }, { streamMode: "updates", recursionLimit: 20 }));
}
