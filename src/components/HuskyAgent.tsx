"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TrackerRow {
  company: string;
  title: string;
  stage: string;
  applied_on: string;
  platform: string;
  location: string;
  url: string;
  salary: string;
  notes: string;
}

interface TrackerData {
  rows: TrackerRow[];
  analytics: {
    total: number;
    stages: Record<string, number>;
    active: number;
    response_rate: number;
    interview_rate: number;
    offer_rate: number;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  resumeHtml?: string;
}

const STAGE_STYLE: Record<string, string> = {
  APPLIED: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  SCREENING: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  INTERVIEW: "bg-purple-400/10 text-purple-300 border-purple-400/20",
  OFFER: "bg-primary/15 text-primary border-primary/30",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  SAVED: "bg-white/5 text-muted-foreground border-white/10",
};

function getSuggestions(tracker: TrackerData | null): string[] {
  if (!tracker || tracker.rows.length === 0) {
    return [
      "What can you help me with?",
      "Help me start my job search",
      "What makes a strong application?",
      "Review my resume strategy",
    ];
  }

  const suggestions: string[] = [];
  const interviews = tracker.rows.filter((r) => r.stage === "INTERVIEW");
  const offers = tracker.rows.filter((r) => r.stage === "OFFER");
  const now = Date.now();
  const stale = tracker.rows.filter((r) => {
    if (r.stage !== "APPLIED" || !r.applied_on) return false;
    const days = (now - new Date(r.applied_on).getTime()) / 86400000;
    return days > 14 && days < 60;
  });

  if (interviews.length > 0) {
    suggestions.push(`Help me prep for my ${interviews[0].company} interview`);
  }
  if (offers.length > 0) {
    suggestions.push(`Help me negotiate my ${offers[0].company} offer`);
  }
  if (stale.length > 0) {
    suggestions.push(`Which ${stale.length} apps need a follow-up?`);
  }
  suggestions.push("What patterns do you see in my rejections?");
  if (suggestions.length < 4) {
    suggestions.push("Give me a full status breakdown");
  }
  if (suggestions.length < 4) {
    suggestions.push("What should I focus on this week?");
  }

  return suggestions.slice(0, 4);
}

export default function HuskyAgent({ onDataUpdate }: { onDataUpdate: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [view, setView] = useState<"chat" | "tracker">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function loadTracker() {
    try {
      const res = await fetch("/api/tracker");
      const data = await res.json();
      setTracker(data);
    } catch {}
  }

  useEffect(() => {
    loadTracker();
    fetch("/api/auth/google", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setGmailConnected(d.connected))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setThinking(true);

    try {
      const res = await fetch("/api/dubsy-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.response) {
        setMessages([...newMessages, { role: "assistant", content: data.response, resumeHtml: data.resumeHtml || undefined }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.error || "Something went wrong." }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Failed to reach Dubsy. Check your connection." }]);
    }
    setThinking(false);
  }

  async function runHusky() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/husky", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setScanResult(
          `Scanned ${data.scanned} emails. Found ${data.extracted} job-related. Added ${data.added} new, updated ${data.updated}. Total tracked: ${data.total}`
        );
        loadTracker();
        onDataUpdate();
      } else {
        setScanResult(data.error || "Scan failed");
      }
    } catch {
      setScanResult("Failed to run Husky");
    }
    setScanning(false);
  }

  const rows = tracker?.rows || [];
  const analytics = tracker?.analytics;

  return (
    <section className="space-y-4 animate-in">
      {/* Dubsy Agent Header */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/20 rounded-lg flex items-center justify-center text-lg">
              🐺
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight uppercase">
                Dubsy Agent
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                AI assistant with email + tracker access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden text-[10px] font-mono uppercase tracking-widest">
              <button
                onClick={() => setView("chat")}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  view === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Chat
              </button>
              <button
                onClick={() => setView("tracker")}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  view === "tracker" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tracker
              </button>
            </div>
            {!gmailConnected ? (
              <a
                href="/api/auth/google"
                className="px-3 py-1.5 rounded-lg border border-primary/30 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connect Gmail
              </a>
            ) : (
              <button
                onClick={runHusky}
                disabled={scanning}
                className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {scanning ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    Scanning...
                  </span>
                ) : (
                  "Sync Email"
                )}
              </button>
            )}
          </div>
        </div>
        {scanResult && (
          <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[10px] font-mono text-primary">{scanResult}</p>
          </div>
        )}
      </div>

      {/* Chat View */}
      {view === "chat" && (
        <div className="bg-card border border-border rounded-lg flex flex-col" style={{ height: "calc(100vh - 320px)", minHeight: "400px" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-4xl">🐺</p>
                  <p className="text-sm font-medium">Hey! I&apos;m Dubsy</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Your AI assistant with access to your job tracker and email. Ask me anything - career advice, application status, interview prep, or just chat.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                  {getSuggestions(tracker).map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left px-3 py-2.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/[0.03] border border-border"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-2">
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.resumeHtml && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                          <button
                            onClick={() => {
                              const blob = new Blob([msg.resumeHtml!], { type: "text/html" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "resume.html";
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-mono uppercase tracking-widest hover:bg-primary/90 transition-colors"
                          >
                            Download Resume
                          </button>
                          <button
                            onClick={() => {
                              const w = window.open("", "_blank");
                              if (w) {
                                w.document.write(msg.resumeHtml!);
                                w.document.close();
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                          >
                            Preview
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white/[0.03] border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Dubsy anything..."
                className="flex-1 bg-white/[0.03] border border-border rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                disabled={thinking}
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-30"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tracker View */}
      {view === "tracker" && (
        <>
          {/* Quick Stats */}
          {analytics && analytics.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Total Tracked", value: analytics.total, cls: "text-foreground" },
                { label: "Active", value: analytics.active, cls: "text-primary" },
                { label: "Interview Rate", value: `${analytics.interview_rate.toFixed(0)}%`, cls: "text-purple-400" },
                { label: "Response Rate", value: `${analytics.response_rate.toFixed(0)}%`, cls: "text-blue-400" },
                { label: "Offer Rate", value: `${analytics.offer_rate.toFixed(0)}%`, cls: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className={cn("text-2xl font-black tracking-tighter mt-1", s.cls)}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tracker Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold tracking-tight uppercase">
                Application Tracker
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {rows.length} applications
              </span>
            </div>
            {rows.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">No applications tracked yet</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    {gmailConnected ? "Click 'Sync Email' to scan your Gmail" : "Connect Gmail to get started"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      <th className="text-left px-5 py-3">Company</th>
                      <th className="text-left px-3 py-3">Title</th>
                      <th className="text-left px-3 py-3">Stage</th>
                      <th className="text-left px-3 py-3">Applied</th>
                      <th className="text-left px-3 py-3">Platform</th>
                      <th className="text-left px-3 py-3">Location</th>
                      <th className="text-left px-3 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 font-medium">{row.company}</td>
                        <td className="px-3 py-3 text-muted-foreground">{row.title}</td>
                        <td className="px-3 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider",
                            STAGE_STYLE[row.stage] || STAGE_STYLE.APPLIED
                          )}>
                            {row.stage}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[11px] font-mono text-muted-foreground">{row.applied_on}</td>
                        <td className="px-3 py-3 text-[11px] font-mono text-muted-foreground">{row.platform}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{row.location}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
