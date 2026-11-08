"use client";

import { Check, Loader2 } from "lucide-react";

export type NodeStatus = "idle" | "running" | "done";

export interface FlowNode {
  id: string;
  label: string;
  emoji: string;
  gradient: string;
}

function Pill({ node, status, badge }: { node: FlowNode; status: NodeStatus; badge?: string }) {
  return (
    <div
      className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
        status === "idle" ? "bg-white/5 text-white/50" : `bg-gradient-to-r ${node.gradient} text-white shadow-lg`
      } ${status === "running" ? "running" : ""}`}
    >
      <span className="text-base">{node.emoji}</span>
      <span className="whitespace-nowrap">{node.label}</span>
      {status === "running" && <Loader2 size={14} className="animate-spin" />}
      {status === "done" && <Check size={14} />}
      {badge && <span className="absolute -right-2 -top-2 rounded-full bg-white px-1.5 text-[10px] font-bold text-black">{badge}</span>}
    </div>
  );
}

const Arrow = ({ active }: { active: boolean }) => (
  <div className={`mx-1 hidden h-0.5 w-6 shrink-0 rounded md:block ${active ? "bg-gradient-to-r from-fuchsia-400 to-orange-400" : "bg-white/15"}`} />
);

/** Renders stages left→right; each stage is a column of parallel agents. */
export function AgentFlow({
  stages,
  status,
  badges = {},
  loopNote,
}: {
  stages: FlowNode[][];
  status: Record<string, NodeStatus>;
  badges?: Record<string, string>;
  loopNote?: string;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max flex-col gap-3 md:flex-row md:items-center">
        {stages.map((col, i) => {
          const active = col.some((n) => status[n.id] && status[n.id] !== "idle");
          return (
            <div key={i} className="flex items-center">
              {i > 0 && <Arrow active={active} />}
              <div className="flex flex-wrap gap-2 md:flex-col">
                {col.map((n) => (
                  <Pill key={n.id} node={n} status={status[n.id] ?? "idle"} badge={badges[n.id]} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {loopNote && <p className="mt-3 text-xs text-white/50">↺ {loopNote}</p>}
    </div>
  );
}
