"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { humanScore, segments } from "@/lib/scanner";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-skill">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn-ghost"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
    >
      {ok ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      {ok ? "Copied" : label}
    </button>
  );
}

export function Card({ title, icon, children, right, className = "" }: { title?: string; icon?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-2xl p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
            {icon}
            {title}
          </h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function scoreColor(n: number) {
  return n >= 80 ? "#34d399" : n >= 60 ? "#fbbf24" : "#fb7185";
}

export function ScoreRing({ value, size = 84, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const color = scoreColor(value);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / .1)" strokeWidth={7} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="white" fontSize={size / 3.6} fontWeight={700} transform={`rotate(90 ${size / 2} ${size / 2})`}>
          {value}
        </text>
      </svg>
      {label && <span className="text-xs text-white/60">{label}</span>}
    </div>
  );
}

/** Text with AI tells highlighted inline; hover for the reason. */
export function Highlighted({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">
      {segments(text).map((s, i) =>
        s.match ? (
          <mark key={i} title={`${s.match.label}: ${s.match.hint}`} className="cursor-help rounded bg-rose-500/30 px-0.5 text-rose-100 underline decoration-rose-400 decoration-wavy underline-offset-4">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </div>
  );
}

export function HumanMeter({ text }: { text: string }) {
  const v = humanScore(text);
  return (
    <div className="flex items-center gap-2 text-xs text-white/70">
      <span>Human score</span>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: scoreColor(v) }} />
      </div>
      <span className="font-mono font-semibold" style={{ color: scoreColor(v) }}>
        {v}
      </span>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/50">{hint}</span>}
    </label>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{message}</div>;
}
