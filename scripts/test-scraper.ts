import 'dotenv/config';
import { scrapeJobPage } from '../lib/utils/scraper'; // Adjusted import

const testURLs = [
  // 1. Easy ATS
  "https://boards.greenhouse.io/discord/jobs/8468739002",
  // 2. High-Security Enterprise (Workday)
  "https://lexisnexis.wd3.myworkdayjobs.com/en-US/LexisNexis_Careers/job/Software-Engineer-II",
  // 3. Medium Security (Lever)
  "https://jobs.lever.co/netflix/12345678", 
  // 4. Custom Startup ATS
  "https://jobs.ashbyhq.com/notion/1234"
];

async function runDiagnostics() {
  console.log("🕵️ Starting ATS Extraction Diagnostics...\n");

  for (const url of testURLs) {
    console.log(`--------------------------------------------------`);
    console.log(`📡 Fetching: ${url}`);
    
    try {
      const startTime = Date.now();
      const markdown = await scrapeJobPage(url); 
      const duration = Date.now() - startTime;

      if (!markdown || markdown.trim().length === 0) {
        console.log(`❌ FAILED: Returned empty string. (${duration}ms)`);
        continue;
      }

      console.log(`✅ SUCCESS: Extracted ${markdown.length} chars in ${duration}ms.`);
      console.log(`📄 PREVIEW: ${markdown.substring(0, 150).replace(/\n/g, ' ')}...\n`);
      
      if (markdown.toLowerCase().includes('cloudflare') || 
          markdown.toLowerCase().includes('human')) {
         console.log(`🚨 WARNING: Caught by Bot Protection!`);
      }

    } catch (error: any) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  console.log(`🏁 Diagnostics Complete.`);
}

runDiagnostics();
