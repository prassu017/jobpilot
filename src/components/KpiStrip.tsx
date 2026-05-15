"use client";

type Kpi = {
  label: string;
  value: string;
  meta?: React.ReactNode;
  bar?: number;
};

export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in">
      {items.map((k) => (
        <div
          key={k.label}
          className="p-4 bg-card border border-border rounded-lg space-y-2 hover:border-primary/30 transition-colors"
        >
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {k.label}
          </p>
          <p className="text-3xl font-extrabold tracking-tighter">{k.value}</p>
          {k.bar !== undefined ? (
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${k.bar}%` }}
              />
            </div>
          ) : (
            <div className="text-[10px] font-mono text-muted-foreground">
              {k.meta}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
