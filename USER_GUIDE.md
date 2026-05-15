# JobPilot User Guide

## Overview

JobPilot is your AI-powered job search co-pilot. It tracks every application you submit, monitors your email for company responses, and gives you a clear dashboard of where each application stands.

## How It Works

### 1. Job Discovery
JobPilot aggregates job listings from LinkedIn, Indeed, and Glassdoor. Each listing shows:
- Job title and company
- Location (including remote options)
- Salary range
- Source platform

### 2. Application Pipeline

Your applications flow through five stages:

| Stage | What It Means |
|-------|--------------|
| **Applied** | You submitted an application. Waiting for a response. |
| **Screening** | Company is reviewing your materials. A recruiter may reach out. |
| **Interview** | You've been invited to interview. Check the email for scheduling details. |
| **Offer** | You received an offer letter. Review the terms. |
| **Rejected** | The company passed. Application is archived. |

### 3. AI Email Agent

The email agent runs continuously in the background:

1. Connects to your Gmail or Outlook via OAuth
2. Scans incoming emails every 5-15 minutes
3. Uses Claude AI to classify each email
4. Updates the dashboard automatically

**Classification examples:**
- "We'd like to schedule an interview" → **INTERVIEW** (92% confidence)
- "After careful review, we've decided to move forward with other candidates" → **REJECTED** (95% confidence)
- "We are pleased to extend an offer" → **OFFER** (97% confidence)

### 4. Analytics

The analytics tab gives you insight into your job search:

- **Response Rate** — % of applications that got any response
- **Interview Rate** — % that progressed to interview or offer
- **Offer Rate** — % that resulted in an offer
- **Pipeline Breakdown** — How many apps are in each stage
- **Platform Comparison** — Which job boards yield the best results

## Dashboard Navigation

### Pipeline Tab (Default)
A Kanban board with five columns. Cards are sorted by most recently updated. Each card shows the job title, company, location, salary range, platform badge, and application date.

### Analytics Tab
Four stat cards at the top with key metrics. Below, two bar charts show the pipeline breakdown by status and by platform.

### Email Feed Tab
A chronological list of all classified emails. Each entry shows:
- Company name and classification badge
- Email subject line
- Body snippet
- Sender address and date
- AI confidence score
- Color-coded status indicator

## Data Privacy

- Email content is processed by AI for classification only
- No email content is stored beyond a short snippet for the dashboard
- Your Databricks token is stored locally and never exposed to the frontend
- All API communication uses HTTPS

## Troubleshooting

**Dashboard shows "Loading from Databricks..."**
- Ensure your Databricks warehouse is running (it auto-stops after 10 min of inactivity)
- Check that DATABRICKS_TOKEN is set in `dashboard/.env.local`

**No data showing**
- Run `seed_rest.py` to populate demo data
- Check the Databricks SQL Editor to verify tables exist

**Warehouse won't start**
- Go to Databricks > SQL Warehouses > Click "Start"
- Serverless warehouses take 1-2 minutes to cold start
