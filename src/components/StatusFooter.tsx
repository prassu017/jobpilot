"use client";

import { useState } from "react";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[8px] font-mono text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-[10px] font-mono">{value}</span>
    </div>
  );
}

export function StatusFooter({ onSync }: { onSync: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/simulate-email", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLastResult(
          `${data.email.company} → ${data.email.classification}`
        );
        onSync();
      }
    } catch {
      setLastResult("Sync failed");
    }
    setSyncing(false);
  }

  return (
    <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background/95 border border-primary/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] px-6 py-3 rounded-full flex items-center gap-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest">
            {lastResult || "System Nominal"}
          </span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="hidden sm:flex items-center gap-5">
          <Stat label="Cloud Uptime" value="99.98%" />
          <Stat label="Parsed/sec" value="1.2k" />
        </div>
        <div className="hidden sm:block h-4 w-px bg-white/10" />
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-[10px] font-mono uppercase tracking-widest text-primary hover:text-foreground transition-colors disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Force Sync_"}
        </button>
      </div>
    </footer>
  );
}
