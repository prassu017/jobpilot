"use client";

const TEAM = [
  { name: "Prasanna", role: "Full-Stack Engineer", focus: "Backend, Databricks, API integration" },
  { name: "Divya Varshini Moturi", role: "Data Engineer", focus: "Data pipelines, Databricks, analytics" },
  { name: "Huy Nguyen", role: "Data Analyst", focus: "Data analysis, insights, reporting" },
];

const TOOLS = [
  { name: "Databricks", desc: "SQL warehouse for all job, application, email, and analytics data" },
  { name: "Claude AI", desc: "Email classification agent with confidence scoring and pipeline automation" },
  { name: "ScraperAPI", desc: "Real-time job scraping from Indeed, LinkedIn, and SimplyHired" },
  { name: "Next.js", desc: "Full-stack React framework with API routes, deployed on Vercel" },
  { name: "Lovable", desc: "AI-generated UI design — dark command-deck theme" },
  { name: "Vercel", desc: "Zero-config deployment with GitHub integration" },
];

export default function AboutPanel() {
  return (
    <div className="space-y-8 animate-in max-w-4xl mx-auto">
      <div className="bg-card border border-border rounded-lg p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-lg tracking-tighter">
            JP
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">JobPilot</h2>
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest">
              AI Application Engine
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          One dashboard to discover, track, and analyze your entire job search.
          Powered by real-time scraping from multiple job platforms, an intelligent
          email agent that monitors your inbox for updates, and Databricks-backed
          analytics that show you exactly how your search is performing.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-bold tracking-tight uppercase mb-4">
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Search", desc: "Query Indeed, LinkedIn & SimplyHired in real-time from one search bar" },
            { step: "02", title: "Track", desc: "One-click + Track adds any job to your Kanban pipeline" },
            { step: "03", title: "Monitor", desc: "Email agent scans your inbox and auto-classifies responses" },
            { step: "04", title: "Analyze", desc: "Auto-generated funnel, conversion rates, and platform insights" },
          ].map((s) => (
            <div key={s.step} className="space-y-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                Step {s.step}
              </span>
              <h4 className="font-bold text-sm">{s.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-bold tracking-tight uppercase mb-4">
          Built With
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TOOLS.map((t) => (
            <div
              key={t.name}
              className="p-4 bg-background border border-border rounded-lg hover:border-primary/30 transition-colors"
            >
              <h4 className="font-bold text-sm mb-1">{t.name}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-bold tracking-tight uppercase mb-4">
          Architecture
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "Scraping", name: "ScraperAPI" },
            null,
            { label: "Backend", name: "Databricks SQL", highlight: true },
            null,
            { label: "API Layer", name: "Next.js" },
            null,
            { label: "Frontend", name: "Lovable UI" },
          ].map((item, i) =>
            item === null ? (
              <span key={i} className="text-primary font-bold text-lg">&rarr;</span>
            ) : (
              <div
                key={i}
                className={`px-5 py-3 bg-background border rounded-lg text-center ${
                  item.highlight
                    ? "border-primary/40 shadow-[0_0_16px_rgba(34,197,94,0.15)]"
                    : "border-border"
                }`}
              >
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                  {item.label}
                </div>
                <div className="font-bold text-sm">{item.name}</div>
              </div>
            )
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          {[
            { label: "Email Agent", name: "Claude AI" },
            null,
            { label: "Classify", name: "NLP Pipeline" },
            null,
            { label: "Storage", name: "Databricks SQL", highlight: true },
            null,
            { label: "Auto-Gen", name: "Analytics" },
          ].map((item, i) =>
            item === null ? (
              <span key={`b${i}`} className="text-primary font-bold text-lg">&rarr;</span>
            ) : (
              <div
                key={`b${i}`}
                className={`px-5 py-3 bg-background border rounded-lg text-center ${
                  item.highlight
                    ? "border-primary/40 shadow-[0_0_16px_rgba(34,197,94,0.15)]"
                    : "border-border"
                }`}
              >
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                  {item.label}
                </div>
                <div className="font-bold text-sm">{item.name}</div>
              </div>
            )
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-bold tracking-tight uppercase mb-4">
          Team
        </h3>
        <div className="flex gap-4">
          {TEAM.map((m) => (
            <div key={m.name} className="p-4 bg-background border border-border rounded-lg">
              <h4 className="font-bold text-sm">{m.name}</h4>
              <p className="text-[10px] font-mono text-primary uppercase tracking-widest mt-0.5">{m.role}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.focus}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          AI-Spark Hackathon 2026
        </span>
      </div>
    </div>
  );
}
