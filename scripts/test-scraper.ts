import 'dotenv/config';
import { scrapeJobPage } from '../lib/utils/scraper';

const testURLs = [
    // 1. Greenhouse (Usually easy)
    "https://boards.greenhouse.io/discord/jobs/8468739002",
    
    // 2. Lever (Usually easy)
    "https://jobs.lever.co/netflix/12345678", // Replace with a real Lever URL if you have one
    
    // 3. Workday (Known to have heavy bot protection)
    "https://lexisnexis.wd3.myworkdayjobs.com/en-US/LexisNexis_Careers/job/Software-Engineer-II",
    
    // 4. Ashby or standard careers page
    "https://jobs.ashbyhq.com/notion/1234" 
];

async function runDiagnostics() {
    console.log("🕵️ Starting ATS Scraper Diagnostics...\n");

    for (const url of testURLs) {
        console.log(`\n--------------------------------------------------`);
        console.log(`📡 Fetching: ${url}`);
        
        try {
            const startTime = Date.now();
            const markdown = await scrapeJobPage(url);
            const duration = Date.now() - startTime;

            if (!markdown || markdown.trim().length === 0) {
                console.log(`❌ FAILED: Returned empty string. (${duration}ms)`);
                continue;
            }

            console.log(`✅ SUCCESS: Extracted ${markdown.length} characters in ${duration}ms.`);
            
            // Print the first 300 characters to verify it's a job description and not a Cloudflare warning
            console.log(`\n📄 PREVIEW:\n${markdown.substring(0, 300)}...\n`);
            
            if (markdown.includes('Cloudflare') || markdown.includes('human') || markdown.includes('Just a moment')) {
                 console.log(`🚨 WARNING: Caught by Bot Protection!`);
            }

        } catch (error: any) {
            console.log(`❌ ERROR: ${error.message}`);
        }
    }
    console.log(`\n🏁 Diagnostics Complete.`);
}

runDiagnostics();
