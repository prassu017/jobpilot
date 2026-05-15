const HOST = "https://dbc-3b10530b-465d.cloud.databricks.com";
const TOKEN = process.env.DATABRICKS_TOKEN!;
const WAREHOUSE_ID = "b6be6c7afc2178b5";

export interface QueryResult {
  columns: { name: string; type_text: string }[];
  data: string[][];
}

export async function queryDatabricks(sql: string): Promise<QueryResult> {
  const res = await fetch(`${HOST}/api/2.0/sql/statements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement: sql,
      wait_timeout: "30s",
    }),
  });

  const data = await res.json();

  if (data.status?.state !== "SUCCEEDED") {
    throw new Error(
      `Query failed: ${data.status?.error?.message || data.status?.state}`
    );
  }

  return {
    columns: data.manifest?.schema?.columns || [],
    data: data.result?.data_array || [],
  };
}

export function rowsToObjects<T>(result: QueryResult): T[] {
  return result.data.map((row) => {
    const obj: Record<string, string> = {};
    result.columns.forEach((col, i) => {
      obj[col.name] = row[i];
    });
    return obj as unknown as T;
  });
}
