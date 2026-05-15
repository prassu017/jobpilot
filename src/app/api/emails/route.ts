import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

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

    const emails = rows.map((r, i) => ({
      email_id: `tracker-${i}`,
      sender: r.platform || "direct",
      subject: `${r.company} - ${r.title}`,
      body_snippet: r.notes || `Application ${r.stage.toLowerCase()}`,
      received_at: r.applied_on ? new Date(r.applied_on).toISOString() : new Date().toISOString(),
      classification: r.stage,
      confidence: "1.0",
      company: r.company,
      title: r.title,
    }));

    emails.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

    return NextResponse.json(emails);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
