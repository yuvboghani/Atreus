
const ATS_DOMAINS = [
    "site:boards.greenhouse.io", "site:jobs.lever.co", "site:jobs.ashbyhq.com",
    "site:myworkdayjobs.com", "site:smartrecruiters.com", "site:apply.workable.com",
    "site:breezy.hr", "site:applytojob.com", "site:jobs.jobvite.com",
    "site:jobs.icims.com", "site:careers.recruitee.com", "site:pinpointhq.com",
    "site:teamtailor.com", "site:bamboohr.com/careers", "site:rippling-ats.com",
    "site:recruiting.paylocity.com", "site:wellfound.com/jobs", "site:ycombinator.com/companies"
];

export interface SerpJob {
    title: string;
    link: string;
    snippet: string;
    source: string;
    date: string;
}

export async function fetchGoogleJobs(query: string = "Software Engineer"): Promise<SerpJob[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        console.error("SERPER_API_KEY is missing. Skipping SERP scrape.");
        return [];
    }

    // Construct query with ATS domains (chunked to avoid query length limits, but user asked for example logic)
    // We will use the first 5 domains for this implementation demo to keep query length sane.
    // In production, we'd loop through chunks.

    // User logic: "${atsDomains.slice(0, 3).join(" OR ")} "Data Scientist" OR "Software Engineer""
    // Let's implement a robust query builder.

    const domainQuery = ATS_DOMAINS.slice(0, 5).join(" OR ");
    const fullQuery = `(${domainQuery}) ${query}`;

    try {
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: fullQuery,
                tbs: "qdr:d", // Past 24 hours
                num: 10 // Fetch top 10 results
            })
        });

        if (!response.ok) {
            console.warn(`Serper API failed: ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (!data.organic || !Array.isArray(data.organic)) return [];

        return data.organic.map((result: any) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            source: 'google_serp',
            date: result.date || 'Today'
        }));

    } catch (error) {
        console.error("Error fetching Google Jobs via Serper:", error);
        return [];
    }
}
