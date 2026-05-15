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
];

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { messages } = await req.json();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const trackerSummary = readTracker();
    const lines = trackerSummary.split("\n");
    const rowCount = Math.max(0, lines.length - 1);

    const systemPrompt = `You are Dubsy 🐺, a smart and friendly AI assistant built into JobPilot. You help the user with anything they need — general questions, career advice, job search strategy, interview prep, resume tips, and more.

You also have special access to:
1. The user's job application tracker (${rowCount} applications tracked)
2. The user's Gmail (if connected) — you can search emails to find information

When the user asks about their applications, job status, emails, or anything that requires their data, use the available tools. For general conversation, just chat naturally.

Be concise, helpful, and conversational. Use a warm but professional tone. You can use emoji sparingly.

Current tracker summary: ${rowCount} applications tracked across various companies and stages.
Gmail connected: ${isConnected() ? "Yes" : "No"}`;

    let currentMessages = messages;
    let finalResponse = "";

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

    return NextResponse.json({ response: finalResponse });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
