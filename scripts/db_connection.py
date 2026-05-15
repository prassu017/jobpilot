"""
Databricks SQL Warehouse connection helper.
Set DATABRICKS_TOKEN env var with your Personal Access Token before running.
"""
import os
from databricks import sql


DATABRICKS_HOST = "dbc-3b10530b-465d.cloud.databricks.com"
DATABRICKS_HTTP_PATH = "/sql/1.0/warehouses/b6be6c7afc2178b5"


def get_connection():
    token = os.environ.get("DATABRICKS_TOKEN")
    if not token:
        raise RuntimeError("Set DATABRICKS_TOKEN environment variable first")
    return sql.connect(
        server_hostname=DATABRICKS_HOST,
        http_path=DATABRICKS_HTTP_PATH,
        access_token=token,
    )


def test_connection():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 AS test")
            result = cursor.fetchone()
            print(f"Connection successful! Result: {result}")


if __name__ == "__main__":
    test_connection()
