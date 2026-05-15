"""Seed JobPilot tables with realistic demo data."""
import os
import uuid
from datetime import datetime, timedelta
from databricks import sql

DATABRICKS_HOST = "dbc-3b10530b-465d.cloud.databricks.com"
DATABRICKS_HTTP_PATH = "/sql/1.0/warehouses/b6be6c7afc2178b5"

JOBS = [
    ("Senior Software Engineer", "Google", "Mountain View, CA", 180000, 250000, "Full-time", "linkedin"),
    ("Backend Engineer", "Stripe", "San Francisco, CA", 170000, 230000, "Full-time", "linkedin"),
    ("Full Stack Developer", "Airbnb", "Remote", 150000, 200000, "Full-time", "indeed"),
    ("Data Engineer", "Netflix", "Los Gatos, CA", 160000, 220000, "Full-time", "linkedin"),
    ("ML Engineer", "OpenAI", "San Francisco, CA", 200000, 300000, "Full-time", "glassdoor"),
    ("Software Engineer II", "Microsoft", "Redmond, WA", 140000, 190000, "Full-time", "linkedin"),
    ("Platform Engineer", "Databricks", "Remote", 165000, 225000, "Full-time", "indeed"),
    ("Frontend Engineer", "Figma", "San Francisco, CA", 155000, 210000, "Full-time", "linkedin"),
    ("DevOps Engineer", "Cloudflare", "Austin, TX", 145000, 195000, "Full-time", "glassdoor"),
    ("Backend Engineer", "Plaid", "Remote", 160000, 215000, "Full-time", "indeed"),
    ("Senior Data Scientist", "Spotify", "New York, NY", 170000, 230000, "Full-time", "linkedin"),
    ("Software Engineer", "Coinbase", "Remote", 150000, 200000, "Full-time", "indeed"),
    ("Infrastructure Engineer", "Meta", "Menlo Park, CA", 175000, 240000, "Full-time", "linkedin"),
    ("API Engineer", "Twilio", "Remote", 140000, 185000, "Full-time", "glassdoor"),
    ("Product Engineer", "Vercel", "Remote", 155000, 205000, "Full-time", "linkedin"),
    ("Systems Engineer", "Apple", "Cupertino, CA", 165000, 225000, "Full-time", "linkedin"),
    ("Cloud Engineer", "Snowflake", "San Mateo, CA", 160000, 220000, "Full-time", "indeed"),
    ("Fullstack Engineer", "Notion", "San Francisco, CA", 150000, 200000, "Full-time", "linkedin"),
    ("Software Engineer", "Anthropic", "San Francisco, CA", 180000, 260000, "Full-time", "glassdoor"),
    ("Backend Developer", "Shopify", "Remote", 140000, 190000, "Full-time", "indeed"),
    ("Data Platform Engineer", "Uber", "San Francisco, CA", 165000, 225000, "Full-time", "linkedin"),
    ("SRE Engineer", "Discord", "San Francisco, CA", 155000, 210000, "Full-time", "glassdoor"),
    ("Software Engineer III", "Amazon", "Seattle, WA", 160000, 230000, "Full-time", "linkedin"),
    ("Rust Engineer", "1Password", "Remote", 150000, 200000, "Full-time", "indeed"),
    ("AI Engineer", "Scale AI", "San Francisco, CA", 175000, 245000, "Full-time", "linkedin"),
]

STATUSES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"]

APPLICATIONS = [
    (0, "REJECTED"),
    (1, "INTERVIEW"),
    (2, "APPLIED"),
    (3, "SCREENING"),
    (4, "OFFER"),
    (5, "REJECTED"),
    (6, "INTERVIEW"),
    (7, "APPLIED"),
    (8, "REJECTED"),
    (9, "SCREENING"),
    (10, "INTERVIEW"),
    (11, "REJECTED"),
    (12, "APPLIED"),
    (13, "APPLIED"),
    (14, "SCREENING"),
    (15, "REJECTED"),
    (16, "INTERVIEW"),
    (17, "OFFER"),
    (18, "SCREENING"),
    (19, "APPLIED"),
    (20, "REJECTED"),
    (21, "APPLIED"),
    (22, "INTERVIEW"),
    (23, "APPLIED"),
    (24, "SCREENING"),
]

REJECTION_SUBJECTS = [
    "Update on your application at {}",
    "Your application to {} — next steps",
    "Thank you for your interest in {}",
    "Application Status Update — {}",
]

INTERVIEW_SUBJECTS = [
    "Interview Invitation — {} {}",
    "Next steps: Interview with {} for {}",
    "Schedule your interview — {}",
]

REJECTION_SNIPPETS = [
    "After careful review, we've decided to move forward with other candidates whose experience more closely matches our current needs.",
    "We appreciate your interest. Unfortunately, we will not be moving forward with your application at this time.",
    "Thank you for taking the time to apply. We have decided to pursue other candidates for this position.",
]

