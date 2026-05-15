import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient, isConnected } from "@/lib/google-auth";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CSV_PATH = join(process.cwd(), "data", "tracker.csv");
const HEADERS = ["company", "title", "stage", "applied_on", "platform", "location", "url", "salary", "notes"];

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

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

function writeCsv(rows: Record<string, string>[]) {
  const lines = [HEADERS.join(",")];
  for (const row of rows) lines.push(HEADERS.map((h) => escapeCsv(row[h] || "")).join(","));
  writeFileSync(CSV_PATH, lines.join("\n") + "\n", "utf-8");
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBody(payload: any): string {
  if (payload.body?.data) return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data)
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
    }
    for (const part of payload.parts) {
      const nested = decodeBody(part);
      if (nested) return nested;
    }
  }
  return "";
}

export async function POST() {
  if (!isConnected()) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const auth = getAuthenticatedClient()!;
    const gmail = google.gmail({ version: "v1", auth });
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Scan across all mailbox categories
    const queries = [
      "newer_than:60d category:primary (application OR interview OR offer OR position OR recruiter OR hiring)",
      "newer_than:60d category:updates (application OR interview OR offer OR position OR recruiter)",
      "newer_than:60d category:promotions (hiring OR career OR opportunity OR role)",
      "newer_than:60d in:spam (interview OR offer OR application)",
    ];

    const allMessageIds: string[] = [];
    for (const q of queries) {
      try {
        const res = await gmail.users.messages.list({ userId: "me", maxResults: 30, q });
        for (const m of res.data.messages || []) {
          if (m.id && !allMessageIds.includes(m.id)) allMessageIds.push(m.id);
        }
      } catch {}
    }

    if (allMessageIds.length === 0) {
      return NextResponse.json({ success: true, scanned: 0, added: 0, message: "No job emails found" });
    }

    const messages = await Promise.all(
      allMessageIds.slice(0, 50).map((id) =>
        gmail.users.messages.get({ userId: "me", id, format: "full" })
      )
    );

    // Build email summaries for Claude
    const emailSummaries = messages.map((msg) => {
      const headers = msg.data.payload?.headers || [];
      const subject = getHeader(headers, "Subject");
      const sender = getHeader(headers, "From");
      const date = getHeader(headers, "Date");
      const body = decodeBody(msg.data.payload).slice(0, 500);
      return { subject, sender, date, body };
    });

    const prompt = `You are Husky, a job application tracking assistant. Analyze these emails and extract job application activity.

For each email that is related to a job application, extract:
- company: the company name
- title: the job title/role
- stage: one of APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED
- applied_on: date in YYYY-MM-DD format (use the email date if no specific date mentioned)
- platform: where the application was made (indeed, linkedin, company website, etc.)
- location: job location if mentioned
- notes: brief 1-line summary of the email content

Return ONLY a JSON array of objects. If an email is not job-related (marketing, newsletters, social media notifications, etc.), skip it entirely. Deduplicate by company+title, keeping the most advanced stage.

Emails to analyze:
${JSON.stringify(emailSummaries, null, 2)}

Return format: [{"company":"...","title":"...","stage":"...","applied_on":"...","platform":"...","location":"...","notes":"..."}]
If no job-related emails found, return []`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ success: true, scanned: messages.length, added: 0, message: "No job applications found in emails" });
    }

    const extracted: Record<string, string>[] = JSON.parse(jsonMatch[0]);

    // Merge into CSV tracker
    const existing = readCsv();
    const existingKeys = new Set(existing.map((r) => `${r.company.toLowerCase()}|${r.title.toLowerCase()}`));
    let added = 0;
    let updated = 0;

    for (const entry of extracted) {
      const key = `${(entry.company || "").toLowerCase()}|${(entry.title || "").toLowerCase()}`;
      if (existingKeys.has(key)) {
        // Update stage if more advanced
        const stageOrder = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"];
        const idx = existing.findIndex((r) => `${r.company.toLowerCase()}|${r.title.toLowerCase()}` === key);
        if (idx !== -1) {
          const currentStage = stageOrder.indexOf(existing[idx].stage);
          const newStage = stageOrder.indexOf(entry.stage);
          if (newStage > currentStage && entry.stage !== "REJECTED") {
            existing[idx].stage = entry.stage;
            existing[idx].notes = entry.notes || existing[idx].notes;
            updated++;
          }
        }
        continue;
      }
      existingKeys.add(key);
      const row: Record<string, string> = {};
      HEADERS.forEach((h) => (row[h] = entry[h] || ""));
      if (!row.applied_on) row.applied_on = new Date().toISOString().split("T")[0];
      if (!row.stage) row.stage = "APPLIED";
      existing.push(row);
      added++;
    }

    writeCsv(existing);

    return NextResponse.json({
      success: true,
      scanned: messages.length,
      extracted: extracted.length,
      added,
      updated,
      total: existing.length,
      entries: extracted,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
