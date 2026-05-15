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
}

function parseSalary(text: string): [number, number] {
  if (!text) return [0, 0];
  const numbers = text.match(/[\d,]+/g);
  if (!numbers) return [0, 0];
  const vals = numbers.map((n) => parseInt(n.replace(/,/g, "")));
  if (vals.length >= 2) return [vals[0], vals[1]];
  if (vals.length === 1) return [vals[0], vals[0]];
  return [0, 0];
}

function parseIndeedHtml(html: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().split("T")[0];

  // Extract job keys (data-jk attributes)
  const jobKeys: string[] = [];
  const jkPattern = /data-jk="([^"]+)"/g;
  let jkMatch;
  while ((jkMatch = jkPattern.exec(html)) !== null) {
    jobKeys.push(jkMatch[1]);
  }

  // Extract titles from aria-label="full details of ..." on jcs-JobTitle links
  const titles: string[] = [];
  const titlePattern = /aria-label="full details of ([^"]+)"[^>]*class="[^"]*jcs-JobTitle/g;
  let m;
  while ((m = titlePattern.exec(html)) !== null) {
    titles.push(m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  }

  // Extract company names (data-testid="company-name")
  const companies: string[] = [];
  const compPattern = /data-testid="company-name"[^>]*>([^<]+)/g;
  while ((m = compPattern.exec(html)) !== null) {
    companies.push(m[1].trim());
  }

  // Extract locations (data-testid="text-location")
  const locations: string[] = [];
  const locPattern = /data-testid="text-location"[^>]*>([^<]+)/g;
  while ((m = locPattern.exec(html)) !== null) {
    locations.push(m[1].trim());
  }

  const count = Math.min(titles.length, jobKeys.length || titles.length);
  for (let i = 0; i < count; i++) {
    const title = titles[i];
    const company = companies[i] || "";
    const key = `${title}-${company}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const jk = jobKeys[i] || "";
    jobs.push({
      title,
      company,
      location: locations[i] || "",
      salary_min: 0,
      salary_max: 0,
      job_type: "Full-time",
      url: jk ? `https://www.indeed.com/viewjob?jk=${jk}` : "",
      posted_date: today,
      description: "",
    });
  }

  return jobs;
}

function esc(s: string): string {
  return (s || "").replace(/'/g, "''");
}

export async function POST(req: NextRequest) {
  if (!SCRAPER_API_KEY) {
    return NextResponse.json({ error: "SCRAPER_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || "software engineer";
    const location = body.location || "Seattle, WA";

    const indeedUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&fromage=14`;
    const scraperUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(indeedUrl)}`;

    const res = await fetch(scraperUrl);
    const html = await res.text();

    if (html.length < 500) {
      return NextResponse.json({ error: "Scraper returned insufficient data", htmlLength: html.length }, { status: 502 });
    }

    const jobs = parseIndeedHtml(html);

    if (jobs.length === 0) {
      return NextResponse.json({ error: "No jobs parsed from HTML", htmlLength: html.length }, { status: 404 });
    }

    const now = new Date().toISOString().replace("T", " ").split(".")[0];
    const values = jobs
      .filter((j) => j.title && j.company)
      .map((j) => {
        const jid = randomUUID();
        return `('${jid}', '${esc(j.title)}', '${esc(j.company)}', '${esc(j.location)}', ${j.salary_min}, ${j.salary_max}, '${esc(j.job_type)}', 'indeed-live', '${esc(j.url)}', '${esc(j.description)}', '${j.posted_date}', '${now}')`;
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
      jobs_scraped: jobs.length,
      jobs_inserted: values.length,
      sample: jobs.slice(0, 5).map((j) => ({
        title: j.title,
        company: j.company,
        location: j.location,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
