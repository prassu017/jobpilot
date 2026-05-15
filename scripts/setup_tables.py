"""Create JobPilot tables in Databricks SQL Warehouse."""
import os
from databricks import sql

DATABRICKS_HOST = "dbc-3b10530b-465d.cloud.databricks.com"
DATABRICKS_HTTP_PATH = "/sql/1.0/warehouses/b6be6c7afc2178b5"

TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS jobpilot_jobs (
        job_id STRING,
        title STRING,
        company STRING,
        location STRING,
        salary_min INT,
        salary_max INT,
        job_type STRING,
        platform STRING,
        url STRING,
        description STRING,
        posted_date DATE,
        scraped_at TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS jobpilot_applications (
        application_id STRING,
        job_id STRING,
        status STRING,
        applied_date TIMESTAMP,
        last_updated TIMESTAMP,
        notes STRING
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS jobpilot_status_history (
        history_id STRING,
        application_id STRING,
        old_status STRING,
        new_status STRING,
        changed_at TIMESTAMP,
        email_subject STRING,
        email_snippet STRING
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS jobpilot_emails (
        email_id STRING,
        application_id STRING,
        sender STRING,
        subject STRING,
        body_snippet STRING,
        received_at TIMESTAMP,
        classification STRING,
        confidence FLOAT
    )
    """,
]


def setup():
    token = os.environ.get("DATABRICKS_TOKEN")
    if not token:
        raise RuntimeError("Set DATABRICKS_TOKEN environment variable")

    with sql.connect(
        server_hostname=DATABRICKS_HOST,
        http_path=DATABRICKS_HTTP_PATH,
        access_token=token,
    ) as conn:
        with conn.cursor() as cursor:
            for ddl in TABLES_SQL:
                table_name = ddl.split("IF NOT EXISTS")[1].split("(")[0].strip()
                print(f"Creating {table_name}...")
                cursor.execute(ddl)
                print(f"  -> {table_name} ready")

            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print(f"\nAll tables: {[t[1] for t in tables]}")

    print("\nDatabase setup complete!")


if __name__ == "__main__":
    setup()
