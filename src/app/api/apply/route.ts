import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";
import { randomUUID } from "crypto";

function esc(s: string): string {
  return (s || "").replace(/'/g, "''");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job_id } = body;

    if (!job_id) {
      return NextResponse.json({ error: "job_id required" }, { status: 400 });
    }

    const existing = await queryDatabricks(
      `SELECT application_id FROM default.jobpilot_applications WHERE job_id = '${esc(job_id)}' LIMIT 1`
    );
    if (existing.data.length > 0) {
      return NextResponse.json({
        success: true,
        already_applied: true,
        application_id: existing.data[0][0],
      });
    }

    const applicationId = randomUUID();
    const now = new Date().toISOString().replace("T", " ").split(".")[0];

    const status = body.status === "APPLIED" ? "APPLIED" : "SAVED";

    await queryDatabricks(`
      INSERT INTO default.jobpilot_applications
      VALUES ('${applicationId}', '${esc(job_id)}', '${status}', '${now}', '${now}', '')
    `);

    const historyId = randomUUID();
    await queryDatabricks(`
      INSERT INTO default.jobpilot_status_history
      VALUES ('${historyId}', '${applicationId}', 'NEW', '${status}', '${now}', '${status === "APPLIED" ? "Application submitted" : "Job saved to tracker"}', '${status === "APPLIED" ? "You applied for this position" : "You saved this job for tracking"}')
    `);

    const job = await queryDatabricks(
      `SELECT company, title FROM default.jobpilot_jobs WHERE job_id = '${esc(job_id)}' LIMIT 1`
    );
    const company = job.data[0]?.[0] || "Company";
    const title = job.data[0]?.[1] || "Position";

    const emailId = randomUUID();
    await queryDatabricks(`
      INSERT INTO default.jobpilot_emails
      VALUES ('${emailId}', '${applicationId}', 'recruiting@${esc(company.toLowerCase().replace(/[^a-z]/g, ""))}.com',
        'Application Received - ${esc(company)}',
        'Thank you for applying to the ${esc(title)} role at ${esc(company)}. We will review your application.',
        '${now}', 'APPLIED', 0.95)
    `);

    return NextResponse.json({
      success: true,
      already_applied: false,
      application_id: applicationId,
      company,
      title,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
