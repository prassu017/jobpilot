# JobPilot — AI-Powered Job Application Tracker

## Elevator Pitch

JobPilot is an AI agent that acts as your personal job search co-pilot. It scrapes job listings from LinkedIn, Indeed, and Glassdoor, lets you apply with one click, then monitors your email inbox to automatically track every application's status — rejection, interview invite, offer — all surfaced in a single real-time dashboard. No more spreadsheets, no more lost emails, no more wondering "did I hear back from that company?"

---

## The Problem

Job seekers today manage applications across 5+ platforms, lose track of where they applied, miss follow-up emails buried in inbox noise, and have zero visibility into their pipeline. The average job search involves 100-200 applications — managing this manually is a full-time job on top of a full-time job search.

---

## Core Value Proposition

1. **Discover** — AI curates jobs matching your profile from multiple platforms
2. **Apply** — One-click apply with auto-filled, tailored resumes/cover letters
3. **Track** — Agent monitors your email and auto-updates application status
4. **Analyze** — Dashboard shows your pipeline funnel, response rates, and insights

---

## User Personas

### Primary: Active Job Seeker (Alex)
- Applying to 10-30 jobs/week
- Uses LinkedIn, Indeed, Glassdoor
- Loses track of applications after 2 weeks
- Wants to know response rates and optimize strategy

### Secondary: Passive Job Seeker (Sam)
- Employed but open to opportunities
- Wants alerts for matching roles, not a full search workflow
- Applies selectively (2-5/week)

---

## User Flows

### Flow 1: Onboarding & Profile Setup
```
User signs up
  → Connects email (Gmail/Outlook OAuth)
  → Uploads resume (PDF/DOCX)
  → AI extracts skills, experience, preferences
  → User confirms/edits profile
  → Sets job preferences (role, location, salary range, remote/hybrid)
  → Dashboard is ready
```

### Flow 2: Job Discovery & Application
```
Dashboard shows curated job feed
  → Jobs scraped from LinkedIn, Indeed, Glassdoor
  → AI ranks by match score (skills, location, salary fit)
  → User clicks "Quick Apply"
    → AI tailors resume bullet points for the role
    → AI generates cover letter (optional, editable)
    → Application submitted via platform API or guided flow
  → Job card moves to "Applied" column on dashboard
```

### Flow 3: Email Monitoring & Status Updates (Core Feature)
```
Agent polls connected email inbox (every 5-15 min)
  → AI classifies incoming emails:
    - "Application received/confirmed" → Status: APPLIED
    - "We'd like to schedule an interview" → Status: INTERVIEW
    - "Take-home assignment" → Status: ASSESSMENT
    - "We regret to inform you..." → Status: REJECTED
    - "Offer letter attached" → Status: OFFER
    - "Following up on your application" → Status: FOLLOW_UP
  → Dashboard card auto-updates with:
    - New status badge
    - Date of status change
    - Key details extracted (interview date/time, interviewer name, etc.)
  → User gets push notification for interviews & offers
```

### Flow 4: Dashboard & Analytics
```
Dashboard views:
  → Kanban board: Applied → Screening → Interview → Offer → Rejected
  → Timeline view: chronological activity feed
  → Analytics tab:
    - Total applied / response rate / interview rate
    - Average time to response by company
    - Best-performing job platforms
    - Weekly application velocity
```

### Flow 5: Interview Prep (Stretch)
```
When status changes to INTERVIEW:
  → AI pulls company info (Glassdoor reviews, recent news)
  → Generates likely interview questions based on role
  → Creates a prep card attached to the job
```

---

## Technical Architecture

### Data Layer (Databricks SQL Warehouse)
```
Tables:
  jobs            — scraped job listings (title, company, platform, url, description, salary, location)
  applications    — user applications (job_id, status, applied_date, last_updated)
  status_history  — status change log (application_id, old_status, new_status, timestamp, email_id)
  emails          — processed emails (subject, sender, body_snippet, classification, confidence)
  user_profiles   — user info, preferences, resume data
```

### Services
| Service | Role |
|---------|------|
| Job Scraper | Pulls listings from LinkedIn, Indeed, Glassdoor APIs/scraping |
| Email Agent | Connects via Gmail/Outlook API, classifies emails with AI |
| Status Engine | Maps email classifications to application status transitions |
| Dashboard API | Serves dashboard data, filters, analytics |
| AI Resume Tailor | Customizes resume/cover letter per job |

### Tech Stack
| Component | Technology |
|-----------|-----------|
| Backend | Python (FastAPI) |
| Database | Databricks SQL Warehouse |
| Email Integration | Gmail API (OAuth2) / Microsoft Graph API |
| AI/Classification | Claude API (email classification, resume tailoring) |
| Frontend | Next.js + Tailwind CSS |
| Scraping | Bright Data / custom scrapers |
| Deployment | Vercel (frontend) + Databricks (data) |

---

## Application Statuses (State Machine)

```
SAVED → APPLIED → SCREENING → INTERVIEW → OFFER → ACCEPTED
                                    ↓          ↓
                                REJECTED    DECLINED
                                    ↑
                            (can happen from any active state)
```

---

## Email Classification Examples

| Email Signal | Detected Status |
|-------------|----------------|
| "Thank you for applying" | APPLIED (confirmed) |
| "Your application has been reviewed" | SCREENING |
| "We'd like to invite you for an interview" | INTERVIEW |
| "Please complete the following assessment" | SCREENING |
| "Unfortunately, we have decided to move forward with other candidates" | REJECTED |
| "We are pleased to extend an offer" | OFFER |
| "Regarding your interview on [date]" | INTERVIEW (update) |

---

## MVP Scope (Hackathon Build — 3 hours)

### Must Have (Demo-ready)
- [ ] Databricks tables created (jobs, applications, status_history)
- [ ] Seed data: 20-30 realistic job listings
- [ ] Email classification agent (Claude API) — demo with sample emails
- [ ] Dashboard UI: Kanban board showing application pipeline
- [ ] Status auto-update: show email → status change flow live

### Nice to Have
- [ ] Live Gmail integration
- [ ] Job match scoring
- [ ] Analytics charts

### Cut for Hackathon
- Resume tailoring
- Actual scraping (use seed data)
- Interview prep feature

---

## Demo Script (3 minutes)

1. **Hook** (30s): "I applied to 150 jobs last month. I lost track after week one."
2. **Show dashboard** (45s): Kanban board with jobs in various stages
3. **Live email demo** (60s): Send a mock "rejection" and "interview invite" email → watch the dashboard update in real-time
4. **Analytics** (30s): Show response rate, time-to-response insights
5. **Close** (15s): "JobPilot turns your chaotic job search into a managed pipeline."

---

## What Makes This Win

- **AI is the core** — not just a dashboard, the AI agent does the work
- **Real-time** — email monitoring creates a "wow" moment in demo
- **Solves a universal pain** — every judge has job-searched before
- **Data-driven** — Databricks analytics showcase adds depth
- **Extensible** — clear path to a real product
