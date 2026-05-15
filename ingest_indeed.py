"""Ingest real Indeed jobs into Databricks via REST API.
Run this script to populate the database with real job listings.
"""
import os
import uuid
import re
import requests
import json
from datetime import datetime

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
    return state == "SUCCEEDED"


def esc(s):
    return s.replace("'", "''") if s else ""


def parse_salary(comp_str):
    if not comp_str or comp_str == "N/A":
        return None, None
    numbers = re.findall(r'[\d,]+(?:\.\d+)?', comp_str)
    if len(numbers) >= 2:
        return int(float(numbers[0].replace(',', ''))), int(float(numbers[1].replace(',', '')))
    elif len(numbers) == 1:
        val = int(float(numbers[0].replace(',', '')))
        return val, val
    return None, None


def parse_indeed_results(raw_text):
    jobs = []
    blocks = raw_text.split("**Job Title:**")
    for block in blocks[1:]:
        lines = block.strip().split("\n")
        job = {}
        job["title"] = lines[0].strip()
        for line in lines:
            line = line.strip()
            if line.startswith("**Job Id:**"):
                job["job_id"] = line.replace("**Job Id:**", "").strip()
            elif line.startswith("**Company:**"):
                job["company"] = line.replace("**Company:**", "").strip()
            elif line.startswith("**Location:**"):
                job["location"] = line.replace("**Location:**", "").strip()
            elif line.startswith("**Compensation:**"):
                comp = line.replace("**Compensation:**", "").strip()
                job["salary_min"], job["salary_max"] = parse_salary(comp)
            elif line.startswith("**Job Type:**"):
                job["job_type"] = line.replace("**Job Type:**", "").strip()
            elif line.startswith("**View Job URL:**"):
                job["url"] = line.replace("**View Job URL:**", "").strip()
            elif line.startswith("**Posted on:**"):
                job["posted_date"] = line.replace("**Posted on:**", "").strip()
        jobs.append(job)
    return jobs


INDEED_JOBS = []

# These are the real jobs fetched from Indeed MCP
RAW_RESULTS = [
    # Software Engineer - Seattle
    {
        "title": "Software Engineer", "company": "Allied Telesis", "location": "Everett, WA",
        "salary_min": 100000, "salary_max": 140000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aamfcwkgfjkn", "posted_date": "2026-03-30",
    },
    {
        "title": "Embedded Software Engineer", "company": "American IT Systems", "location": "Redmond, WA",
        "salary_min": 100000, "salary_max": 140000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aafs7n48n897", "posted_date": "2026-05-14",
    },
    {
        "title": "Engineer 1 - Customer Experience Platform", "company": "Nordstrom", "location": "Seattle, WA",
        "salary_min": 104500, "salary_max": 162500, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aamgydfsryn2", "posted_date": "2026-05-14",
    },
    {
        "title": "Software Engineer", "company": "Amazon.com", "location": "Seattle, WA",
        "salary_min": 99500, "salary_max": 200000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aakl4m4nrkgv", "posted_date": "2026-04-21",
    },
    {
        "title": "Early Career Software Engineer", "company": "Anduril", "location": "Seattle, WA",
        "salary_min": 130000, "salary_max": 135000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aahmzgwcvvcn", "posted_date": "2026-05-14",
    },
    {
        "title": "Machine Learning Engineer", "company": "Orchard Robotics", "location": "Seattle, WA",
        "salary_min": 135000, "salary_max": 210000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aatcs2n2jk6c", "posted_date": "2026-03-13",
    },
    {
        "title": "iOS Mobile Software Developer II", "company": "Rocket", "location": "Seattle, WA",
        "salary_min": 139100, "salary_max": 170100, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aahdhjtkl7cj", "posted_date": "2026-05-02",
    },
    # Data Engineer - Remote
    {
        "title": "Data Engineer", "company": "Data Ideology", "location": "Remote",
        "salary_min": 100000, "salary_max": 140000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aagkyxfgxsfy", "posted_date": "2026-05-04",
    },
    {
        "title": "Data Engineer", "company": "OC Business Finder", "location": "Remote",
        "salary_min": 90000, "salary_max": 120000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aapsmsmcp6kf", "posted_date": "2026-05-14",
    },
    {
        "title": "Data Engineer", "company": "mSupply", "location": "Remote",
        "salary_min": 95000, "salary_max": 130000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aax9qjnbmhvf", "posted_date": "2026-05-05",
    },
    # ML/AI - San Francisco
    {
        "title": "Forward Deployed Engineer - Databricks", "company": "Deloitte", "location": "San Francisco, CA",
        "salary_min": 113100, "salary_max": 208300, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aaz8qkh7vtdf", "posted_date": "2026-04-10",
    },
    {
        "title": "AI Engineer Senior Consultant", "company": "Deloitte", "location": "San Francisco, CA",
        "salary_min": 113100, "salary_max": 208300, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aakg4lpr4nwz", "posted_date": "2026-04-25",
    },
    {
        "title": "Staff Software Engineer", "company": "Gravity", "location": "San Francisco, CA",
        "salary_min": 200000, "salary_max": 300000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aayvlswxjx9c", "posted_date": "2026-05-11",
    },
    {
        "title": "Associate Machine Learning Engineer", "company": "Handshake", "location": "San Francisco, CA",
        "salary_min": 115000, "salary_max": 144000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aam4zsc8zzx7", "posted_date": "2026-04-02",
    },
    {
        "title": "Machine Learning Engineer I", "company": "Handshake", "location": "San Francisco, CA",
        "salary_min": 151000, "salary_max": 189000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aapn4dwmf24d", "posted_date": "2026-04-06",
    },
    {
        "title": "ML Engineer, Data Pipeline", "company": "Stand Insurance", "location": "San Francisco, CA",
        "salary_min": 185000, "salary_max": 235000, "job_type": "Full-time", "platform": "indeed",
        "url": "https://to.indeed.com/aa4lkqczrvyh", "posted_date": "2026-04-25",
    },
]


def ingest():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    values = []
    for j in RAW_RESULTS:
        jid = str(uuid.uuid4())
        sal_min = j.get("salary_min") or 0
        sal_max = j.get("salary_max") or 0
        desc = esc(f"Real job listing from Indeed for {j['title']} at {j['company']}.")
        values.append(
            f"('{jid}', '{esc(j['title'])}', '{esc(j['company'])}', '{esc(j['location'])}', "
            f"{sal_min}, {sal_max}, '{esc(j['job_type'])}', 'indeed', "
            f"'{esc(j['url'])}', '{desc}', '{j['posted_date']}', '{now}')"
        )

    sql = f"INSERT INTO default.jobpilot_jobs VALUES {', '.join(values)}"
    if run_sql(sql):
        print(f"Inserted {len(RAW_RESULTS)} real Indeed jobs")

    # Verify
    r = requests.post(f"{HOST}/api/2.0/sql/statements", headers=H,
                      json={"warehouse_id": WH, "statement": "SELECT COUNT(*) FROM default.jobpilot_jobs", "wait_timeout": "30s"})
    data = r.json()
    count = data.get("result", {}).get("data_array", [[0]])[0][0]
    print(f"Total jobs in database: {count}")


if __name__ == "__main__":
    ingest()
