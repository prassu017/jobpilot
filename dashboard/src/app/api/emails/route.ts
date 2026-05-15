import { NextResponse } from "next/server";
import { queryDatabricks, rowsToObjects } from "@/lib/databricks";

interface EmailWithJob {
  email_id: string;
  sender: string;
  subject: string;
  body_snippet: string;
  received_at: string;
  classification: string;
  confidence: string;
  company: string;
  title: string;
}

export async function GET() {
  try {
    const result = await queryDatabricks(`
      SELECT e.email_id, e.sender, e.subject, e.body_snippet, e.received_at,
             e.classification, e.confidence, j.company, j.title
      FROM default.jobpilot_emails e
      JOIN default.jobpilot_applications a ON e.application_id = a.application_id
      JOIN default.jobpilot_jobs j ON a.job_id = j.job_id
      ORDER BY e.received_at DESC
    `);
    return NextResponse.json(rowsToObjects<EmailWithJob>(result));
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
