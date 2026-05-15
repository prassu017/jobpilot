"use client";

import { useState, useEffect } from "react";
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

const STAGE_STYLE: Record<string, string> = {
  APPLIED: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  SCREENING: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  INTERVIEW: "bg-purple-400/10 text-purple-300 border-purple-400/20",
  OFFER: "bg-primary/15 text-primary border-primary/30",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  SAVED: "bg-white/5 text-muted-foreground border-white/10",
};

export default function HuskyAgent({ onDataUpdate }: { onDataUpdate: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);

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
    } catch (e) {
      setScanResult("Failed to run Husky");
    }
    setScanning(false);
  }

  const rows = tracker?.rows || [];
  const analytics = tracker?.analytics;

  return (
    <section className="space-y-6 animate-in">
      {/* Husky Agent Header */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
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
                AI-powered email scanner + application tracker
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!gmailConnected ? (
              <a
                href="/api/auth/google"
                className="px-4 py-2 rounded-lg border border-primary/30 text-xs font-mono uppercase tracking-widest text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connect Gmail First
              </a>
            ) : (
              <button
                onClick={runHusky}
                disabled={scanning}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-mono uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {scanning ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                    Dubsy is scanning...
                  </span>
                ) : (
                  "Run Dubsy Scan"
                )}
              </button>
            )}
          </div>
        </div>
        {scanResult && (
          <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-mono text-primary">{scanResult}</p>
          </div>
        )}
      </div>

      {/* Quick Stats from CSV */}
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
                {gmailConnected ? "Click 'Run Dubsy Scan' to scan your Gmail" : "Connect Gmail to get started"}
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
    </section>
  );
}
