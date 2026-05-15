"use client";

import { useEffect, useState } from "react";
import { Job } from "@/lib/types";

function platformBadge(platform: string) {
  const colors: Record<string, string> = {
    indeed: "bg-blue-100 text-blue-700",
    linkedin: "bg-sky-100 text-sky-700",
    glassdoor: "bg-green-100 text-green-700",
  };
  return colors[platform] || "bg-gray-100 text-gray-700";
}

export default function JobDiscovery({ jobs }: { jobs: Job[] }) {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase());
    const matchesLocation =
      !locationFilter ||
      j.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const realJobs = filtered.filter((j) => j.url?.startsWith("https://to.indeed.com"));
  const seedJobs = filtered.filter((j) => !j.url?.startsWith("https://to.indeed.com"));

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by title or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          type="text"
          placeholder="Filter by location..."
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
          <span className="text-sm font-medium text-indigo-700">
            {filtered.length} jobs
          </span>
          {realJobs.length > 0 && (
            <span className="text-xs text-indigo-500">
              ({realJobs.length} from Indeed)
            </span>
          )}
        </div>
      </div>

      {realJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Live from Indeed
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realJobs.map((job) => (
              <JobCard key={job.job_id} job={job} isReal />
            ))}
          </div>
        </div>
      )}

      {seedJobs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            Tracked Jobs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seedJobs.map((job) => (
              <JobCard key={job.job_id} job={job} isReal={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, isReal }: { job: Job; isReal: boolean }) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
        isReal ? "border-blue-100" : "border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 leading-tight">
            {job.title}
          </div>
          <div className="text-sm text-gray-600 mt-1">{job.company}</div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${platformBadge(
            job.platform
          )}`}
        >
          {job.platform}
        </span>
      </div>
      <div className="text-xs text-gray-500 mt-2">{job.location}</div>
      {job.salary_min && parseInt(job.salary_min) > 0 && (
        <div className="text-xs font-medium text-gray-700 mt-1">
          ${parseInt(job.salary_min).toLocaleString()} -{" "}
          ${parseInt(job.salary_max).toLocaleString()}
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">
          Posted {new Date(job.posted_date).toLocaleDateString()}
        </span>
        {isReal && job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
          >
            Apply
          </a>
        )}
      </div>
    </div>
  );
}
