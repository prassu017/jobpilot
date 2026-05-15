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

export default function JobDiscovery({
  jobs,
  onRefresh,
}: {
  jobs: Job[];
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("software engineer");
  const [location, setLocation] = useState("Seattle, WA");
  const [scrapeSources, setScrapeSources] = useState<string[]>(["indeed", "linkedin"]);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [freshJobs, setFreshJobs] = useState<Job[] | null>(null);
  const [experience, setExperience] = useState("All Levels");
  const [workMode, setWorkMode] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [trackedJobs, setTrackedJobs] = useState<Set<string>>(new Set());
  const [trackingJob, setTrackingJob] = useState<string | null>(null);

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
          query,
          location,
          sources: scrapeSources,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const parts = Object.entries(data.sourceResults as Record<string, number>)
          .map(([s, n]) => `${s}: ${n}`)
          .join(", ");
        setScrapeResult(`Found ${data.total_scraped} new jobs (${parts})`);
        onRefresh();
        if (data.jobs && data.jobs.length > 0) {
          setFreshJobs(data.jobs.map((j: any, i: number) => ({
            job_id: `fresh-${Date.now()}-${i}`,
            title: j.title,
            company: j.company,
            location: j.location,
            platform: j.platform,
            url: j.url,
            salary_min: "0",
            salary_max: "0",
            job_type: "Full-time",
            posted_date: new Date().toISOString().split("T")[0],
            description: "",
          })));
        }
      } else {
        setScrapeResult(`Error: ${data.error}`);
        setFreshJobs(null);
      }
    } catch {
      setScrapeResult("Failed to scrape");
    }
    setScraping(false);
  }

  async function handleTrack(job: Job) {
    setTrackingJob(job.job_id);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.job_id }),
      });
      const data = await res.json();
      if (data.success) {
        setTrackedJobs((prev) => new Set([...prev, job.job_id]));
        onRefresh();
      }
    } catch {}
    setTrackingJob(null);
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

  function matchesWorkMode(loc: string, mode: string): boolean {
    if (mode === "All") return true;
    const l = loc.toLowerCase();
    if (mode === "Remote") return l.includes("remote");
    if (mode === "Hybrid") return l.includes("hybrid");
    if (mode === "On-site") return !l.includes("remote") && !l.includes("hybrid");
    return true;
  }

  const filtered = useMemo(() => {
    const source = freshJobs || jobs;
    return source.filter((j) => {
      if (!freshJobs) {
        if (query && !j.title.toLowerCase().includes(query.toLowerCase()) && !j.company.toLowerCase().includes(query.toLowerCase())) return false;
        if (location && !j.location.toLowerCase().includes(location.toLowerCase())) return false;
      }
      if (!matchesExperience(j.title, experience)) return false;
      if (!matchesWorkMode(j.location, workMode)) return false;
      if (platformFilter !== "all" && j.platform !== platformFilter) return false;
      return true;
    });
  }, [jobs, freshJobs, query, location, experience, workMode, platformFilter]);

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
      {/* Unified search panel */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight uppercase">
            Search Jobs
          </h3>
          <div className="flex items-center gap-3">
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
            <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
              {filtered.length} results
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Query
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              placeholder="Job title, company, or keywords..."
              className="w-full pl-20 pr-4 h-11 bg-background border border-border rounded-lg text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="relative w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Loc
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              placeholder="City, state..."
              className="w-full pl-14 pr-4 h-11 bg-background border border-border rounded-lg text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={handleScrape}
            disabled={scraping || scrapeSources.length === 0}
            className="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-mono uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {scraping ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="h-8 px-3 bg-background border border-border rounded text-[10px] font-mono uppercase focus:outline-none focus:border-primary/50"
          >
            {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="h-8 px-3 bg-background border border-border rounded text-[10px] font-mono uppercase focus:outline-none focus:border-primary/50"
          >
            {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="h-8 px-3 bg-background border border-border rounded text-[10px] font-mono uppercase focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Sources</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {scrapeResult && (
            <span className="text-[11px] font-mono text-primary uppercase tracking-wider ml-auto">
              {scrapeResult}
            </span>
          )}
          {freshJobs && (
            <button
              onClick={() => setFreshJobs(null)}
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Show all jobs →
            </button>
          )}
        </div>
      </div>

      {/* Job grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((job) => {
          const isTracked = trackedJobs.has(job.job_id);
          const isTracking = trackingJob === job.job_id;
          const salary = formatSalary(job);
          return (
            <article
              key={job.job_id}
              className={cn(
                "p-5 bg-card border rounded-lg hover:border-primary/40 transition-all space-y-4",
                isTracked ? "border-primary/30 ring-1 ring-primary/10" : "border-border"
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
                    "px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider shrink-0 ml-2",
                    PLATFORM_BADGE[job.platform] || "bg-white/5 text-muted-foreground border-white/5"
                  )}
                >
                  {job.platform}
                </span>
              </div>

              {job.job_type && job.job_type !== "Full-time" && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 text-muted-foreground border border-white/5">
                    {job.job_type}
                  </span>
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
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View →
                    </a>
                  )}
                  {isTracked ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-mono uppercase tracking-widest">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Tracked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleTrack(job)}
                      disabled={isTracking}
                      className="px-2.5 py-1 rounded-full border border-primary/30 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                    >
                      {isTracking ? "Adding..." : "+ Track"}
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
              No matches — try a different search or adjust filters
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
