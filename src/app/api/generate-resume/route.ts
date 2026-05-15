import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { targetRole, targetCompany, userContext } = await req.json();

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Generate a professional, ATS-friendly resume in clean HTML format for the following:

Target Role: ${targetRole || "Software Engineer / Product Manager"}
Target Company: ${targetCompany || "General"}
User Context: ${userContext || "Recent graduate with experience in AI/ML, data engineering, and product management."}

Requirements:
- Output ONLY the HTML content (no markdown, no code fences)
- Use clean, professional styling with inline CSS
- Include sections: Contact Info (use placeholder name "Prasanna Jain", email "prassu017@gmail.com"), Summary, Education, Experience, Skills, Projects
- Make it ATS-friendly (simple layout, no tables for structure, standard section headers)
- Tailor the summary and skills to the target role/company
- Use a clean single-column layout that prints well
- Font: system-ui or Arial
- Keep it to 1 page worth of content
- Use subtle color accents (dark navy #1a1a2e for headers)
- Include proper print CSS media query for clean PDF output

Return ONLY the complete HTML document starting with <!DOCTYPE html>.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const htmlMatch = text.match(/<!DOCTYPE html>[\s\S]*/i);
    const html = htmlMatch ? htmlMatch[0] : text;

    return NextResponse.json({ html });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
