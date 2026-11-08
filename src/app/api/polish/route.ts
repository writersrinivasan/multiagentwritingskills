import { buildPolishGraph } from "@/lib/graphs/polish";
import { makeModel, requireKey, streamGraph } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const key = requireKey(req);
  if (key instanceof Response) return key;
  const { draft, goal = "", voice = "", model } = await req.json();
  if (!draft?.trim()) return Response.json({ error: "Paste a draft first." }, { status: 400 });
  const graph = buildPolishGraph(makeModel(key, model, 0.6));
  return streamGraph(graph.stream({ draft: String(draft).slice(0, 12000), goal, voice }, { streamMode: "updates", recursionLimit: 30 }));
}
