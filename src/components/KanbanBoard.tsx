"use client";

import {
  ApplicationWithJob,
  STATUS_ORDER,
  STATUS_BG,
  STATUS_BADGE,
  STATUS_COLORS,
} from "@/lib/types";

function StatusColumn({
  status,
  apps,
}: {
  status: string;
  apps: ApplicationWithJob[];
}) {
  return (
    <div className={`rounded-xl border-2 ${STATUS_BG[status]} p-4 min-w-[260px] flex-1`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wide text-gray-700">
          {status}
        </h3>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
          style={{ backgroundColor: STATUS_COLORS[status] }}
        >
          {apps.length}
        </span>
      </div>
      <div className="space-y-3">
        {apps.map((app) => (
          <div
            key={app.application_id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="font-semibold text-sm text-gray-900 leading-tight">
              {app.title}
            </div>
            <div className="text-sm text-gray-600 mt-1">{app.company}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">{app.location}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                ${parseInt(app.salary_min).toLocaleString()} -{" "}
                ${parseInt(app.salary_max).toLocaleString()}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[app.status]}`}
              >
                {app.platform}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Applied {new Date(app.applied_date).toLocaleDateString()}
            </div>
          </div>
        ))}
        {apps.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No applications
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  applications,
}: {
  applications: ApplicationWithJob[];
}) {
  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status);
      return acc;
    },
    {} as Record<string, ApplicationWithJob[]>
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => (
        <StatusColumn key={status} status={status} apps={grouped[status]} />
      ))}
    </div>
  );
}
