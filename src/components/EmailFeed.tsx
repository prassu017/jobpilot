"use client";

import { cn } from "@/lib/utils";

interface EmailWithJob {
  email_id: string;
  sender: string;
  subject: string;
  body_snippet: string;
  received_at: string;
  classification: string;
  confidence: string;
  company: string;
  title: string;
}

const INTENT_STYLE: Record<string, { label: string; cls: string }> = {
  INTERVIEW: {
    label: "Interview",
    cls: "bg-primary/10 text-primary border-primary/20",
  },
  OFFER: {
    label: "Offer",
    cls: "bg-primary/15 text-primary border-primary/30",
  },
  SCREENING: {
    label: "Screening",
    cls: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  },
  APPLIED: {
    label: "Applied",
    cls: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  },
  REJECTED: {
    label: "Rejection",
    cls: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EmailFeed({ emails }: { emails: EmailWithJob[] }) {
  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden animate-in">
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold tracking-tight uppercase">
            Intelligent Email Feed
          </h3>
          <span className="text-[10px] font-mono text-primary animate-pulse">
            SCANNING...
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {emails.length} parsed by Claude
        </span>
      </header>
      <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
        {emails.map((e) => {
          const intent = INTENT_STYLE[e.classification] || {
            label: e.classification,
            cls: "bg-white/5 text-muted-foreground border-white/10",
          };
          return (
            <li
              key={e.email_id}
              className="group px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0">
                  {timeAgo(e.received_at)}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider shrink-0",
                    intent.cls
                  )}
                >
                  {intent.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    <span className="text-muted-foreground">{e.sender} ·</span>{" "}
                    {e.company}
                    <span className="text-muted-foreground"> - </span>
                    {e.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {e.body_snippet}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {(parseFloat(e.confidence) * 100).toFixed(0)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
