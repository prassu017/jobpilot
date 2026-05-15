import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { targetRole, targetCompany, jobDescription, resumeText, linkedinData, userName } = await req.json();

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const firstName = (userName || "Prasanna Jain").split(" ")[0];
    const lastName = (userName || "Prasanna Jain").split(" ").slice(1).join(" ") || "Jain";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const safeRole = (targetRole || "SoftwareEngineer").replace(/[^a-zA-Z0-9]/g, "");
    const safeCompany = (targetCompany || "General").replace(/[^a-zA-Z0-9]/g, "");
    const fileBaseName = `${firstName}_${lastName}_${safeRole}_${safeCompany}_${dateStr}`;

    const resumePrompt = `I need you to optimize my resume for ATS (Applicant Tracking Systems) based on a specific job posting. Please follow these instructions carefully:

YOUR TASK:
Analyze the attached job description and extract ALL key terms including:
- Technical skills, tools, and technologies
- Industry-specific terminology and buzzwords
- Required qualifications and certifications
- Action verbs and competencies mentioned
- Soft skills emphasized in the posting

Review my current resume and strategically incorporate the identified keywords where they naturally fit and are truthful to my experience.

Optimize my resume to match the job title and requirements while:
- Keeping ALL of my original formatting, layout, and structure EXACTLY as is
- Maintaining the same fonts, spacing, margins, and visual hierarchy
- Preserving bullet point styles, section headers, and design elements
- Only modifying the TEXT CONTENT, not the format or appearance

Ensure ATS compatibility by:
- Using standard section headings (e.g., "Work Experience," "Skills," "Education")
- Incorporating keywords naturally throughout relevant sections
- Matching job title terminology where applicable
- Avoiding keyword stuffing - maintain natural, readable language

IMPORTANT CONSTRAINTS:
- Do NOT invent or fabricate any experience, skills, or qualifications the user doesn't have
- Only add keywords that genuinely relate to existing experience
- Keep the original formatting structure 100% intact
- Maintain professional, clear, and concise language
- Get rid of irrelevant skills to make the skills section concise and ATS optimized

Output the resume as a complete HTML document (starting with <!DOCTYPE html>) with:
- Clean, professional styling with inline CSS
- A single-column layout that prints well
- Font: system-ui or Arial
- Subtle color accents (dark navy #1a1a2e for headers)
- Proper print CSS media query for clean PDF output
- Keep it to 1 page worth of content

Job Description: ${jobDescription || targetRole + " at " + targetCompany}

My Current Resume:
${resumeText || "No resume provided - create a professional resume based on available context."}

${linkedinData ? "LinkedIn Profile Data:\n" + linkedinData : ""}

Return ONLY the complete HTML document starting with <!DOCTYPE html>.`;

    const coverLetterPrompt = `Write a professional, tailored cover letter for:

Role: ${targetRole || "Software Engineer"}
Company: ${targetCompany || "the company"}
Job Description: ${jobDescription || "Not provided"}

Candidate Background (from resume):
${resumeText || "Recent graduate with experience in AI/ML, data engineering, and product management."}

${linkedinData ? "LinkedIn Profile Data:\n" + linkedinData : ""}

Requirements:
- Professional tone, concise (under 400 words)
- Tailor specifically to the role and company
- Reference specific skills and experiences from the resume that match the job
- Show enthusiasm for the specific company and role
- Include a strong opening hook and clear call to action
- Use the candidate's real name: ${userName || "Prasanna Jain"}
- Email: prassu017@gmail.com

Output as a complete HTML document (starting with <!DOCTYPE html>) with:
- Clean professional styling with inline CSS
- Font: system-ui or Arial
- Proper letter format with date, greeting, body, closing
- Print-friendly layout
- Subtle styling matching a professional letter

Return ONLY the complete HTML document starting with <!DOCTYPE html>.`;

    const [resumeRes, coverRes] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: resumePrompt }],
      }),
      anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: coverLetterPrompt }],
      }),
    ]);

    const resumeText2 = resumeRes.content[0].type === "text" ? resumeRes.content[0].text : "";
    const coverText = coverRes.content[0].type === "text" ? coverRes.content[0].text : "";

    const resumeHtml = (resumeText2.match(/<!DOCTYPE html>[\s\S]*/i) || [resumeText2])[0];
    const coverHtml = (coverText.match(/<!DOCTYPE html>[\s\S]*/i) || [coverText])[0];

    return NextResponse.json({
      resumeHtml,
      coverLetterHtml: coverHtml,
      fileName: fileBaseName,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
