# JobPilot - AI-Powered Job Application Tracker

An AI agent that monitors your email inbox, classifies recruiter responses, and maintains a real-time dashboard of your entire job search pipeline.

## Problem

Job seekers apply to 100+ positions across LinkedIn, Indeed, and Glassdoor. Tracking responses — rejections, interview invites, offers — across scattered email threads is impossible at scale.

## Solution

JobPilot uses AI to:
- **Discover** jobs from multiple platforms, ranked by match score
- **Track** applications in a Kanban pipeline (Applied → Screening → Interview → Offer)
- **Monitor** your email inbox and auto-classify recruiter responses
- **Analyze** your pipeline with response rates, interview rates, and platform insights

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16 + Tailwind CSS |
| Database | Databricks SQL Warehouse |
| AI Classification | Claude API |
| API Layer | Databricks REST API |
| Deployment | Vercel |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Next.js UI  │────▶│  API Routes  │────▶│  Databricks SQL     │
│  (Vercel)    │◀────│  (Next.js)   │◀────│  Warehouse          │
└─────────────┘     └──────────────┘     └─────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Claude AI   │
                    │  (Email      │
                    │  Classifier) │
                    └─────────────┘
```

## Database Schema

- `jobpilot_jobs` — Scraped job listings (title, company, salary, platform)
- `jobpilot_applications` — User applications with current status
- `jobpilot_status_history` — Status change audit log
- `jobpilot_emails` — AI-classified emails with confidence scores

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Databricks SQL Warehouse access

### Setup

```bash
# Clone the repo
git clone https://github.com/prassu017/jobpilot.git
cd jobpilot

# Set up Databricks tables
export DATABRICKS_TOKEN=your_token_here
uv run python setup_tables.py
uv run python seed_rest.py

# Start the dashboard
cd dashboard
cp .env.local.example .env.local  # Add your DATABRICKS_TOKEN
npm install
npm run dev
```

Open http://localhost:3000

## Features

### Kanban Pipeline
5-column board showing applications across stages: Applied, Screening, Interview, Offer, Rejected. Each card shows job title, company, salary range, and platform.

### Analytics Dashboard
- Total applications and response/interview/offer rates
- Pipeline breakdown with color-coded bar charts
- Platform performance comparison (LinkedIn vs Indeed vs Glassdoor)

### AI Email Monitor
Real-time feed of classified emails. The AI agent detects:
- Application confirmations
- Screening updates
- Interview invitations
- Rejection notices
- Offer letters

Each classification includes a confidence score.

## Team

Built at the AI-Spark Hackathon, Foster School of Business, University of Washington.

## License

MIT
