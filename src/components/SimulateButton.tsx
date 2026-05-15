"use client";

import { useState } from "react";
import { STATUS_BADGE } from "@/lib/types";

interface SimResult {
  email: {
    company: string;
    classification: string;
    subject: string;
    confidence: number;
  };
  transition: { from: string; to: string };
}

export default function SimulateButton({
  onUpdate,
}: {
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  async function simulate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/simulate-email", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={simulate}
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-sm"
      >
        {loading ? "Processing..." : "Simulate Incoming Email"}
      </button>
      {result && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm animate-fade-in">
          <span className="text-sm font-medium text-gray-700">
            {result.email.company}
          </span>
          <span className="text-gray-400">→</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[result.email.classification]}`}
          >
            {result.email.classification}
          </span>
          <span className="text-xs text-gray-400">
            ({(result.email.confidence * 100).toFixed(0)}% conf)
          </span>
        </div>
      )}
    </div>
  );
}
