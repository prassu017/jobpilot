import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";
import { randomUUID } from "crypto";

const SAMPLE_EMAILS = [
  {
    company: "Google",
    type: "REJECTED",
    subject: "Update on your application at Google",
    body: "Thank you for your interest in the Senior Software Engineer role. After careful consideration, we have decided to move forward with other candidates whose qualifications more closely align with our current needs.",
    sender: "recruiting@google.com",
  },
  {
    company: "Stripe",
    type: "INTERVIEW",
    subject: "Interview Invitation - Stripe Backend Engineer",
    body: "We were impressed with your background and would like to invite you for a technical interview. Please use the link below to schedule a 60-minute video call with our engineering team.",
    sender: "talent@stripe.com",
  },
  {
    company: "Netflix",
    type: "SCREENING",
    subject: "Application Update - Netflix",
    body: "Your application for Data Engineer has been reviewed by our recruiting team. We are currently evaluating candidates and will be in touch within the next week.",
    sender: "jobs@netflix.com",
  },
  {
    company: "OpenAI",
    type: "OFFER",
    subject: "Offer Letter - OpenAI ML Engineer",
    body: "Congratulations! We are thrilled to extend an offer for the ML Engineer position at OpenAI. Please find the attached offer letter with compensation details and start date.",
    sender: "people@openai.com",
  },
  {
    company: "Airbnb",
    type: "INTERVIEW",
    subject: "Next Steps - Airbnb Full Stack Developer",
    body: "Great news! Our team would love to meet you. We'd like to schedule a virtual onsite consisting of three 45-minute rounds covering system design, coding, and culture fit.",
    sender: "recruiting@airbnb.com",
  },
  {
    company: "Databricks",
    type: "OFFER",
    subject: "Exciting news from Databricks!",
    body: "We are delighted to offer you the Platform Engineer position at Databricks. The team was very impressed with your interview performance. Details on compensation and benefits are enclosed.",
    sender: "hr@databricks.com",
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const index = body?.index ?? Math.floor(Math.random() * SAMPLE_EMAILS.length);
    const sample = SAMPLE_EMAILS[index % SAMPLE_EMAILS.length];

    // Find the matching application
    const appResult = await queryDatabricks(`
      SELECT a.application_id, a.status
      FROM default.jobpilot_applications a
      JOIN default.jobpilot_jobs j ON a.job_id = j.job_id
      WHERE j.company = '${sample.company}'
      LIMIT 1
    `);

    if (appResult.data.length === 0) {
      return NextResponse.json({ error: `No application found for ${sample.company}` }, { status: 404 });
    }

    const [applicationId, oldStatus] = appResult.data[0];
    const now = new Date().toISOString().replace("T", " ").split(".")[0];
    const emailId = randomUUID();
    const historyId = randomUUID();

    // Insert email
    await queryDatabricks(`
      INSERT INTO default.jobpilot_emails VALUES (
        '${emailId}', '${applicationId}', '${sample.sender}',
        '${sample.subject.replace(/'/g, "''")}',
        '${sample.body.replace(/'/g, "''")}',
        '${now}', '${sample.type}', 0.94
      )
    `);

    // Update application status
    await queryDatabricks(`
      UPDATE default.jobpilot_applications
      SET status = '${sample.type}', last_updated = '${now}'
      WHERE application_id = '${applicationId}'
    `);

    // Insert status history
    await queryDatabricks(`
      INSERT INTO default.jobpilot_status_history VALUES (
        '${historyId}', '${applicationId}', '${oldStatus}', '${sample.type}',
        '${now}', '${sample.subject.replace(/'/g, "''")}',
        '${sample.body.substring(0, 200).replace(/'/g, "''")}'
      )
    `);

    return NextResponse.json({
      success: true,
      email: {
        company: sample.company,
        classification: sample.type,
        subject: sample.subject,
        confidence: 0.94,
      },
      transition: {
        from: oldStatus,
        to: sample.type,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
