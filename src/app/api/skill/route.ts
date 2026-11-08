import { friendlyError, ask, makeModel, requireKey } from "@/lib/llm";
import { SKILL_MAP, type SkillId } from "@/lib/skills";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const key = requireKey(req);
  if (key instanceof Response) return key;
  const { skillId, input, context = "", voice = "", model } = await req.json();
  const skill = SKILL_MAP[skillId as SkillId];
  if (!skill) return Response.json({ error: "Unknown skill." }, { status: 400 });
  if (!input?.trim()) return Response.json({ error: "Add some input first." }, { status: 400 });
  try {
    const output = await ask(
      makeModel(key, model, 0.6),
      `You are running the Claude skill "/${skill.id}". ${skill.description}\n\n${skill.instructions}\n\nWrite in plain, human English. Never use: delve, crucial, pivotal, tapestry, robust, seamless, realm, "here's the thing". Format the answer in GitHub-flavoured markdown.${
        skill.usesVoice && voice ? `\n\nUSER'S VOICE PROFILE (match it):\n${voice}` : ""
      }`,
      `${skill.inputLabel}:\n${String(input).slice(0, 12000)}${context ? `\n\n${skill.contextLabel ?? "Context"}:\n${String(context).slice(0, 8000)}` : ""}`,
    );
    return Response.json({ output });
  } catch (e) {
    return Response.json({ error: friendlyError(e) }, { status: 502 });
  }
}
