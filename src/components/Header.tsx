"use client";

import { cn } from "@/lib/utils";

export type Tab = "jobs" | "pipeline" | "husky" | "analytics" | "emails" | "about" | "deck";

const TABS: { id: Tab; label: string }[] = [
  { id: "jobs", label: "Jobs" },
  { id: "pipeline", label: "Pipeline" },
  { id: "husky", label: "Husky" },
  { id: "analytics", label: "Analytics" },
  { id: "emails", label: "Email Feed" },
  { id: "about", label: "About" },
  { id: "deck", label: "Deck" },
];

export function Header({
  tab,
  onTabChange,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-black tracking-tighter text-sm">
              JP
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tighter leading-none">
                JOBPILOT
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                AI Application Engine
              </span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-md border border-white/5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded transition-colors",
                  tab === t.id
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full size-1.5 bg-primary" />
            </span>
            <span className="text-[11px] font-mono font-medium text-primary uppercase tracking-wider">
              Email Agent Active
            </span>
          </div>
          <div className="hidden lg:block text-[10px] font-mono text-muted-foreground">
            DEPLOYED:{" "}
            <span className="text-foreground">LOVABLE + DATABRICKS</span>
          </div>
        </div>
      </div>
      <div className="md:hidden border-t border-border">
        <nav className="max-w-[1440px] mx-auto px-3 py-2 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors",
                tab === t.id
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
