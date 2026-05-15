"use client";

import { useEffect, useState } from "react";
import KanbanBoard from "@/components/KanbanBoard";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import EmailFeed from "@/components/EmailFeed";
import SimulateButton from "@/components/SimulateButton";
import { ApplicationWithJob, Analytics } from "@/lib/types";

type Tab = "kanban" | "analytics" | "emails";

export default function Home() {
  const [tab, setTab] = useState<Tab>("kanban");
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [appsRes, analyticsRes, emailsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/analytics"),
        fetch("/api/emails"),
      ]);
      setApplications(await appsRes.json());
      setAnalytics(await analyticsRes.json());
      setEmails(await emailsRes.json());
    } catch (e) {
      console.error("Failed to load data:", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JP</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">JobPilot</h1>
                <p className="text-xs text-gray-500">
                  AI-Powered Application Tracker
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">
                  Email Agent Active
                </span>
              </div>
              <div className="text-xs text-gray-400 px-3">
                Powered by Databricks + Claude AI
              </div>
            </div>
          </div>

          <div className="flex gap-1 mt-4">
            {[
              { id: "kanban" as Tab, label: "Pipeline", icon: "📋" },
              { id: "analytics" as Tab, label: "Analytics", icon: "📊" },
              { id: "emails" as Tab, label: "Email Feed", icon: "📧" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === t.id
                    ? "bg-gray-100 text-gray-900 border border-b-0 border-gray-200"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="mb-6">
          <SimulateButton onUpdate={loadData} />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-3">
                Loading from Databricks...
              </p>
            </div>
          </div>
        ) : (
          <>
            {tab === "kanban" && (
              <KanbanBoard applications={applications} />
            )}
            {tab === "analytics" && analytics && (
              <AnalyticsPanel analytics={analytics} />
            )}
            {tab === "emails" && <EmailFeed emails={emails} />}
          </>
        )}
      </main>
    </div>
  );
}
