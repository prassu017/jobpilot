"use client";

import { useEffect, useMemo, useState } from "react";
import { Header, type Tab } from "@/components/Header";
import { KpiStrip } from "@/components/KpiStrip";
import { StatusFooter } from "@/components/StatusFooter";
import KanbanBoard from "@/components/KanbanBoard";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import EmailFeed from "@/components/EmailFeed";
import JobDiscovery from "@/components/JobDiscovery";
import AboutPanel from "@/components/AboutPanel";
import DeckPanel from "@/components/DeckPanel";
import HuskyAgent from "@/components/HuskyAgent";
import { ApplicationWithJob, Analytics, Job } from "@/lib/types";

export default function Home() {
  const [tab, setTab] = useState<Tab>("jobs");
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  async function loadData() {
    try {
      const [appsRes, analyticsRes, emailsRes, jobsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/analytics"),
        fetch("/api/emails"),
        fetch("/api/jobs"),
      ]);
      setApplications(await appsRes.json());
      setAnalytics(await analyticsRes.json());
      setEmails(await emailsRes.json());
      setJobs(await jobsRes.json());
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    if (!analytics) return [];
    const active = applications.filter((a) => a.status !== "REJECTED").length;
    return [
      {
        label: "Active Applications",
        value: String(active),
        meta: (
          <>
            <span className="text-primary">{analytics.total_applications}</span>{" "}
            total tracked
          </>
        ),
      },
      {
        label: "Interview Rate",
        value: `${analytics.interview_rate.toFixed(1)}%`,
        bar: analytics.interview_rate,
      },
      {
        label: "Response Rate",
        value: `${analytics.response_rate.toFixed(0)}%`,
        bar: analytics.response_rate,
      },
      {
        label: "Jobs Discovered",
        value: String(jobs.length),
        meta: <>Across all scraped sources</>,
      },
    ];
  }, [analytics, applications, jobs]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header tab={tab} onTabChange={setTab} />
      <main className="max-w-[1440px] mx-auto p-6 pb-32 space-y-8">
        <h1 className="sr-only">JobPilot personal job analytics</h1>

        <>
          {tab !== "about" && tab !== "deck" && tab !== "husky" && <KpiStrip items={kpis} />}
          {tab === "jobs" && (
            <JobDiscovery jobs={jobs} onRefresh={loadData} />
          )}
          {tab === "pipeline" && (
            <KanbanBoard applications={applications} />
          )}
          {tab === "husky" && <HuskyAgent onDataUpdate={loadData} />}
          {tab === "analytics" && analytics && (
            <AnalyticsPanel analytics={analytics} />
          )}
          {tab === "emails" && <EmailFeed emails={emails} />}
          {tab === "about" && <AboutPanel />}
          {tab === "deck" && <DeckPanel />}
        </>
      </main>
      <StatusFooter onSync={loadData} />

      {/* Dubsy floating icon */}
      {tab !== "husky" && (
        <button
          onClick={() => setTab("husky")}
          className="fixed bottom-20 right-6 z-[60] size-14 rounded-full bg-card border-2 border-primary/30 shadow-lg shadow-primary/10 flex items-center justify-center text-2xl hover:scale-110 hover:border-primary/60 hover:shadow-primary/20 transition-all cursor-pointer group"
          title="Open Dubsy Agent"
        >
          <span className="group-hover:animate-bounce">🐕</span>
        </button>
      )}
    </div>
  );
}
