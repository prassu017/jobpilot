"""Seed JobPilot tables via Databricks REST API."""
import os
import uuid
import requests
import json
from datetime import datetime, timedelta

HOST = "https://dbc-3b10530b-465d.cloud.databricks.com"
TOKEN = os.environ.get("DATABRICKS_TOKEN")
WH = "b6be6c7afc2178b5"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def run_sql(stmt):
    r = requests.post(
        f"{HOST}/api/2.0/sql/statements",
        headers=H,
        json={"warehouse_id": WH, "statement": stmt, "wait_timeout": "30s"},
    )
    data = r.json()
    state = data.get("status", {}).get("state", "UNKNOWN")
    if state != "SUCCEEDED":
        print(f"FAILED: {json.dumps(data.get('status', {}))[:300]}")
        print(f"  SQL: {stmt[:200]}")
    return state == "SUCCEEDED"


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

APPS = [
    (0, "REJECTED"), (1, "INTERVIEW"), (2, "APPLIED"), (3, "SCREENING"),
    (4, "OFFER"), (5, "REJECTED"), (6, "INTERVIEW"), (7, "APPLIED"),
    (8, "REJECTED"), (9, "SCREENING"), (10, "INTERVIEW"), (11, "REJECTED"),
    (12, "APPLIED"), (13, "APPLIED"), (14, "SCREENING"), (15, "REJECTED"),
    (16, "INTERVIEW"), (17, "OFFER"), (18, "SCREENING"), (19, "APPLIED"),
    (20, "REJECTED"), (21, "APPLIED"), (22, "INTERVIEW"), (23, "APPLIED"),
    (24, "SCREENING"),
]


def esc(s):
    return s.replace("'", "''")


def seed():
    now = datetime.now()

    # Clear tables
    for t in ["jobpilot_emails", "jobpilot_status_history", "jobpilot_applications", "jobpilot_jobs"]:
        run_sql(f"DELETE FROM default.{t}")
        print(f"Cleared {t}")

    # Batch insert jobs
    job_ids = []
    values = []
    for i, (title, company, loc, sal_min, sal_max, jtype, platform) in enumerate(JOBS):
        jid = str(uuid.uuid4())
        job_ids.append(jid)
        posted = (now - timedelta(days=30 - i)).strftime("%Y-%m-%d")
        scraped = (now - timedelta(days=25 - i)).strftime("%Y-%m-%d %H:%M:%S")
        desc = esc(f"We are looking for a {title} to join our team at {company}.")
        values.append(
            f"('{jid}', '{esc(title)}', '{esc(company)}', '{esc(loc)}', {sal_min}, {sal_max}, "
            f"'{jtype}', '{platform}', 'https://{platform}.com/jobs/{jid[:8]}', '{desc}', "
            f"'{posted}', '{scraped}')"
        )

    sql = f"INSERT INTO default.jobpilot_jobs VALUES {', '.join(values)}"
    if run_sql(sql):
        print(f"Inserted {len(JOBS)} jobs")

    # Insert applications + history + emails
    app_values = []
    hist_values = []
    email_values = []

    for job_idx, status in APPS:
        aid = str(uuid.uuid4())
        company = JOBS[job_idx][1]
        title = JOBS[job_idx][0]
        applied = (now - timedelta(days=20 - job_idx)).strftime("%Y-%m-%d %H:%M:%S")
        updated = (now - timedelta(days=max(0, 10 - job_idx))).strftime("%Y-%m-%d %H:%M:%S")

        app_values.append(
            f"('{aid}', '{job_ids[job_idx]}', '{status}', '{applied}', '{updated}', '')"
        )

        # Email details by status
        if status == "REJECTED":
            subj = esc(f"Update on your application at {company}")
            snippet = esc("After careful review, we have decided to move forward with other candidates.")
            conf = 0.95
        elif status == "INTERVIEW":
            subj = esc(f"Interview Invitation - {company} {title}")
            snippet = esc("We were impressed with your background and would love to schedule an interview.")
            conf = 0.92
        elif status == "SCREENING":
            subj = esc(f"Application Update - {company}")
            snippet = esc("Your application has been reviewed and is being evaluated for the next stage.")
            conf = 0.88
        elif status == "OFFER":
            subj = esc(f"Offer Letter - {company} {title}")
            snippet = esc(f"We are delighted to extend an offer for the {title} position.")
            conf = 0.97
        else:
            subj = esc(f"Application Received - {company}")
            snippet = esc(f"Thank you for applying to the {title} role at {company}.")
            conf = 0.90

        changed = updated
        hid = str(uuid.uuid4())
        hist_values.append(
            f"('{hid}', '{aid}', 'APPLIED', '{status}', '{changed}', '{subj}', '{snippet}')"
        )

        eid = str(uuid.uuid4())
        sender = f"recruiting@{company.lower().replace(' ', '')}.com"
        email_values.append(
            f"('{eid}', '{aid}', '{sender}', '{subj}', '{snippet}', '{changed}', '{status}', {conf})"
        )

    sql = f"INSERT INTO default.jobpilot_applications VALUES {', '.join(app_values)}"
    if run_sql(sql):
        print(f"Inserted {len(APPS)} applications")

    sql = f"INSERT INTO default.jobpilot_status_history VALUES {', '.join(hist_values)}"
    if run_sql(sql):
        print(f"Inserted {len(hist_values)} status history records")

    sql = f"INSERT INTO default.jobpilot_emails VALUES {', '.join(email_values)}"
    if run_sql(sql):
        print(f"Inserted {len(email_values)} emails")

    # Verify counts
    for t in ["jobpilot_jobs", "jobpilot_applications", "jobpilot_status_history", "jobpilot_emails"]:
        r = requests.post(f"{HOST}/api/2.0/sql/statements", headers=H,
                          json={"warehouse_id": WH, "statement": f"SELECT COUNT(*) FROM default.{t}", "wait_timeout": "30s"})
        data = r.json()
        count = data.get("result", {}).get("data_array", [[0]])[0][0]
        print(f"  {t}: {count} rows")

    print("\nSeed complete!")


if __name__ == "__main__":
    seed()
