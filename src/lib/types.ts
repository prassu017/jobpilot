export interface Job {
  job_id: string;
  title: string;
  company: string;
  location: string;
  salary_min: string;
  salary_max: string;
  job_type: string;
  platform: string;
  url: string;
  description: string;
  posted_date: string;
  scraped_at: string;
}

export interface Application {
  application_id: string;
  job_id: string;
  status: string;
  applied_date: string;
  last_updated: string;
  notes: string;
}

export interface ApplicationWithJob extends Application {
  title: string;
  company: string;
  location: string;
  salary_min: string;
  salary_max: string;
  platform: string;
}

export interface StatusHistory {
  history_id: string;
  application_id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  email_subject: string;
  email_snippet: string;
}

export interface Email {
  email_id: string;
  application_id: string;
  sender: string;
  subject: string;
  body_snippet: string;
  received_at: string;
  classification: string;
  confidence: string;
}

export interface Analytics {
  total_applications: number;
  status_breakdown: Record<string, number>;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
  platform_breakdown: Record<string, number>;
}

export const STATUS_ORDER = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  APPLIED: "#3b82f6",
  SCREENING: "#f59e0b",
  INTERVIEW: "#8b5cf6",
  OFFER: "#10b981",
  REJECTED: "#ef4444",
};

export const STATUS_BG: Record<string, string> = {
  APPLIED: "bg-blue-50 border-blue-200",
  SCREENING: "bg-amber-50 border-amber-200",
  INTERVIEW: "bg-purple-50 border-purple-200",
  OFFER: "bg-emerald-50 border-emerald-200",
  REJECTED: "bg-red-50 border-red-200",
};

export const STATUS_BADGE: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-800",
  SCREENING: "bg-amber-100 text-amber-800",
  INTERVIEW: "bg-purple-100 text-purple-800",
  OFFER: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};
