import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks, rowsToObjects } from "@/lib/databricks";

function esc(s: string): string {
  return (s || "").replace(/'/g, "''");
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const location = req.nextUrl.searchParams.get("l") || "";

  try {
    const conditions: string[] = [];
    if (query) {
      conditions.push(
        `(LOWER(title) LIKE '%${esc(query.toLowerCase())}%' OR LOWER(company) LIKE '%${esc(query.toLowerCase())}%')`
      );
    }
    if (location) {
      conditions.push(`LOWER(location) LIKE '%${esc(location.toLowerCase())}%'`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await queryDatabricks(
      `SELECT * FROM default.jobpilot_jobs ${where} ORDER BY scraped_at DESC LIMIT 200`
    );

    const jobs = rowsToObjects(result);
    return NextResponse.json({ jobs, source: "database" });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, jobs: [] },
      { status: 500 }
    );
  }
}
