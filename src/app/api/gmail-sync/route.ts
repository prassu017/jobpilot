import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient, isConnected } from "@/lib/google-auth";
import { queryDatabricks } from "@/lib/databricks";
import { randomUUID } from "crypto";

function esc(s: string): string {
  return (s || "").replace(/'/g, "''");
}

function decodeBody(payload: any): string {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
    }
    for (const part of payload.parts) {
      const nested = decodeBody(part);
      if (nested) return nested;
    }
  }
  return "";
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

const JOB_KEYWORDS = [
  "application", "interview", "offer", "position", "role", "hiring",
  "recruiter", "screening", "assessment", "onboarding", "candidate",
  "resume", "applied", "rejected", "opportunity", "schedule",
];

function classifyEmail(subject: string, body: string): { classification: string; confidence: number } {
  const text = `${subject} ${body}`.toLowerCase();

  if (/offer\s*(letter|details|package|extended|congratulations)/i.test(text))
    return { classification: "OFFER", confidence: 0.9 };
  if (/interview\s*(scheduled|invitation|confirm|round|panel|phone|video|on-?site)/i.test(text))
    return { classification: "INTERVIEW", confidence: 0.88 };
  if (/screening|phone screen|recruiter call|initial call/i.test(text))
    return { classification: "SCREENING", confidence: 0.82 };
  if (/unfortunately|not moving forward|not selected|regret|rejected|other candidates/i.test(text))
    return { classification: "REJECTED", confidence: 0.85 };
  if (/application (received|submitted|confirmed)|thank you for (applying|your interest)/i.test(text))
    return { classification: "APPLIED", confidence: 0.8 };

  return { classification: "APPLIED", confidence: 0.5 };
}

function isJobRelated(subject: string, body: string): boolean {
  const text = `${subject} ${body}`.toLowerCase();
  return JOB_KEYWORDS.some((kw) => text.includes(kw));
}

export async function POST() {
  if (!isConnected()) {
    return NextResponse.json(
      { error: "Gmail not connected. Please connect your Google account first." },
      { status: 401 }
    );
  }

  try {
    const auth = getAuthenticatedClient()!;
    const gmail = google.gmail({ version: "v1", auth });

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
      q: "newer_than:30d (application OR interview OR offer OR position OR role OR hiring OR recruiter OR screening)",
    });

    const messageIds = listRes.data.messages || [];
    if (messageIds.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: "No job-related emails found" });
    }

    const messages = await Promise.all(
      messageIds.slice(0, 30).map((m) =>
        gmail.users.messages.get({ userId: "me", id: m.id!, format: "full" })
      )
    );

    const now = new Date().toISOString().replace("T", " ").split(".")[0];
    let synced = 0;
    const emailRows: string[] = [];

    for (const msg of messages) {
      const headers = msg.data.payload?.headers || [];
      const subject = getHeader(headers, "Subject");
      const sender = getHeader(headers, "From");
      const dateStr = getHeader(headers, "Date");
      const body = decodeBody(msg.data.payload);
      const snippet = body.slice(0, 300).replace(/\n/g, " ").trim();

      if (!isJobRelated(subject, snippet)) continue;

      const { classification, confidence } = classifyEmail(subject, snippet);
      const emailId = randomUUID();
      const received = dateStr
        ? new Date(dateStr).toISOString().replace("T", " ").split(".")[0]
        : now;

      emailRows.push(
        `('${emailId}', NULL, '${esc(sender)}', '${esc(subject)}', '${esc(snippet)}', '${received}', '${classification}', ${confidence})`
      );
      synced++;
    }

    if (emailRows.length > 0) {
      await queryDatabricks(
        `INSERT INTO default.jobpilot_emails (email_id, application_id, sender, subject, body_snippet, received_at, classification, confidence) VALUES ${emailRows.join(", ")}`
      );
    }

    return NextResponse.json({
      success: true,
      synced,
      total_scanned: messages.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
