"use client";

import { useMemo, useState } from "react";
import { ApplicationWithJob } from "@/lib/types";
import { cn } from "@/lib/utils";

type Stage = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED";

const COLUMNS: { id: Stage; label: string }[] = [
  { id: "APPLIED", label: "Applied" },
  { id: "SCREENING", label: "Screening" },
  { id: "INTERVIEW", label: "Interviewing" },
  { id: "OFFER", label: "Offer" },
  { id: "REJECTED", label: "Archived" },
];

export default function KanbanBoard({
  applications,
}: {
  applications: ApplicationWithJob[];
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<Stage, ApplicationWithJob[]> = {
      APPLIED: [],
      SCREENING: [],
      INTERVIEW: [],
      OFFER: [],
      REJECTED: [],
    };
    for (const a of applications) {
      const stage = a.status as Stage;
      if (g[stage]) g[stage].push(a);
    }
    return g;
  }, [applications]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-in">
      {COLUMNS.map((col) => {
        const items = grouped[col.id];
        const isOffer = col.id === "OFFER";
        const isRejected = col.id === "REJECTED";
        const isInterview = col.id === "INTERVIEW";
        return (
          <div
            key={col.id}
            className={cn(
              "space-y-4 transition-opacity",
              isRejected && "opacity-60 hover:opacity-100"
            )}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight uppercase">
                  {col.label}
                </h3>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded",
                    isInterview
                      ? "bg-primary/20 text-primary"
                      : "bg-white/5 text-muted-foreground"
                  )}
                >
                  {items.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 min-h-32">
              {items.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    Empty
                  </span>
                </div>
              ) : (
                items.map((a) => {
                  const salaryMin = parseInt(a.salary_min);
                  const salaryMax = parseInt(a.salary_max);
                  const salary =
                    salaryMax > 0
                      ? `$${salaryMin.toLocaleString()} – $${salaryMax.toLocaleString()}`
                      : "";
                  return (
                    <article
                      key={a.application_id}
                      draggable
                      onDragStart={() => setDragId(a.application_id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "p-4 bg-card border rounded-lg transition-all cursor-grab active:cursor-grabbing",
                        isInterview
                          ? "border-primary/30 ring-1 ring-primary/10"
                          : isOffer
                            ? "border-primary/40 shadow-[0_0_24px_-12px_hsl(142_76%_45%/0.6)]"
                            : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={cn(
                            "text-[10px] font-mono",
                            isInterview ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {a.platform}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(a.applied_date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm tracking-tight">
                        {a.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {a.company} · {a.location}
                      </p>
                      {salary && (
                        <div className="mt-4 pt-3 border-t border-white/5">
                          <span className="text-xs font-mono font-medium text-foreground/80">
                            {salary}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
