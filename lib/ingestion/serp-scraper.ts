
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

    // Custom Subdomain Catch-alls (with noise filter)
    "inurl:jobs -site:reddit.com -site:substack.com -site:.edu -site:.gov -site:medium.com -site:quora.com",
    "inurl:careers -site:reddit.com -site:substack.com -site:.edu -site:.gov -site:medium.com -site:quora.com",
    "inurl:people -site:reddit.com -site:substack.com -site:.edu -site:.gov -site:medium.com -site:quora.com",
    "inurl:talent -site:reddit.com -site:substack.com -site:.edu -site:.gov -site:medium.com -site:quora.com"
];

const MAX_PAGES = 5;
const CONCURRENCY = 3;
const PAGE_DELAY_MS = 500;

export interface SerpJob {
    title: string;
    link: string;
    snippet: string;
    source: string;
    date: string;
}

/**
 * Fetch a single page of results for one
 * domain operator + search query.
 */
async function fetchPage(
    domainOp: string,
    query: string,
    page: number
): Promise<SerpJob[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return [];

    const fullQuery = `${domainOp} ${query}`;

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
                    tbs: "qdr:d",
                    num: 10,
                    page: page
                })
            }
        );

        if (!response.ok) {
            const errBody = await response.text()
                .catch(() => 'no body');
            console.warn(
                `[SERP] ${domainOp} p${page}: `
                + `${response.status} | `
                + `${errBody.substring(0, 120)}`
            );
            return [];
        }

        const data = await response.json();

        if (
            !data.organic
            || !Array.isArray(data.organic)
            || data.organic.length === 0
        ) {
            return [];
        }

        return data.organic.map((r: any) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
            source: 'google_serp',
            date: r.date || 'Today'
        }));

    } catch (error) {
        console.error(
            `[SERP] ${domainOp} p${page} error:`,
            error
        );
        return [];
    }
}

/**
 * Deep-paginate a single domain operator.
 * Fetches up to MAX_PAGES pages, stopping early
 * if a page returns 0 results.
 */
async function deepFetchDomain(
    domainOp: string,
    query: string
): Promise<SerpJob[]> {
    const allResults: SerpJob[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
        const results = await fetchPage(
            domainOp, query, page
        );

        if (results.length === 0) break;

        allResults.push(...results);

        // Brief delay between pages
        if (page < MAX_PAGES) {
            await new Promise(
                r => setTimeout(r, PAGE_DELAY_MS)
            );
        }
    }

    if (allResults.length > 0) {
        console.log(
            `[SERP] ${domainOp}: `
            + `${allResults.length} results`
        );
    }

    return allResults;
}

/**
 * Process domains in small concurrent batches.
 * Processes CONCURRENCY domains at a time to avoid
 * Serper rate limits while staying reasonably fast.
 */
async function processInBatches(
    domains: string[],
    query: string
): Promise<SerpJob[]> {
    const allResults: SerpJob[] = [];

    for (let i = 0; i < domains.length; i += CONCURRENCY) {
        const batch = domains.slice(i, i + CONCURRENCY);

        const batchResults = await Promise.all(
            batch.map(domain =>
                deepFetchDomain(domain, query)
            )
        );

        for (const results of batchResults) {
            allResults.push(...results);
        }
    }

    return allResults;
}

/**
 * Fetch Google Jobs across ALL ATS domains.
 * Each domain gets its own isolated query with
 * up to MAX_PAGES pages of pagination. Domains
 * are processed in batches of CONCURRENCY.
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

    console.log(
        `[SERP] Deep Scan: ${ATS_DOMAINS.length} `
        + `domains × ${MAX_PAGES} pages max `
        + `(concurrency: ${CONCURRENCY})`
    );

    const raw = await processInBatches(
        ATS_DOMAINS, query
    );

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique: SerpJob[] = [];

    for (const job of raw) {
        if (!seen.has(job.link)) {
            seen.add(job.link);
            unique.push(job);
        }
    }

    console.log(
        `[SERP] ${unique.length} unique results `
        + `(${raw.length} raw, `
        + `${raw.length - unique.length} dupes removed)`
    );

    return unique;
}
