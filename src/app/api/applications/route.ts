import { NextResponse } from "next/server";
import { queryDatabricks, rowsToObjects } from "@/lib/databricks";
import { ApplicationWithJob } from "@/lib/types";

export async function GET() {
  try {
    const result = await queryDatabricks(`
      SELECT a.*, j.title, j.company, j.location, j.salary_min, j.salary_max, j.platform
      FROM default.jobpilot_applications a
      JOIN default.jobpilot_jobs j ON a.job_id = j.job_id
      ORDER BY a.last_updated DESC
    `);
    return NextResponse.json(rowsToObjects<ApplicationWithJob>(result));
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
