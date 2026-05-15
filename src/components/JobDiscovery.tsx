"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

function extractKeywords(text: string): string[] {
  const stop = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall",
    "can", "need", "must", "not", "no", "so", "if", "then", "than", "that", "this",
    "it", "its", "as", "we", "our", "you", "your", "they", "their", "he", "she", "i",
    "my", "me", "am", "all", "each", "every", "both", "few", "more", "most", "other",
    "some", "such", "up", "out", "about", "into", "over", "after", "also", "just",
    "new", "one", "two", "three", "work", "experience", "year", "years", "able",
    "well", "including", "using", "used", "across", "etc", "per", "via",
  ]);
  const words = text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 80).map(([w]) => w);
}

function computeRelevance(job: Job, userKeywords: string[]): number {
  if (userKeywords.length === 0) return 0;
  const jobText = `${job.title} ${job.company} ${job.description || ""} ${job.location} ${job.job_type}`.toLowerCase();
  let matches = 0;
  for (const kw of userKeywords) {
    if (jobText.includes(kw)) matches++;
  }
  const raw = (matches / Math.min(userKeywords.length, 20)) * 100;
  return Math.min(99, Math.round(raw));
}

function relevanceColor(score: number): string {
  if (score >= 75) return "bg-primary/15 text-primary border-primary/30";
  if (score >= 50) return "bg-blue-400/10 text-blue-300 border-blue-400/20";
  if (score >= 25) return "bg-amber-400/10 text-amber-300 border-amber-400/20";
  return "bg-white/5 text-muted-foreground border-white/10";
}

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
  const [cachedJobs, setCachedJobs] = useState<Job[] | null>(null);
  const [liveJobs, setLiveJobs] = useState<Job[] | null>(null);
  const [loadingCached, setLoadingCached] = useState(false);
  const [experience, setExperience] = useState("All Levels");
  const [workMode, setWorkMode] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [trackedJobs, setTrackedJobs] = useState<Set<string>>(new Set());
  const [trackingJob, setTrackingJob] = useState<string | null>(null);
  const [userKeywords, setUserKeywords] = useState<string[]>([]);

  useEffect(() => {
    const resumeText = localStorage.getItem("dubsy_resume_text");
    if (resumeText) {
      setUserKeywords(extractKeywords(resumeText));
      return;
    }
    fetch("/api/tracker")
      .then((r) => r.json())
      .then((data) => {
        if (data.rows?.length > 0) {
          const text = data.rows.map((r: any) => `${r.title} ${r.company} ${r.notes || ""}`).join(" ");
          setUserKeywords(extractKeywords(text));
        }
      })
      .catch(() => {});
  }, []);

  function toggleSource(source: string) {
    setScrapeSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }

  const handleSearch = useCallback(async () => {
    setCachedJobs(null);
    setLiveJobs(null);
    setScrapeResult(null);
    setLoadingCached(true);

    // Phase 1: instant results from DB cache
    try {
      const cacheRes = await fetch(
        `/api/search-jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`
      );
      const cacheData = await cacheRes.json();
      if (cacheData.jobs?.length > 0) {
        setCachedJobs(cacheData.jobs);
        setScrapeResult(`${cacheData.jobs.length} cached results`);
      }
    } catch {}
    setLoadingCached(false);

    // Phase 2: live scrape in parallel
    if (scrapeSources.length > 0) {
      setScraping(true);
      try {
        const res = await fetch("/api/scrape-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, location, sources: scrapeSources }),
        });
        const data = await res.json();
        if (data.success && data.jobs?.length > 0) {
          const live: Job[] = data.jobs.map((j: any, i: number) => ({
            job_id: `live-${Date.now()}-${i}`,
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
          }));
          setLiveJobs(live);
          const parts = Object.entries(data.sourceResults as Record<string, number>)
            .map(([s, n]) => `${s}: ${n}`)
            .join(", ");
          setScrapeResult(`${data.total_scraped} live results (${parts})`);
          onRefresh();
        } else if (data.error) {
          setScrapeResult((prev) => prev ? `${prev} | Scrape: ${data.error}` : `Error: ${data.error}`);
        }
      } catch {
        setScrapeResult((prev) => prev ? `${prev} | Scrape failed` : "Scrape failed");
      }
      setScraping(false);
    }
  }, [query, location, scrapeSources, onRefresh]);

  async function handleTrack(job: Job) {
    setTrackingJob(job.job_id);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.job_id, status: "SAVED" }),
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

  // Merge cached + live results, dedup by title|company|platform
  const merged = useMemo(() => {
    const hasSearchResults = cachedJobs !== null || liveJobs !== null;
    if (!hasSearchResults) return null;

    const all: Job[] = [];
    if (liveJobs) all.push(...liveJobs);
    if (cachedJobs) all.push(...cachedJobs);

    const seen = new Set<string>();
    return all.filter((j) => {
      const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}|${j.platform}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [cachedJobs, liveJobs]);

  const filtered = useMemo(() => {
    const source = merged || jobs;
    const seen = new Set<string>();
    const result = source.filter((j) => {
      const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}|${j.platform}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (!merged) {
        if (query && !j.title.toLowerCase().includes(query.toLowerCase()) && !j.company.toLowerCase().includes(query.toLowerCase())) return false;
        if (location && !j.location.toLowerCase().includes(location.toLowerCase())) return false;
      }
      if (!matchesExperience(j.title, experience)) return false;
      if (!matchesWorkMode(j.location, workMode)) return false;
      if (platformFilter !== "all" && j.platform !== platformFilter) return false;
      return true;
    });
    if (userKeywords.length > 0) {
      result.sort((a, b) => computeRelevance(b, userKeywords) - computeRelevance(a, userKeywords));
    }
    return result;
  }, [jobs, merged, query, location, experience, workMode, platformFilter, userKeywords]);

  const platforms = [...new Set(jobs.map((j) => j.platform))];

  function formatSalary(job: Job) {
    const min = parseInt(job.salary_min);
    const max = parseInt(job.salary_max);
    if (max > 0) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
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
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="City, state..."
              className="w-full pl-14 pr-4 h-11 bg-background border border-border rounded-lg text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={scraping || loadingCached}
            className="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-mono uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loadingCached ? "Loading..." : scraping ? "Scraping live..." : "Search"}
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
              {scraping && <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />}
              {scrapeResult}
            </span>
          )}
          {merged && (
            <button
              onClick={() => { setCachedJobs(null); setLiveJobs(null); setScrapeResult(null); }}
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Show all jobs
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((job) => {
          const isTracked = trackedJobs.has(job.job_id);
          const isTracking = trackingJob === job.job_id;
          const salary = formatSalary(job);
          const isLive = job.job_id.startsWith("live-");
          const relevance = userKeywords.length > 0 ? computeRelevance(job, userKeywords) : 0;
          return (
            <article
              key={job.job_id}
              className={cn(
                "p-5 bg-card border rounded-lg hover:border-primary/40 transition-all space-y-4",
                isTracked ? "border-primary/30 ring-1 ring-primary/10" : "border-border",
                isLive && "animate-in"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm tracking-tight">{job.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {job.company} - {job.location}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {relevance > 0 && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold tracking-wider",
                        relevanceColor(relevance)
                      )}
                      title="Match based on your resume/profile"
                    >
                      {relevance}%
                    </span>
                  )}
                  {isLive && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                      Live
                    </span>
                  )}
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider",
                      PLATFORM_BADGE[job.platform] || "bg-white/5 text-muted-foreground border-white/5"
                    )}
                  >
                    {job.platform}
                  </span>
                </div>
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
                      View
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
        {filtered.length === 0 && !loadingCached && !scraping && (
          <div className="col-span-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              No matches - try a different search or adjust filters
            </span>
          </div>
        )}
        {(loadingCached || scraping) && filtered.length === 0 && (
          <div className="col-span-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
            <span className="text-xs font-mono text-primary uppercase tracking-widest animate-pulse">
              {loadingCached ? "Loading cached results..." : "Scraping live results..."}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
