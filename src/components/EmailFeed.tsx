"use client";

import { useState, useEffect } from "react";
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
  const [gmailConnected, setGmailConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.search.includes("gmail=connected")) {
      setGmailConnected(true);
      handleSync();
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetch("/api/auth/google", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setGmailConnected(d.connected))
      .catch(() => {});
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/gmail-sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`Synced ${data.synced} job emails from Gmail`);
      } else {
        setSyncResult(data.error || "Sync failed");
      }
    } catch {
      setSyncResult("Failed to sync");
    }
    setSyncing(false);
  }

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden animate-in">
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold tracking-tight uppercase">
            Intelligent Email Feed
          </h3>
          {gmailConnected ? (
            <span className="text-[10px] font-mono text-primary animate-pulse">
              GMAIL CONNECTED
            </span>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground">
              SIMULATED
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
              {syncResult}
            </span>
          )}
          {gmailConnected ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 rounded-full border border-primary/30 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Gmail"}
            </button>
          ) : (
            <a
              href="/api/auth/google"
              className="px-3 py-1.5 rounded-full border border-primary/30 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connect Gmail
            </a>
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {emails.length} parsed by Claude
          </span>
        </div>
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
                    <span className="text-muted-foreground">{e.sender} -</span>{" "}
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
