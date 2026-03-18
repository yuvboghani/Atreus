import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
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
 * Scrape a job page URL and return clean Markdown.
 * Returns null on any failure.
 */
export async function scrapeJobPage(
    url: string
): Promise<string | null> {
    try {
        const response = await axios.get(url, {
            timeout: 15000,
            headers: { 'User-Agent': USER_AGENT },
            maxRedirects: 5,
            validateStatus: (s) => s < 400
        });

        const html = response.data;
        if (typeof html !== 'string') return null;

        const $ = cheerio.load(html);

        // Try ATS selectors in priority order
        let contentHtml = '';
        for (const sel of ATS_SELECTORS) {
            const el = $(sel);
            if (el.length > 0 && el.text().trim().length > 100) {
                contentHtml = el.html() || '';
                break;
            }
        }

        if (!contentHtml || contentHtml.length < 50) {
            console.warn(`[SCRAPER] No content found: ${url}`);
            return null;
        }

        // Convert to Markdown
        const markdown = turndown.turndown(contentHtml);

        // Truncate to ~8000 chars to stay within AI token limits
        const trimmed = markdown.substring(0, 8000);

        console.log(
            `[SCRAPER] Extracted ${trimmed.length} chars from ${url}`
        );
        return trimmed;

    } catch (err: any) {
        console.warn(
            `[SCRAPER] Failed for ${url}: ${err.message}`
        );
        return null;
    }
}
