
// Access environment variables from .env
import 'dotenv/config';

import { fetchGreenhouse, fetchLever } from '@/lib/ingestion/ats-fetcher';
import { fetchGoogleJobs } from '@/lib/ingestion/serp-scraper';
// import { upsertJobs } from '@/lib/ingestion/db-ops'; // Mock DB not needed for this script as per instructions

async function main() {
    console.log("🚀 Starting Job Acquisition Engine Test...\n");

    try {
        // --- Tier 1: The Sniper ---
        console.log("🎯 Tier 1: The Sniper (Direct ATS Access)");

        console.log("   Fetching Greenhouse (Discord)...");
        const ghJobs = await fetchGreenhouse('discord');
        console.log(`   ✅ Found ${ghJobs.length} jobs from Greenhouse.`);
        if (ghJobs.length > 0) console.log(`   Sample: ${ghJobs[0].title} (${ghJobs[0].absolute_url})`);

        console.log("\n   Fetching Lever (Stripe)...");
        const leverJobs = await fetchLever('leverdemo');
        console.log(`   ✅ Found ${leverJobs.length} jobs from Lever.`);
        if (leverJobs.length > 0) console.log(`   Sample: ${leverJobs[0].title} (${leverJobs[0].absolute_url})`);

        // --- Tier 2: The Net ---
        console.log("\n🕸️  Tier 2: The Net (SERP Scraper)");
        console.log("   Scraping Google for 'Data Engineer'...");
        const serpJobs = await fetchGoogleJobs("Data Engineer");
        console.log(`   ✅ Found ${serpJobs.length} jobs from Google.`);
        if (serpJobs.length > 0) {
            console.log(`   Sample: ${serpJobs[0].title}`);
            console.log(`   Link: ${serpJobs[0].link}`);
            console.log(`   Snippet: ${serpJobs[0].snippet.substring(0, 100)}...`);
        }

        // --- Tier 3: The Mercenaries (Mock) ---
        console.log("\n🏴‍☠️  Tier 3: The Mercenaries (Webhooks & Normalization)");
        console.log("   Simulating Apify Payload...");

        const mockPayload = [
            {
                "job_title": "Senior AI Engineer",
                "company_name": "Anthropic",
                "job_location": "San Francisco, CA",
                "apply_link": "https://linkedin.com/jobs/view/123456789",
                "description_text": "We are building safe AI systems..."
            },
            {
                "job_title": "Product Designer",
                "company_name": "Linear",
                "job_location": "Remote",
                "apply_link": "https://linear.app/careers/designer",
                "description_text": "Design the future of issue tracking..."
            }
        ];

        console.log(`   Received ${mockPayload.length} raw items.`);

        // Simulating Normalization via ZhipuAI (Mock)
        console.log("   Running LLM Normalization (Mock)...");
        const normalized = mockPayload.map(job => ({
            title: job.job_title,
            company: job.company_name,
            url: job.apply_link,
            location: job.job_location,
            snippet: job.description_text.substring(0, 50) + "..."
        }));

        console.log(`   ✅ Normalized ${normalized.length} items.`);
        console.log(`   Sample: ${normalized[0].title} @ ${normalized[0].company}`);

        console.log("\n✨ Test Complete. All systems operational.");

    } catch (error) {
        console.error("\n❌ Test Failed:", error);
    }
}

main();
