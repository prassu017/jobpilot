import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || !url.includes("linkedin.com")) {
      return NextResponse.json({ error: "Invalid LinkedIn URL" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const html = await res.text();

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    let profileData = "";

    if (jsonLdMatch) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        const parts: string[] = [];
        if (ld.name) parts.push(`Name: ${ld.name}`);
        if (ld.jobTitle) parts.push(`Title: ${ld.jobTitle}`);
        if (ld.description) parts.push(`Summary: ${ld.description}`);
        if (ld.worksFor) {
          const org = Array.isArray(ld.worksFor) ? ld.worksFor[0] : ld.worksFor;
          if (org?.name) parts.push(`Company: ${org.name}`);
        }
        if (ld.alumniOf) {
          const schools = Array.isArray(ld.alumniOf) ? ld.alumniOf : [ld.alumniOf];
          parts.push(`Education: ${schools.map((s: any) => s.name).filter(Boolean).join(", ")}`);
        }
        if (ld.address) {
          const addr = ld.address;
          parts.push(`Location: ${addr.addressLocality || ""} ${addr.addressRegion || ""} ${addr.addressCountry || ""}`);
        }
        profileData = parts.join("\n");
      } catch {}
    }

    if (!profileData) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"/i) ||
                        html.match(/<meta\s+content="(.*?)"\s+name="description"/i);
      const parts: string[] = [];
      if (titleMatch) parts.push(`Profile: ${titleMatch[1].replace(/ \| LinkedIn$/, "")}`);
      if (descMatch) parts.push(`About: ${descMatch[1]}`);
      profileData = parts.join("\n") || "Could not extract detailed profile data. LinkedIn URL saved for reference: " + url;
    }

    return NextResponse.json({ profileData });
  } catch (e) {
    return NextResponse.json({
      profileData: "LinkedIn URL noted but could not scrape profile data. URL: " + (await req.text().catch(() => "unknown")),
    });
  }
}
