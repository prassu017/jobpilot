import { NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";
import { Analytics } from "@/lib/types";

export async function GET() {
  try {
    const [statusRes, platformRes, totalRes] = await Promise.all([
      queryDatabricks(`
        SELECT a.status, COUNT(*) as cnt
        FROM default.jobpilot_applications a
        GROUP BY a.status
      `),
      queryDatabricks(`
        SELECT j.platform, COUNT(*) as cnt
        FROM default.jobpilot_applications a
        JOIN default.jobpilot_jobs j ON a.job_id = j.job_id
        GROUP BY j.platform
      `),
      queryDatabricks(
        `SELECT COUNT(*) as total FROM default.jobpilot_applications`
      ),
    ]);

    const status_breakdown: Record<string, number> = {};
    statusRes.data.forEach(([status, cnt]) => {
      status_breakdown[status] = parseInt(cnt);
    });

    const platform_breakdown: Record<string, number> = {};
    platformRes.data.forEach(([platform, cnt]) => {
      platform_breakdown[platform] = parseInt(cnt);
    });

    const total = parseInt(totalRes.data[0][0]);
    const saved = status_breakdown["SAVED"] || 0;
    const active = total - saved;
    const responded =
      active - (status_breakdown["APPLIED"] || 0);
    const interviews =
      (status_breakdown["INTERVIEW"] || 0) + (status_breakdown["OFFER"] || 0);

    const analytics: Analytics = {
      total_applications: total,
      status_breakdown,
      response_rate: active > 0 ? (responded / active) * 100 : 0,
      interview_rate: active > 0 ? (interviews / active) * 100 : 0,
      offer_rate:
        active > 0
          ? ((status_breakdown["OFFER"] || 0) / active) * 100
          : 0,
      platform_breakdown,
    };

    return NextResponse.json(analytics);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
