const SEARCHES = [
  { query: "software engineer", location: "Seattle, WA" },
  { query: "software engineer", location: "San Francisco, CA" },
  { query: "software engineer", location: "New York, NY" },
  { query: "software engineer", location: "Austin, TX" },
  { query: "software engineer", location: "Remote" },
  { query: "data scientist", location: "Seattle, WA" },
  { query: "data scientist", location: "San Francisco, CA" },
  { query: "data scientist", location: "New York, NY" },
  { query: "data scientist", location: "Remote" },
  { query: "data engineer", location: "Seattle, WA" },
  { query: "data engineer", location: "San Francisco, CA" },
  { query: "data engineer", location: "New York, NY" },
  { query: "data engineer", location: "Remote" },
  { query: "machine learning engineer", location: "Seattle, WA" },
  { query: "machine learning engineer", location: "San Francisco, CA" },
  { query: "machine learning engineer", location: "New York, NY" },
  { query: "machine learning engineer", location: "Remote" },
  { query: "product manager", location: "Seattle, WA" },
  { query: "product manager", location: "San Francisco, CA" },
  { query: "product manager", location: "New York, NY" },
  { query: "product manager", location: "Remote" },
  { query: "frontend developer", location: "Seattle, WA" },
  { query: "frontend developer", location: "San Francisco, CA" },
  { query: "frontend developer", location: "Remote" },
  { query: "backend engineer", location: "Seattle, WA" },
  { query: "backend engineer", location: "San Francisco, CA" },
  { query: "backend engineer", location: "Remote" },
  { query: "full stack developer", location: "Seattle, WA" },
  { query: "full stack developer", location: "Remote" },
  { query: "devops engineer", location: "Seattle, WA" },
  { query: "devops engineer", location: "Remote" },
];

const BASE = "http://localhost:3000";

async function run() {
  let totalInserted = 0;

  for (const search of SEARCHES) {
    console.log(`\nScraping: "${search.query}" in ${search.location}...`);
    try {
      const res = await fetch(`${BASE}/api/scrape-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: search.query,
          location: search.location,
          sources: ["indeed", "linkedin"],
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.log(`  Found ${data.total_scraped} | New: ${data.total_new} | Inserted: ${data.total_inserted}`);
        totalInserted += data.total_inserted || 0;
      } else {
        console.log(`  Error: ${data.error}`);
      }
    } catch (e: any) {
      console.log(`  Failed: ${e.message}`);
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));

    if (totalInserted >= 1000) {
      console.log(`\nReached ${totalInserted} jobs. Stopping.`);
      break;
    }
  }

  console.log(`\nDone! Total inserted: ${totalInserted}`);
}

run();
