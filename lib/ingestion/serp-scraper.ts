
const ATS_DOMAINS = [
    // Major ATS Platforms
    "site:boards.greenhouse.io",
    "site:jobs.lever.co",
    "site:jobs.ashbyhq.com",
    "site:myworkdayjobs.com",
    "site:smartrecruiters.com",
    "site:apply.workable.com",
    "site:breezy.hr",
    "site:applytojob.com",       // JazzHR
    "site:jobs.jobvite.com",
    "site:jobs.icims.com",
    "site:careers.recruitee.com",
    "site:pinpointhq.com",
    "site:teamtailor.com",
    "site:bamboohr.com/careers",
    "site:rippling-ats.com",
    "site:recruiting.paylocity.com",
    "site:workforcenow.adp.com",

    // Niche / Startup ATS
    "site:wellfound.com/jobs",
    "site:workatastartup.com",   // YC
    "site:notion.site",
    "site:builtin.com",
    "site:app.dover.com/apply",
    "site:homerun.co",
    "site:careerpuck.com",

    // Enterprise / Legacy ATS
    "site:oraclecloud.com",
    "site:jobs.talentreef.com",
    "site:hire.trakstar.com",
    "site:catsone.com/careers",

    // Custom Subdomain Catch-alls
    "inurl:jobs",
    "inurl:careers",
    "inurl:people",
    "inurl:talent"
];

const BATCH_SIZE = 5;

export interface SerpJob {
    title: string;
    link: string;
    snippet: string;
    source: string;
    date: string;
}

/**
 * Run a single Serper query for a batch of
 * ATS domain operators + the user's search term.
 */
async function fetchSerperBatch(
    domainBatch: string[],
    query: string
): Promise<SerpJob[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return [];

    const domainQuery = domainBatch.join(" OR ");
    const fullQuery = `(${domainQuery}) ${query}`;

    try {
        const response = await fetch(
            "https://google.serper.dev/search",
            {
                method: "POST",
                headers: {
                    "X-API-KEY": apiKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    q: fullQuery,
                    tbs: "qdr:d", // Past 24 hours
                    num: 10
                })
            }
        );

        if (!response.ok) {
            const errBody = await response.text()
                .catch(() => 'no body');
            console.warn(
                `[SERP] Batch failed: ${response.status}`
                + ` | Query: ${fullQuery.substring(0, 60)}`
                + ` | Body: ${errBody.substring(0, 200)}`
            );
            return [];
        }

        const data = await response.json();

        if (!data.organic || !Array.isArray(data.organic))
            return [];

        return data.organic.map((r: any) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
            source: 'google_serp',
            date: r.date || 'Today'
        }));

    } catch (error) {
        console.error("[SERP] Batch error:", error);
        return [];
    }
}

/**
 * Fetch Google Jobs across ALL ATS domains,
 * batched into chunks of 5 to stay within
 * Google's query term limits. Runs in parallel.
 */
export async function fetchGoogleJobs(
    query: string = "Software Engineer"
): Promise<SerpJob[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        console.error(
            "[RADAR] SCAN_FAILED: MISSING_INTEL_KEY"
        );
        return [];
    }

    // Chunk domains into batches of BATCH_SIZE
    const batches: string[][] = [];
    for (let i = 0; i < ATS_DOMAINS.length; i += BATCH_SIZE) {
        batches.push(
            ATS_DOMAINS.slice(i, i + BATCH_SIZE)
        );
    }

    console.log(
        `[SERP] Launching ${batches.length} batches `
        + `(${ATS_DOMAINS.length} domains, `
        + `${BATCH_SIZE}/batch)...`
    );

    // Run all batches in parallel
    const results = await Promise.all(
        batches.map(batch =>
            fetchSerperBatch(batch, query)
        )
    );

    // Flatten + deduplicate by URL
    const seen = new Set<string>();
    const allJobs: SerpJob[] = [];

    for (const batch of results) {
        for (const job of batch) {
            if (!seen.has(job.link)) {
                seen.add(job.link);
                allJobs.push(job);
            }
        }
    }

    console.log(
        `[SERP] ${allJobs.length} unique results `
        + `from ${batches.length} batches.`
    );

    return allJobs;
}
