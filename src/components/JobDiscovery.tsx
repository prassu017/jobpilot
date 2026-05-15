"use client";

import { useMemo, useState } from "react";
import { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLATFORM_BADGE: Record<string, string> = {
  indeed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "indeed-live": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  linkedin: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  simplyhired: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  glassdoor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const EXPERIENCE_LEVELS = ["All Levels", "Entry", "Mid", "Senior", "Lead/Staff"];
const WORK_MODES = ["All", "Remote", "Hybrid", "On-site"];

interface Filters {
  search: string;
  location: string;
  experience: string;
  workMode: string;
  platform: string;
}

export default function JobDiscovery({
  jobs,
  onRefresh,
}: {
  jobs: Job[];
  onRefresh: () => void;
}) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    location: "",
    experience: "All Levels",
    workMode: "All",
    platform: "all",
  });
  const [scrapeQuery, setScrapeQuery] = useState("software engineer");
  const [scrapeLocation, setScrapeLocation] = useState("Seattle, WA");
  const [scrapeSources, setScrapeSources] = useState<string[]>(["indeed", "linkedin"]);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [applyingJob, setApplyingJob] = useState<string | null>(null);

  function toggleSource(source: string) {
    setScrapeSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }

  async function handleScrape() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch("/api/scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: scrapeQuery,
          location: scrapeLocation,
          sources: scrapeSources,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const parts = Object.entries(data.sourceResults as Record<string, number>)
          .map(([s, n]) => `${s}: ${n}`)
          .join(", ");
        setScrapeResult(`Found ${data.total_scraped} jobs (${parts})`);
        onRefresh();
      } else {
        setScrapeResult(`Error: ${data.error}`);
      }
    } catch {
      setScrapeResult("Failed to scrape");
    }
    setScraping(false);
  }

  async function handleApply(job: Job) {
    setApplyingJob(job.job_id);
    if (job.url) window.open(job.url, "_blank");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.job_id }),
      });
      const data = await res.json();
      if (data.success) {
        setAppliedJobs((prev) => new Set([...prev, job.job_id]));
        onRefresh();
      }
    } catch {}
    setApplyingJob(null);
  }

  function matchesExperience(title: string, level: string): boolean {
    if (level === "All Levels") return true;
    const t = title.toLowerCase();
    if (level === "Entry") return /junior|entry|new grad|early career|associate|intern/i.test(t);
    if (level === "Mid") return /mid|ii\b|2\b|engineer\b/i.test(t) && !/senior|lead|staff|principal/i.test(t);
    if (level === "Senior") return /senior|iii\b|3\b|sr\b/i.test(t);
    if (level === "Lead/Staff") return /lead|staff|principal|director|manager|head|vp/i.test(t);
    return true;
  }

  function matchesWorkMode(location: string, mode: string): boolean {
    if (mode === "All") return true;
    const l = location.toLowerCase();
    if (mode === "Remote") return l.includes("remote");
    if (mode === "Hybrid") return l.includes("hybrid");
    if (mode === "On-site") return !l.includes("remote") && !l.includes("hybrid");
    return true;
  }

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (filters.search && !j.title.toLowerCase().includes(filters.search.toLowerCase()) && !j.company.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.location && !j.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (!matchesExperience(j.title, filters.experience)) return false;
      if (!matchesWorkMode(j.location, filters.workMode)) return false;
      if (filters.platform !== "all" && j.platform !== filters.platform) return false;
      return true;
    });
  }, [jobs, filters]);

  const platforms = [...new Set(jobs.map((j) => j.platform))];

  function formatSalary(job: Job) {
    const min = parseInt(job.salary_min);
    const max = parseInt(job.salary_max);
    if (max > 0) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
    return null;
  }

  function daysAgo(dateStr: string) {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    return `${days}d ago`;
  }

  return (
    <section className="space-y-6 animate-in">
      {/* Scrape panel */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight uppercase">
            Scrape Live Jobs
          </h3>
          <div className="flex gap-2">
            {[
              { id: "indeed", label: "Indeed", active: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
              { id: "linkedin", label: "LinkedIn", active: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
              { id: "simplyhired", label: "SimplyHired", active: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className={cn(
                  "text-[10px] font-mono px-3 py-1 rounded-full border uppercase tracking-wider transition-all",
                  scrapeSources.includes(s.id)
                    ? s.active
                    : "bg-white/5 text-muted-foreground border-white/5 hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Query
            </span>
            <input
              type="text"
              value={scrapeQuery}
              onChange={(e) => setScrapeQuery(e.target.value)}
              placeholder="Job title or keywords..."
              className="w-full pl-20 pr-4 h-11 bg-card border border-border rounded-lg text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="relative w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Loc
            </span>
            <input
              type="text"
              value={scrapeLocation}
              onChange={(e) => setScrapeLocation(e.target.value)}
              placeholder="Location..."
              className="w-full pl-14 pr-4 h-11 bg-card border border-border rounded-lg text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={handleScrape}
            disabled={scraping || scrapeSources.length === 0}
            className="h-11 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-mono uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {scraping ? "Scraping..." : `Search ${scrapeSources.length} source${scrapeSources.length !== 1 ? "s" : ""}`}
          </button>
        </div>
        {scrapeResult && (
          <div className="text-[11px] font-mono text-primary uppercase tracking-wider">
            {scrapeResult}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search roles, companies..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1 min-w-[200px] h-9 px-3 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        />
        <input
          type="text"
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className="w-36 h-9 px-3 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        />
        <select
          value={filters.experience}
          onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
          className="h-9 px-3 bg-card border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-primary/50"
        >
          {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          value={filters.workMode}
          onChange={(e) => setFilters({ ...filters, workMode: e.target.value })}
          className="h-9 px-3 bg-card border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-primary/50"
        >
          {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filters.platform}
          onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
          className="h-9 px-3 bg-card border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-primary/50"
        >
          <option value="all">All Sources</option>
          {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
          {filtered.length} jobs
        </span>
      </div>

      {/* Job grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((job) => {
          const isApplied = appliedJobs.has(job.job_id);
          const isApplying = applyingJob === job.job_id;
          const salary = formatSalary(job);
          return (
            <article
              key={job.job_id}
              className={cn(
                "p-5 bg-card border rounded-lg hover:border-primary/40 transition-all space-y-4",
                isApplied ? "border-primary/30 ring-1 ring-primary/10" : "border-border"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm tracking-tight">{job.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {job.company} · {job.location}
                  </p>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider shrink-0",
                    PLATFORM_BADGE[job.platform] || "bg-white/5 text-muted-foreground border-white/5"
                  )}
                >
                  {job.platform}
                </span>
              </div>

              {job.description && (
                <div className="flex flex-wrap gap-1.5">
                  {job.description
                    .split(",")
                    .slice(0, 4)
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 text-muted-foreground border border-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              )}

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-foreground/80">
                  {salary || "Salary N/A"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {daysAgo(job.posted_date)}
                  </span>
                  {isApplied ? (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
                      Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(job)}
                      disabled={isApplying}
                      className="text-[10px] font-mono uppercase tracking-widest text-primary hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {isApplying ? "Applying..." : "Apply →"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              No matches — try adjusting filters or scrape new jobs
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
