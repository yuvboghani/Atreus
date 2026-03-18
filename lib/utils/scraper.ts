import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/124.0.0.0 Safari/537.36';

// Priority-ordered ATS selectors
const ATS_SELECTORS = [
    '.job-description',
    '#job-details',
    '[data-automation-id="jobPostingDescription"]',
    '.job__description',
    '.posting-page',
    '#content',
    '.content-wrapper',
    'article',
    'main',
    'body'
];

// Domains that require headless browser
const BROWSER_DOMAINS = [
    'myworkdayjobs.com',
    'oraclecloud.com',
    'taleo.net'
];

const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
});

// Strip nav, footer, scripts, styles, aside
turndown.remove([
    'script', 'style', 'nav', 'footer',
    'header', 'iframe', 'noscript', 'aside'
]);

/**
 * Check if a URL requires headless browser.
 */
function needsBrowser(url: string): boolean {
    return BROWSER_DOMAINS.some(
        d => url.includes(d)
    );
}

/**
 * Standard fast Axios scraper for most ATS sites.
 */
async function scrapeWithAxios(
    url: string
): Promise<string | null> {
    const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': USER_AGENT },
        maxRedirects: 5,
        validateStatus: (s) => s < 400
    });

    const html = response.data;
    if (typeof html !== 'string') return null;

    return extractMarkdown(html);
}

/**
 * Headless browser scraper for enterprise ATS
 * (Workday, Oracle, Taleo) that block Axios.
 */
async function scrapeWithBrowser(
    url: string
): Promise<string | null> {
    let browser;
    try {
        const puppeteer = await import('puppeteer');
        browser = await puppeteer.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const html = await page.content();
        return extractMarkdown(html);

    } catch (err: any) {
        console.warn(
            `[SCRAPER] Browser failed: ${url}: `
            + `${err.message}`
        );
        return null;
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

/**
 * Extract Markdown from raw HTML using
 * ATS selectors + Turndown.
 */
function extractMarkdown(
    html: string
): string | null {
    const $ = cheerio.load(html);

    let contentHtml = '';
    for (const sel of ATS_SELECTORS) {
        const el = $(sel);
        if (
            el.length > 0
            && el.text().trim().length > 100
        ) {
            contentHtml = el.html() || '';
            break;
        }
    }

    if (!contentHtml || contentHtml.length < 50) {
        return null;
    }

    const markdown = turndown.turndown(contentHtml);

    // Cap at ~8000 chars for AI token budget
    return markdown.substring(0, 8000);
}

/**
 * Scrape a job page URL and return clean
 * Markdown. Routes to Puppeteer for enterprise
 * ATS, falls back from Axios → Puppeteer on
 * 403/500 errors.
 */
export async function scrapeJobPage(
    url: string
): Promise<string | null> {
    try {
        // Route enterprise ATS to browser
        if (needsBrowser(url)) {
            console.log(
                `[SCRAPER] Browser mode: `
                + `${url.substring(0, 60)}`
            );
            return await scrapeWithBrowser(url);
        }

        // Try fast Axios first
        const result = await scrapeWithAxios(url);
        if (result) {
            console.log(
                `[SCRAPER] Extracted `
                + `${result.length} chars: `
                + `${url.substring(0, 50)}`
            );
            return result;
        }

        return null;

    } catch (err: any) {
        // On 403/500, fallback to browser
        const status = err.response?.status;
        if (status === 403 || status === 500) {
            console.log(
                `[SCRAPER] Axios ${status}, `
                + `trying browser fallback...`
            );
            return await scrapeWithBrowser(url);
        }

        console.warn(
            `[SCRAPER] Failed: ${url}: `
            + `${err.message}`
        );
        return null;
    }
}
