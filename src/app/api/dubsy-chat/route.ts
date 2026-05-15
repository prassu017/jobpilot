import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { getAuthenticatedClient, isConnected } from "@/lib/google-auth";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CSV_PATH = join(process.cwd(), "data", "tracker.csv");

function readTracker(): string {
  if (!existsSync(CSV_PATH)) return "No tracker data yet.";
  return readFileSync(CSV_PATH, "utf-8").trim();
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

async function searchEmails(query: string, maxResults = 10): Promise<string> {
  if (!isConnected()) return "Gmail is not connected. Ask the user to connect Gmail first.";
  try {
    const auth = getAuthenticatedClient()!;
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.list({ userId: "me", maxResults, q: query });
    const messages = res.data.messages || [];
    if (messages.length === 0) return "No emails found for that query.";

    const details = await Promise.all(
      messages.slice(0, maxResults).map((m) =>
        gmail.users.messages.get({ userId: "me", id: m.id!, format: "full" })
      )
    );

    return details.map((msg) => {
      const headers = msg.data.payload?.headers || [];
      const subject = getHeader(headers, "Subject");
      const from = getHeader(headers, "From");
      const date = getHeader(headers, "Date");
      const body = decodeBody(msg.data.payload).slice(0, 400);
      return `From: ${from}\nDate: ${date}\nSubject: ${subject}\nBody: ${body}`;
    }).join("\n---\n");
  } catch (e) {
    return `Email search error: ${(e as Error).message}`;
  }
}

const tools: Anthropic.Tool[] = [
  {
    name: "search_emails",
    description: "Search the user's Gmail inbox with a query. Returns matching emails with subject, sender, date, and body preview. Use Gmail search syntax (e.g. 'from:amazon subject:interview', 'newer_than:7d', 'is:unread').",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Gmail search query" },
        max_results: { type: "number", description: "Max emails to return (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_tracker",
    description: "Get the full job application tracker CSV data. Contains all tracked applications with company, title, stage, applied_on, platform, location, url, salary, notes.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "generate_resume",
    description: "Generate a tailored, ATS-friendly resume as a downloadable HTML file. Use this when the user asks to create, generate, build, or update their resume. The resume will be tailored to the target role and company.",
    input_schema: {
      type: "object" as const,
      properties: {
        target_role: { type: "string", description: "The job title/role to tailor the resume for" },
        target_company: { type: "string", description: "The company to tailor the resume for (optional)" },
        user_context: { type: "string", description: "Additional context about the user's experience, skills, and background to include" },
      },
      required: ["target_role"],
    },
  },
];

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { messages } = await req.json();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const trackerRaw = readTracker();
    const lines = trackerRaw.split("\n");
    const rowCount = Math.max(0, lines.length - 1);

    const rows = lines.slice(1).filter(Boolean).map((line) => {
      const vals = line.split(",");
      return { company: vals[0], title: vals[1], stage: vals[2], applied_on: vals[3], platform: vals[4], location: vals[5], notes: vals[8] };
    });

    const stages: Record<string, number> = {};
    const recentApps: typeof rows = [];
    const interviews: typeof rows = [];
    const offers: typeof rows = [];
    const rejections: typeof rows = [];
    const pendingFollowups: typeof rows = [];

    const now = Date.now();
    for (const r of rows) {
      stages[r.stage] = (stages[r.stage] || 0) + 1;
      if (r.stage === "INTERVIEW") interviews.push(r);
      if (r.stage === "OFFER") offers.push(r);
      if (r.stage === "REJECTED") rejections.push(r);
      if (r.stage === "APPLIED" && r.applied_on) {
        const daysAgo = (now - new Date(r.applied_on).getTime()) / 86400000;
        if (daysAgo <= 14) recentApps.push(r);
        if (daysAgo > 14 && daysAgo < 60) pendingFollowups.push(r);
      }
    }

    const stagesStr = Object.entries(stages).map(([k, v]) => `${k}: ${v}`).join(", ");
    const interviewList = interviews.map((r) => `${r.company} - ${r.title}`).join("; ");
    const offerList = offers.map((r) => `${r.company} - ${r.title}`).join("; ");
    const recentList = recentApps.slice(0, 10).map((r) => `${r.company} - ${r.title} (${r.applied_on})`).join("; ");
    const followupList = pendingFollowups.slice(0, 15).map((r) => `${r.company} - ${r.title} (applied ${r.applied_on})`).join("; ");

    const systemPrompt = `You are Dubsy 🐺, a smart and proactive AI career assistant built into JobPilot. You have deep knowledge of the user's job search and proactively offer insights, suggestions, and encouragement.

## User's Application Data (${rowCount} total applications)
- Stage breakdown: ${stagesStr}
- Active interviews: ${interviewList || "None currently"}
- Offers: ${offerList || "None yet"}
- Recent applications (last 2 weeks): ${recentList || "None"}
- Need follow-up (applied 2-8 weeks ago, no response): ${followupList || "None"}

## Your Capabilities
1. Full job application tracker access (use get_tracker tool for detailed data)
2. Gmail search (if connected) to find specific emails
3. Career coaching: interview prep, resume tips, salary negotiation, job search strategy
4. Application analytics: identify patterns, suggest improvements

## How to Behave
- Be proactive: suggest follow-ups, prep tips, and next steps based on their data
- When the conversation starts or the user asks for suggestions, immediately analyze their tracker and give actionable advice
- Flag applications that need follow-up (applied 2+ weeks ago with no stage change)
- If they have upcoming interviews, offer to help prep
- Celebrate wins (offers, interview invites) and be encouraging about rejections
- Be concise but warm. Use emoji sparingly.
- When asked about specific companies, search emails for the latest correspondence

Gmail connected: ${isConnected() ? "Yes" : "No"}`;

    let currentMessages = messages;
    let finalResponse = "";
    let resumeHtml: string | null = null;

    for (let i = 0; i < 5; i++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages: currentMessages,
      });

      if (response.stop_reason === "end_turn" || !response.content.some((b) => b.type === "tool_use")) {
        const textBlock = response.content.find((b) => b.type === "text");
        finalResponse = textBlock && textBlock.type === "text" ? textBlock.text : "";
        break;
      }

      const toolResults: any[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          let result = "";
          if (block.name === "search_emails") {
            const input = block.input as { query: string; max_results?: number };
            result = await searchEmails(input.query, input.max_results || 10);
          } else if (block.name === "get_tracker") {
            result = readTracker();
          } else if (block.name === "generate_resume") {
            const input = block.input as { target_role: string; target_company?: string; user_context?: string };
            try {
              const resumeRes = await fetch(new URL("/api/generate-resume", req.url).toString(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  targetRole: input.target_role,
                  targetCompany: input.target_company || "",
                  userContext: input.user_context || "",
                }),
              });
              const resumeData = await resumeRes.json();
              if (resumeData.html) {
                resumeHtml = resumeData.html;
                result = "Resume generated successfully. The user can now download it.";
              } else {
                result = "Failed to generate resume: " + (resumeData.error || "Unknown error");
              }
            } catch (e) {
              result = "Failed to generate resume: " + (e as Error).message;
            }
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    }

    return NextResponse.json({ response: finalResponse, resumeHtml });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
