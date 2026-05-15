import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CSV_PATH = join(process.cwd(), "data", "tracker.csv");

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

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function writeCsv(rows: Record<string, string>[]) {
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    lines.push(HEADERS.map((h) => escapeCsv(row[h] || "")).join(","));
  }
  writeFileSync(CSV_PATH, lines.join("\n") + "\n", "utf-8");
}

export async function GET() {
  try {
    const rows = readCsv();
    const stages: Record<string, number> = {};
    for (const r of rows) {
      stages[r.stage] = (stages[r.stage] || 0) + 1;
    }

    const total = rows.length;
    const applied = stages["APPLIED"] || 0;
    const screening = stages["SCREENING"] || 0;
    const interview = stages["INTERVIEW"] || 0;
    const offer = stages["OFFER"] || 0;
    const rejected = stages["REJECTED"] || 0;
    const saved = stages["SAVED"] || 0;
    const active = total - saved - rejected;

    return NextResponse.json({
      rows,
      analytics: {
        total,
        stages,
        active,
        response_rate: active > 0 ? ((active - applied) / active) * 100 : 0,
        interview_rate: active > 0 ? (interview / active) * 100 : 0,
        offer_rate: active > 0 ? (offer / active) * 100 : 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = readCsv();

    if (body.action === "add") {
      const newRow: Record<string, string> = {};
      HEADERS.forEach((h) => (newRow[h] = body[h] || ""));
      if (!newRow.applied_on) newRow.applied_on = new Date().toISOString().split("T")[0];
      if (!newRow.stage) newRow.stage = "APPLIED";
      rows.push(newRow);
      writeCsv(rows);
      return NextResponse.json({ success: true, total: rows.length });
    }

    if (body.action === "update") {
      const idx = rows.findIndex(
        (r) => r.company === body.company && r.title === body.title
      );
      if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
      HEADERS.forEach((h) => {
        if (body[h] !== undefined) rows[idx][h] = body[h];
      });
      writeCsv(rows);
      return NextResponse.json({ success: true });
    }

    if (body.action === "bulk") {
      const existing = new Set(rows.map((r) => `${r.company.toLowerCase()}|${r.title.toLowerCase()}`));
      let added = 0;
      for (const entry of body.entries || []) {
        const key = `${(entry.company || "").toLowerCase()}|${(entry.title || "").toLowerCase()}`;
        if (existing.has(key)) continue;
        existing.add(key);
        const newRow: Record<string, string> = {};
        HEADERS.forEach((h) => (newRow[h] = entry[h] || ""));
        if (!newRow.applied_on) newRow.applied_on = new Date().toISOString().split("T")[0];
        if (!newRow.stage) newRow.stage = "APPLIED";
        rows.push(newRow);
        added++;
      }
      writeCsv(rows);
      return NextResponse.json({ success: true, added, total: rows.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
