import 'dotenv/config';
import { calculateMatchScore } from '@/lib/scoring';
import { extractJson, chatAgent } from '@/lib/ai/selector';

async function runTests() {
    console.log("==================================================");
    console.log("🧠 ATREUS INTELLIGENCE SYSTEM - COMPREHENSIVE TEST");
    console.log("==================================================\n");

    let passed = 0;
    let failed = 0;

    const assertEqual = (name: string, actual: any, expected: any) => {
        if (actual === expected) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name} | Expected: ${expected}, Got: ${actual}`);
            failed++;
        }
    };

    // ----------------------------------------------------------------------
    // 1. SCORING ENGINE TESTS
    // ----------------------------------------------------------------------
    console.log("--- 1. SCORING ENGINE (lib/scoring.ts) ---");

    const baseUser = {
        skill_bank: ['React', 'TypeScript', 'Node'],
        edu_level: 2, // Bachelor's
        current_yoe: 1,
    };

    // Test A: Perfect Match Entry Level
    const jobA = {
        tech_stack: ['React', 'TypeScript'],
        min_yoe: 0,
        req_edu: 2,
        is_entry_level: true
    };
    // Expected: 
    // overlap: 2/2 = 100
    // Edu: 1.0 (2 >= 2)
    // YoE: 1.0 (is_entry_level = true -> Bypass)
    // Boost: 1.15 (is_entry_level = true)
    // Score: Math.min(100 * 1 * 1 * 1.15, 100) = 100
    assertEqual("Scoring - Perfect Match Entry Level", calculateMatchScore(jobA, baseUser), 100);

    // Test B: Senior Role (Heavy Penalty)
    const jobB = {
        tech_stack: ['React', 'Node'],
        min_yoe: 5,
        req_edu: 2,
        is_entry_level: false
    };
    // Expected:
    // overlap: 2/2 = 100
    // Edu: 1.0
    // YoE: gap = 5 - 1 = 4 (> 2), multiplier = 0.3
    // Score: 100 * 0.3 = 30
    assertEqual("Scoring - Senior Role Heavy Penalty", calculateMatchScore(jobB, baseUser), 30);

    // Test C: Education Penalty
    const jobC = {
        tech_stack: ['React'],
        min_yoe: 1,
        req_edu: 3, // Master's required
        is_entry_level: false
    };
    // Expected:
    // overlap: 1/1 = 100
    // Edu: 0.5 (2 < 3)
    // YoE: 1.0
    // Score: 100 * 0.5 * 1.0 = 50
    assertEqual("Scoring - Education Penalty applied", calculateMatchScore(jobC, baseUser), 50);

    console.log("\n");

    // ----------------------------------------------------------------------
    // 2. AI ROUTING TESTS
    // ----------------------------------------------------------------------
    console.log("--- 2. AI DYNAMIC ROUTING (lib/ai/selector.ts) ---");

    try {
        console.log("Testing GLM-4-Flash EXTRACTION...");
        const payload = `Software Engineer. Requires React and Node. 3 years experience. Bachelor's degree minimum.`;

        console.time("GLM-4-Flash Time");
        const flashResult = await extractJson(payload, 'glm-4-flash');
        console.timeEnd("GLM-4-Flash Time");

        if (flashResult?.data?.tech_stack) {
            console.log("✅ [PASS] GLM-4-Flash Extracted payload successfully");
            passed++;
            console.log("   Extracted Tech Stack:", flashResult.data.tech_stack);
        } else {
            console.error("❌ [FAIL] Missing expected data from GLM-4-Flash");
            failed++;
        }
    } catch (e: any) {
        console.error("❌ [FAIL] GLM-4-Flash Extraction failed:", e.message);
        failed++;
    }

    try {
        console.log("\nTesting GLM-4-Plus STRATEGIST...");
        const history: { role: 'system' | 'user' | 'assistant', content: string }[] = [
            { role: 'system', content: 'You are a precise assistant.' },
            { role: 'user', content: 'Reply with the exact word "ACKNOWLEDGED".' }
        ];


        console.time("GLM-4-Plus Time");
        const plusResult = await chatAgent(history, 'glm-4-plus');
        console.timeEnd("GLM-4-Plus Time");

        if (plusResult?.content?.includes('ACKNOWLEDGED')) {
            console.log("✅ [PASS] GLM-4-Plus Reasoned successfully");
            passed++;
        } else {
            console.error("❌ [FAIL] GLM-4-Plus unexpected response:", plusResult.content);
            failed++;
        }
    } catch (e: any) {
        console.error("❌ [FAIL] GLM-4-Plus Reasoning failed:", e.message);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
    console.log("==================================================");

    if (failed > 0) process.exit(1);
}

runTests();
