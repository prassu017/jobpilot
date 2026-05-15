"use client";

import { Analytics, STATUS_COLORS } from "@/lib/types";

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-sm text-gray-500 font-medium">{label}</div>
      <div
        className="text-3xl font-bold mt-1"
        style={{ color: color || "#111" }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({
  data,
  colors,
}: {
  data: Record<string, number>;
  colors?: Record<string, string>;
}) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex items-center gap-3">
          <div className="w-24 text-xs text-gray-600 font-medium text-right capitalize">
            {key}
          </div>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{
                width: `${(val / max) * 100}%`,
                backgroundColor: colors?.[key] || "#6366f1",
                minWidth: val > 0 ? "2rem" : "0",
              }}
            >
              <span className="text-xs font-bold text-white">{val}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPanel({
  analytics,
}: {
  analytics: Analytics;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Applications"
          value={analytics.total_applications}
          color="#3b82f6"
        />
        <StatCard
          label="Response Rate"
          value={`${analytics.response_rate.toFixed(0)}%`}
          sub="Heard back from companies"
          color="#8b5cf6"
        />
        <StatCard
          label="Interview Rate"
          value={`${analytics.interview_rate.toFixed(0)}%`}
          sub="Got interview or offer"
          color="#10b981"
        />
        <StatCard
          label="Offer Rate"
          value={`${analytics.offer_rate.toFixed(0)}%`}
          sub="Received an offer"
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Pipeline Breakdown</h3>
          <BarChart
            data={analytics.status_breakdown}
            colors={STATUS_COLORS}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">By Platform</h3>
          <BarChart
            data={analytics.platform_breakdown}
            colors={{
              linkedin: "#0a66c2",
              indeed: "#2164f3",
              glassdoor: "#0caa41",
            }}
          />
        </div>
      </div>
    </div>
  );
}
