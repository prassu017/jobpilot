import { NextResponse } from "next/server";
import { queryDatabricks, rowsToObjects } from "@/lib/databricks";
import { Job } from "@/lib/types";

export async function GET() {
  try {
    const result = await queryDatabricks(`
      SELECT * FROM default.jobpilot_jobs
      ORDER BY posted_date DESC
    `);
    return NextResponse.json(rowsToObjects<Job>(result));
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
