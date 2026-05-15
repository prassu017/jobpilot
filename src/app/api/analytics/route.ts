import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Analytics } from "@/lib/types";

const CSV_PATH = join(process.cwd(), "data", "tracker.csv");

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { result.push(current); current = ""; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

const HEADERS = ["company", "title", "stage", "applied_on", "platform", "location", "url", "salary", "notes"];

function readCsv(): Record<string, string>[] {
  if (!existsSync(CSV_PATH)) return [];
  const raw = readFileSync(CSV_PATH, "utf-8").trim();
  const lines = raw.split("\n");
  if (lines.length <= 1) return [];
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    HEADERS.forEach((h, i) => (obj[h] = values[i] || ""));
    return obj;
  });
}

export async function GET() {
  try {
    const rows = readCsv();

    const status_breakdown: Record<string, number> = {};
    const platform_breakdown: Record<string, number> = {};

    for (const r of rows) {
      const stage = r.stage || "APPLIED";
      status_breakdown[stage] = (status_breakdown[stage] || 0) + 1;

      const platform = r.platform || "unknown";
      platform_breakdown[platform] = (platform_breakdown[platform] || 0) + 1;
    }

    const total = rows.length;
    const saved = status_breakdown["SAVED"] || 0;
    const rejected = status_breakdown["REJECTED"] || 0;
    const active = total - saved - rejected;
    const applied = status_breakdown["APPLIED"] || 0;
    const responded = active - applied;
    const interviews = (status_breakdown["INTERVIEW"] || 0) + (status_breakdown["OFFER"] || 0);

    const analytics: Analytics = {
      total_applications: total,
      status_breakdown,
      response_rate: active > 0 ? (responded / active) * 100 : 0,
      interview_rate: active > 0 ? (interviews / active) * 100 : 0,
      offer_rate: active > 0 ? ((status_breakdown["OFFER"] || 0) / active) * 100 : 0,
      platform_breakdown,
    };

    return NextResponse.json(analytics);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