INTERVIEW_SNIPPETS = [
    "We were impressed with your background and would love to schedule a technical interview. Please use the link below to book a time.",
    "Congratulations! We'd like to invite you to the next round. Please let us know your availability for a 60-minute virtual interview.",
    "We're excited to move forward with your application. Our team would like to schedule a video call to discuss the role further.",
]

SCREENING_SNIPPETS = [
    "Your application has been reviewed by our recruiting team and is being evaluated for the next stage.",
    "We're currently reviewing your application materials. A recruiter will be in touch shortly.",
]


def seed():
    token = os.environ.get("DATABRICKS_TOKEN")
    if not token:
        raise RuntimeError("Set DATABRICKS_TOKEN environment variable")

    with sql.connect(
        server_hostname=DATABRICKS_HOST,
        http_path=DATABRICKS_HTTP_PATH,
        access_token=token,
    ) as conn:
        with conn.cursor() as cursor:
            # Clear existing seed data
            for table in ["jobpilot_emails", "jobpilot_status_history", "jobpilot_applications", "jobpilot_jobs"]:
                cursor.execute(f"DELETE FROM {table}")

            now = datetime.now()
            job_ids = []
            app_ids = []

            # Insert jobs
            print("Seeding jobs...")
            for i, (title, company, loc, sal_min, sal_max, jtype, platform) in enumerate(JOBS):
                jid = str(uuid.uuid4())
                job_ids.append(jid)
                posted = (now - timedelta(days=30 - i)).strftime("%Y-%m-%d")
                scraped = (now - timedelta(days=25 - i)).strftime("%Y-%m-%d %H:%M:%S")
                desc = f"We are looking for a {title} to join our team at {company}. This is a {jtype} role based in {loc}."
                cursor.execute(
                    """INSERT INTO jobpilot_jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    [jid, title, company, loc, sal_min, sal_max, jtype, platform,
                     f"https://{platform}.com/jobs/{jid[:8]}", desc, posted, scraped],
                )

            # Insert applications
            print("Seeding applications...")
            for job_idx, status in APPLICATIONS:
                aid = str(uuid.uuid4())
                app_ids.append((aid, job_idx, status))
                applied = (now - timedelta(days=20 - job_idx)).strftime("%Y-%m-%d %H:%M:%S")
                updated = (now - timedelta(days=max(0, 10 - job_idx))).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute(
                    """INSERT INTO jobpilot_applications VALUES (?, ?, ?, ?, ?, ?)""",
                    [aid, job_ids[job_idx], status, applied, updated, ""],
                )

            # Insert status history and emails
            print("Seeding status history and emails...")
            for aid, job_idx, status in app_ids:
                company = JOBS[job_idx][1]
                title = JOBS[job_idx][0]

                if status == "REJECTED":
                    subj = REJECTION_SUBJECTS[job_idx % len(REJECTION_SUBJECTS)].format(company)
                    snippet = REJECTION_SNIPPETS[job_idx % len(REJECTION_SNIPPETS)]
                    classification = "REJECTED"
                    confidence = 0.95
                elif status == "INTERVIEW":
                    subj = INTERVIEW_SUBJECTS[job_idx % len(INTERVIEW_SUBJECTS)].format(company, title)
                    snippet = INTERVIEW_SNIPPETS[job_idx % len(INTERVIEW_SNIPPETS)]
                    classification = "INTERVIEW"
                    confidence = 0.92
                elif status == "SCREENING":
                    subj = f"Application Update — {company}"
                    snippet = SCREENING_SNIPPETS[job_idx % len(SCREENING_SNIPPETS)]
                    classification = "SCREENING"
                    confidence = 0.88
                elif status == "OFFER":
                    subj = f"Offer Letter — {company} {title}"
                    snippet = f"We are delighted to extend an offer for the {title} position. Please review the attached offer letter."
                    classification = "OFFER"
                    confidence = 0.97
                else:
                    subj = f"Application Received — {company}"
                    snippet = f"Thank you for applying to the {title} role at {company}. We will review your application and get back to you."
                    classification = "APPLIED"
                    confidence = 0.90

                # Status history
                changed = (now - timedelta(days=max(0, 10 - job_idx))).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute(
                    """INSERT INTO jobpilot_status_history VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    [str(uuid.uuid4()), aid, "APPLIED", status, changed, subj, snippet[:200]],
                )

                # Email record
                sender = f"recruiting@{company.lower().replace(' ', '')}.com"
                received = changed
                cursor.execute(
                    """INSERT INTO jobpilot_emails VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    [str(uuid.uuid4()), aid, sender, subj, snippet[:300], received, classification, confidence],
                )

            print(f"\nSeeded: {len(JOBS)} jobs, {len(APPLICATIONS)} applications, "
                  f"{len(app_ids)} status changes, {len(app_ids)} emails")
            print("Done!")


if __name__ == "__main__":
    seed()
