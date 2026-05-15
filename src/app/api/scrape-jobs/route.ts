import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";
import { randomUUID } from "crypto";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  salary_min: number;
  salary_max: number;
  job_type: string;
  url: string;
  posted_date: string;
  description: string;
  platform: string;
}

function esc(s: string): string {
  return (s || "").replace(/'/g, "''");
}

async function fetchViaScraperApi(targetUrl: string): Promise<string> {
  const res = await fetch(
    `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`
  );
  return res.text();
}

function parseIndeedHtml(html: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().split("T")[0];

  const jobKeys: string[] = [];
  let m;
  const jkPattern = /data-jk="([^"]+)"/g;
  while ((m = jkPattern.exec(html)) !== null) jobKeys.push(m[1]);

  const titles: string[] = [];
  const titlePattern =
    /aria-label="full details of ([^"]+)"[^>]*class="[^"]*jcs-JobTitle/g;
  while ((m = titlePattern.exec(html)) !== null)
    titles.push(m[1].replace(/&amp;/g, "&"));

  const companies: string[] = [];
  const compPattern = /data-testid="company-name"[^>]*>([^<]+)/g;
  while ((m = compPattern.exec(html)) !== null) companies.push(m[1].trim());

  const locations: string[] = [];
  const locPattern = /data-testid="text-location"[^>]*>([^<]+)/g;
  while ((m = locPattern.exec(html)) !== null) locations.push(m[1].trim());

  const count = Math.min(titles.length, jobKeys.length || titles.length);
  for (let i = 0; i < count; i++) {
    const key = `${titles[i]}-${companies[i] || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push({
      title: titles[i],
      company: companies[i] || "",
      location: locations[i] || "",
      salary_min: 0,
      salary_max: 0,
      job_type: "Full-time",
      url: jobKeys[i]
        ? `https://www.indeed.com/viewjob?jk=${jobKeys[i]}`
        : "",
      posted_date: today,
      description: "",
      platform: "indeed",
    });
  }
  return jobs;
}

function parseLinkedInHtml(html: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().split("T")[0];

  let m;
  const titles: string[] = [];
  const titlePat = /class="base-search-card__title"[^>]*>([^<]+)/g;
  while ((m = titlePat.exec(html)) !== null) titles.push(m[1].trim());

  const companies: string[] = [];
  const compPat = /class="hidden-nested-link"[^>]*>\s*([^<]+)/g;
  while ((m = compPat.exec(html)) !== null) companies.push(m[1].trim());

  const locations: string[] = [];
  const locPat = /class="job-search-card__location"[^>]*>([^<]+)/g;
  while ((m = locPat.exec(html)) !== null) locations.push(m[1].trim());

  const urls: string[] = [];
  const urlPat = /href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"?&]+)/g;
  while ((m = urlPat.exec(html)) !== null) urls.push(m[1]);

  for (let i = 0; i < titles.length; i++) {
    const key = `${titles[i]}-${companies[i] || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push({
      title: titles[i],
      company: companies[i] || "",
      location: locations[i] || "",
      salary_min: 0,
      salary_max: 0,
      job_type: "Full-time",
      url: urls[i] || "",
      posted_date: today,
      description: "",
      platform: "linkedin",
    });
  }
  return jobs;
}

function parseSimplyHiredHtml(html: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().split("T")[0];

  let m;
  const titlePat =
    /data-testid="searchSerpJob"[\s\S]*?<h2[^>]*>(?:<a[^>]*>)?([^<]+)/g;
  while ((m = titlePat.exec(html)) !== null) {
    const title = m[1].trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    jobs.push({
      title,
      company: "",
      location: "",
      salary_min: 0,
      salary_max: 0,
      job_type: "Full-time",
      url: "",
      posted_date: today,
      description: "",
      platform: "simplyhired",
    });
  }
  return jobs;
}

async function scrapeIndeed(
  query: string,
  location: string
): Promise<ScrapedJob[]> {
  const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&fromage=14`;
  const html = await fetchViaScraperApi(url);
  return html.length > 500 ? parseIndeedHtml(html) : [];
}

async function scrapeLinkedIn(
  query: string,
  location: string
): Promise<ScrapedJob[]> {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&start=0`;
  const res = await fetch(url);
  const html = await res.text();
  return html.length > 500 ? parseLinkedInHtml(html) : [];
}

async function scrapeSimplyHired(
  query: string,
  location: string
): Promise<ScrapedJob[]> {
  const url = `https://www.simplyhired.com/search?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
  const html = await fetchViaScraperApi(url);
  return html.length > 500 ? parseSimplyHiredHtml(html) : [];
}

export async function POST(req: NextRequest) {
  if (!SCRAPER_API_KEY) {
    return NextResponse.json(
      { error: "SCRAPER_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || "software engineer";
    const location = body.location || "Seattle, WA";
    const sources: string[] = body.sources || ["indeed"];

    const scrapers: Record<
      string,
      (q: string, l: string) => Promise<ScrapedJob[]>
    > = {
      indeed: scrapeIndeed,
      linkedin: scrapeLinkedIn,
      simplyhired: scrapeSimplyHired,
    };

    const results = await Promise.allSettled(
      sources.map((s) => scrapers[s]?.(query, location) ?? Promise.resolve([]))
    );

    const allJobs: ScrapedJob[] = [];
    const sourceResults: Record<string, number> = {};
    results.forEach((r, i) => {
      const source = sources[i];
      if (r.status === "fulfilled") {
        allJobs.push(...r.value);
        sourceResults[source] = r.value.length;
      } else {
        sourceResults[source] = 0;
      }
    });

    if (allJobs.length === 0) {
      return NextResponse.json(
        { error: "No jobs found", sourceResults },
        { status: 404 }
      );
    }

    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter((j) => {
      if (!j.title) return false;
      const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}|${j.platform}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const existingRes = await queryDatabricks(
      `SELECT LOWER(title), LOWER(company), platform FROM default.jobpilot_jobs`
    );
    const existingKeys = new Set(
      existingRes.data.map(([t, c, p]) => `${t}|${c}|${p}`)
    );

    const newJobs = uniqueJobs.filter(
      (j) => !existingKeys.has(`${j.title.toLowerCase()}|${j.company.toLowerCase()}|${j.platform}`)
    );

    const now = new Date().toISOString().replace("T", " ").split(".")[0];
    const values = newJobs.map((j) => {
      const jid = randomUUID();
      return `('${jid}', '${esc(j.title)}', '${esc(j.company)}', '${esc(j.location)}', ${j.salary_min}, ${j.salary_max}, '${esc(j.job_type)}', '${j.platform}', '${esc(j.url)}', '${esc(j.description)}', '${j.posted_date}', '${now}')`;
    });

    if (values.length > 0) {
      await queryDatabricks(
        `INSERT INTO default.jobpilot_jobs VALUES ${values.join(", ")}`
      );
    }

    return NextResponse.json({
      success: true,
      query,
      location,
      sourceResults,
      total_scraped: uniqueJobs.length,
      total_new: newJobs.length,
      total_inserted: values.length,
      jobs: uniqueJobs.slice(0, 50).map((j) => ({
        title: j.title,
        company: j.company,
        location: j.location,
        platform: j.platform,
        url: j.url,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
