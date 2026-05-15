"use client";

import { useState } from "react";
import { Job } from "@/lib/types";

const PLATFORM_COLORS: Record<string, string> = {
  indeed: "bg-blue-100 text-blue-700",
  "indeed-live": "bg-blue-200 text-blue-800",
  linkedin: "bg-sky-100 text-sky-700",
  simplyhired: "bg-orange-100 text-orange-700",
  glassdoor: "bg-green-100 text-green-700",
};

const JOB_TYPES = ["All Types", "Full-time", "Part-time", "Contract", "Internship"];
const EXPERIENCE_LEVELS = ["All Levels", "Entry", "Mid", "Senior", "Lead/Staff"];
const WORK_MODES = ["All", "Remote", "Hybrid", "On-site"];

interface Filters {
  search: string;
  location: string;
  jobType: string;
  experience: string;
  workMode: string;
  salaryMin: string;
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
    jobType: "All Types",
    experience: "All Levels",
    workMode: "All",
    salaryMin: "",
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
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
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
    if (job.url) {
      window.open(job.url, "_blank");
    }
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
    } catch {
      // silently fail
    }
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

  const filtered = jobs.filter((j) => {
    if (filters.search && !j.title.toLowerCase().includes(filters.search.toLowerCase()) && !j.company.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.location && !j.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (!matchesExperience(j.title, filters.experience)) return false;
    if (!matchesWorkMode(j.location, filters.workMode)) return false;
    if (filters.salaryMin && parseInt(j.salary_max) > 0 && parseInt(j.salary_max) < parseInt(filters.salaryMin) * 1000) return false;
    if (filters.platform !== "all" && j.platform !== filters.platform) return false;
    return true;
  });

  const platforms = [...new Set(jobs.map((j) => j.platform))];

  return (
    <div className="space-y-4">
      {/* Scrape panel */}
      <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">
            Scrape Live Jobs
          </h3>
          <div className="flex gap-2">
            {[
              { id: "indeed", label: "Indeed", active: "bg-blue-500 text-white" },
              { id: "linkedin", label: "LinkedIn", active: "bg-sky-500 text-white" },
              { id: "simplyhired", label: "SimplyHired", active: "bg-orange-500 text-white" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  scrapeSources.includes(s.id)
                    ? s.active
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Job title or keywords..."
            value={scrapeQuery}
            onChange={(e) => setScrapeQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            type="text"
            placeholder="Location..."
            value={scrapeLocation}
            onChange={(e) => setScrapeLocation(e.target.value)}
            className="w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={handleScrape}
            disabled={scraping || scrapeSources.length === 0}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all whitespace-nowrap"
          >
            {scraping ? "Scraping..." : `Search ${scrapeSources.length} source${scrapeSources.length !== 1 ? "s" : ""}`}
          </button>
        </div>
        {scrapeResult && (
          <div className="mt-2 text-sm text-indigo-600 font-medium">
            {scrapeResult}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <input
            type="text"
            placeholder="Job title or company"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            type="text"
            placeholder="Location"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select
            value={filters.experience}
            onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {EXPERIENCE_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={filters.workMode}
            onChange={(e) => setFilters({ ...filters, workMode: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="all">All Sources</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg justify-center">
            <span className="text-sm font-bold text-indigo-700">
              {filtered.length}
            </span>
            <span className="text-xs text-indigo-500">jobs</span>
          </div>
        </div>
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {filtered.map((job) => {
          const isApplied = appliedJobs.has(job.job_id);
          const isApplying = applyingJob === job.job_id;
          return (
            <div
              key={job.job_id}
              className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
                isApplied ? "border-green-200 bg-green-50/30" : "border-gray-100"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-gray-400">
                  {job.company?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {job.title}
                      </h3>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {job.company}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          PLATFORM_COLORS[job.platform] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {job.platform}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {job.location}
                      </span>
                    )}
                    {parseInt(job.salary_min) > 0 && (
                      <span className="font-medium text-gray-700">
                        ${parseInt(job.salary_min).toLocaleString()} - ${parseInt(job.salary_max).toLocaleString()}
                      </span>
                    )}
                    <span>
                      Posted {new Date(job.posted_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isApplied ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Applied
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApply(job)}
                      disabled={isApplying}
                      className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                    >
                      {isApplying ? "Applying..." : "Apply"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No jobs match your filters</p>
            <p className="text-sm mt-1">Try adjusting your search or scrape new jobs</p>
          </div>
        )}
      </div>
    </div>
  );
}
