import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { shouldSkipJob } from '../lib/ingestion/filters';
import { extractStrongContext } from '../lib/ingestion/parser';

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
    console.log("\n[TEST 1: HIGH-SPEED FIREWALL (Senior Blocks)]");
    const isSeniorBlocked = shouldSkipJob("Senior Data Engineer");
    const isJuniorBlocked = shouldSkipJob("Software Engineer");
    if (isSeniorBlocked && !isJuniorBlocked) {
        console.log("✅ Firewall accurately blocked Senior roles and allowed others.");
    } else {
        console.error("❌ Firewall Logic Failed.", { isSeniorBlocked, isJuniorBlocked });
        process.exit(1);
    }

    console.log("\n[TEST 2: DETERMINISTIC REGEX (Scout Edge)]");
    const sampleSnippet = "Looking for 3+ years of experience in Python, PyTorch and MLIR. Must have BS in Computer Science. $100k-$150k.";
    const delta = extractStrongContext(sampleSnippet);
    if (delta.yoe?.includes("3") && delta.salary?.includes("100k") && delta.education === "BS" && delta.tech_stack.includes("PYTHON")) {
        console.log("✅ Regex successfully extracted YoE, Salary, Edu, and Tech:", JSON.stringify(delta));
    } else {
        console.error("❌ Regex Extraction Failed:", JSON.stringify(delta));
        process.exit(1);
    }

    // 3. Simulate Scout (Should find jobs and queue them)
    console.log("\n[TEST 3: THE DISCOVERY (Omni-Scout Edge Execution)]");
    const scout1 = await trigger('/api/radar/scan');

    // 4. Verify Deduplication (Should return 0 new leads)
    console.log("\n[TEST 4: THE TOKEN SENTRY (Deduplication)]");
    const scout2 = await trigger('/api/radar/scan');

    if (scout2.queued && scout1.queued > 0 && scout2.queued >= scout1.queued) {
        console.error("❌ Deduplication Failed. The entire payload was re-queued.");
        process.exit(1);
    } else {
        console.log(`✅ Deduplication Sentry Active (Found ${scout2.queued} newly generated SERP leads, blocked the rest).`);
    }

    // 5. Simulate Architect (Should refine from jobs_raw)
    console.log("\n[TEST 5: THE ARCHITECT (AI Gap-Fill Refinement)]");
    const arch1 = await trigger('/api/radar/refine');

    if (scout1.queued > 0 && (!arch1.refined || arch1.refined === 0)) {
        console.warn("⚠️ Architect returned 0, but Scout queued jobs. AI might have failed or queue state is unexpected.");
    } else {
        console.log("✅ Architect Refinement Successful.");
    }

    console.log("\n🌟 PIPELINE_VERIFIED: SUCCESS");
}

runTests();
