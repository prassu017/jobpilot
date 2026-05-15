"use client";

import { STATUS_BADGE, STATUS_COLORS } from "@/lib/types";

interface EmailWithJob {
  email_id: string;
  sender: string;
  subject: string;
  body_snippet: string;
  received_at: string;
  classification: string;
  confidence: string;
  company: string;
  title: string;
}

function ClassificationIcon({ classification }: { classification: string }) {
  const icons: Record<string, string> = {
    APPLIED: "📨",
    SCREENING: "🔍",
    INTERVIEW: "🎯",
    OFFER: "🎉",
    REJECTED: "❌",
  };
  return <span className="text-lg">{icons[classification] || "📧"}</span>;
}

export default function EmailFeed({ emails }: { emails: EmailWithJob[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">
          AI Email Monitor
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Emails classified by AI agent in real-time
        </p>
      </div>
      <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
        {emails.map((email) => (
          <div
            key={email.email_id}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <ClassificationIcon classification={email.classification} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900 truncate">
                    {email.company}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[email.classification]}`}
                  >
                    {email.classification}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                    {(parseFloat(email.confidence) * 100).toFixed(0)}% conf
                  </span>
                </div>
                <div className="text-sm text-gray-700 mt-0.5 font-medium truncate">
                  {email.subject}
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {email.body_snippet}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">{email.sender}</span>
                  <span className="text-xs text-gray-300">
                    {new Date(email.received_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div
                className="w-1 h-12 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    STATUS_COLORS[email.classification] || "#gray",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
