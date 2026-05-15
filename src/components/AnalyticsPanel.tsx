"use client";

import { Analytics } from "@/lib/types";

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold tracking-tight uppercase">{title}</h3>
        {meta && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPanel({
  analytics,
}: {
  analytics: Analytics;
}) {
  const funnel = [
    { label: "Applications Sent", value: analytics.total_applications, pct: 100 },
    {
      label: "Responses Received",
      value: Math.round(analytics.total_applications * analytics.response_rate / 100),
      pct: analytics.response_rate,
    },
    {
      label: "Interviews Secured",
      value: Math.round(analytics.total_applications * analytics.interview_rate / 100),
      pct: analytics.interview_rate,
    },
    {
      label: "Offers Received",
      value: Math.round(analytics.total_applications * analytics.offer_rate / 100),
      pct: analytics.offer_rate,
    },
  ];

  const statusEntries = Object.entries(analytics.status_breakdown);
  const maxStatus = Math.max(...statusEntries.map(([, v]) => v), 1);

  const platformEntries = Object.entries(analytics.platform_breakdown);
  const maxPlatform = Math.max(...platformEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-6 animate-in">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Application Funnel" meta="Conversion rates">
          <div className="space-y-4">
            {funnel.map((f, i) => (
              <div key={f.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono uppercase text-muted-foreground">
                  <span>{f.label}</span>
                  <span className="text-foreground/80">{f.value}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${f.pct}%`,
                      opacity: 1 - i * 0.15,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Pipeline Breakdown" meta="By status">
          <div className="flex-1 flex items-end gap-2 h-40">
            {statusEntries.map(([status, count]) => {
              const h = (count / maxStatus) * 100;
              const isPeak = count === maxStatus;
              return (
                <div
                  key={status}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div
                    className={
                      isPeak
                        ? "w-full bg-primary rounded-t shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
                        : "w-full bg-white/10 group-hover:bg-primary/60 rounded-t transition-all"
                    }
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-tighter">
                    {status.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <Panel title="By Platform" meta="Application distribution">
        <div className="divide-y divide-border">
          {platformEntries.map(([platform, count], i) => (
            <div
              key={platform}
              className="grid grid-cols-12 items-center gap-4 py-3 text-sm"
            >
              <span className="col-span-1 text-[10px] font-mono text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="col-span-3 font-medium capitalize">{platform}</span>
              <span className="col-span-2 text-[11px] font-mono text-muted-foreground">
                {count} apps
              </span>
              <div className="col-span-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(count / maxPlatform) * 100}%` }}
                />
              </div>
              <span className="col-span-2 text-right text-[11px] font-mono text-foreground/80">
                {((count / analytics.total_applications) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
