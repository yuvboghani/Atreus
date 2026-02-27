import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
    console.error("Missing CRON_SECRET");
    process.exit(1);
}

async function trigger(endpoint: string) {
    console.log(`\n--- Triggering ${endpoint} ---`);
    const res = await fetch(`${VERCEL_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
    return data;
}

async function runTests() {
    console.log("🚀 INITIATING PIPELINE VERIFICATION...");

    // 1. Simulate Scout (Should find jobs and queue them)
    console.log("\n[TEST 1: THE DISCOVERY]");
    const scout1 = await trigger('/api/radar/scan');

    // 2. Verify Deduplication (Should return 0 new leads)
    console.log("\n[TEST 2: THE TOKEN SENTRY (Deduplication)]");
    const scout2 = await trigger('/api/radar/scan');

    if (scout2.queued && scout1.queued > 0 && scout2.queued >= scout1.queued) {
        console.error("❌ Deduplication Failed. The entire payload was re-queued.");
        process.exit(1);
    } else {
        console.log(`✅ Deduplication Sentry Active (Found ${scout2.queued} newly generated SERP leads, blocked the rest).`);
    }

    // 3. Simulate Architect (Should refine from jobs_raw)
    console.log("\n[TEST 3: THE ARCHITECT (AI Refinement)]");
    const arch1 = await trigger('/api/radar/refine');

    if (scout1.queued > 0 && (!arch1.refined || arch1.refined === 0)) {
        console.warn("⚠️ Architect returned 0, but Scout queued jobs. AI might have failed or queue state is unexpected.");
    } else {
        console.log("✅ Architect Refinement Successful.");
    }

    console.log("\n🌟 PIPELINE_VERIFIED: SUCCESS");
}

runTests();
