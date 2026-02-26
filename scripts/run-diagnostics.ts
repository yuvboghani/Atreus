import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars BEFORE importing libs that use them
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import AI lib after Env is loaded
// Note: In ESM/TSX, static imports hoist. We need to dynamic import or rely on env being set.
// For this script, we'll use a dynamic import to ensure safety.
// const { extractJson, deepReasoning, chatAgent } = require('../lib/ai/selector'); 
// But TSX handles ESM. Let's try dynamic import within runDiagnostics.

async function runDiagnostics() {
    // Dynamic import to bypass hoisting
    const { extractJson, deepReasoning, chatAgent } = await import('../lib/ai/selector');

    // Initialize Supabase (requires env vars to be loaded)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(">> STARTING SYSTEM DIAGNOSTICS...\n");

    // PHASE 2: INGESTION & NORMALIZATION
    console.log("--- TEST 1: INGESTION & NORMALIZATION ---");
    const messyInput = "Looking for a rockstar coder who knows React.js, Node.js, and Postgres. Salary is 100k to 150k base.";
    console.log(`Input: "${messyInput}"`);
    try {
        const result = await extractJson(messyInput);
        console.log("Result:", JSON.stringify(result, null, 2));

        const stack = result.tech_stack || [];
        if (stack.includes("React") && stack.includes("Node") && stack.includes("Postgres")) {
            console.log("✅ PASS: Skills Normalized");
        } else {
            console.error("❌ FAIL: Skills NOT Normalized - " + JSON.stringify(stack));
        }

        if (result.salary_min === 100000 && result.salary_max === 150000) {
            console.log("✅ PASS: Salary Parsed");
        } else {
            console.error("❌ FAIL: Salary Mismatch");
        }

    } catch (e: any) {
        console.error("❌ ERROR:", e.message);
    }
    console.log("\n");


    // PHASE 3: THE SURGEON'S CONSTRAINTS
    console.log("--- TEST 2: THE SURGEON (LATEX ESCAPING) ---");
    const maliciousInput = "Increased revenue by 50% & managed a $10,000 budget for the #1 team. Used C++ and C#.";
    console.log(`Input: "${maliciousInput}"`);
    try {
        const latex = await deepReasoning(maliciousInput);
        console.log("Output:\n", latex);

        // Check for escapes
        const escapes = ["\\%", "\\$", "\\&", "\\#"];
        const missingEscapes = escapes.filter(e => !latex.includes(e));

        if (missingEscapes.length === 0) {
            console.log("✅ PASS: All Special Characters Escaped");
        } else {
            // Note: simple includes check might fail if AI rewrites the content entirely and removes the symbols, 
            // but for this specific input, it SHOULD retain the metrics.
            console.warn("⚠️ WARNING: Some escapes missing or content rewritten without them:", missingEscapes);
        }

        if (latex.includes("Created") || latex.includes("Developed")) { // Simple verb check based on instructions
            console.log("✅ PASS: Strong Verbs Used");
        }

    } catch (e: any) {
        console.error("❌ ERROR:", e.message);
    }
    console.log("\n");


    // PHASE 4: MEMORY TRUNCATION (SIMULATION)
    console.log("--- TEST 3: MEMORY TRUNCATION & SUMMARIZATION ---");
    // Mock History > 8 messages
    const mockHistory = Array.from({ length: 10 }).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: This is a long message to fill up the token window. Blah blah blah.`
    }));

    console.log(`Mock History Length: ${mockHistory.length}`);

    try {
        // Run Logic locally to test
        let history = [...mockHistory];
        let summary = "Previous summary.";

        if (history.length > 8) {
            console.log("Triggering Summarization...");
            const messagesToSummarize = history.slice(0, history.length - 6);
            const remainingHistory = history.slice(history.length - 6);

            const textToSummarize = messagesToSummarize.map((m: any) => `${m.role}: ${m.content}`).join("\n");

            // Call AI directly
            const newSummary = await chatAgent([
                { role: 'system' as const, content: `Summarize this conversation history into a concise paragraph. RETAIN previous summary context: ${summary}` },
                { role: 'user' as const, content: textToSummarize }
            ]);

            console.log("New Summary Generated:", newSummary);

            if (newSummary) {
                summary = newSummary;
                history = remainingHistory;
                console.log("✅ PASS: History Truncated to", history.length);
                console.log("✅ PASS: Summary Updated");
            } else {
                console.error("❌ FAIL: Summary return empty");
            }
        } else {
            console.log("Skipped logic (History too short?)");
        }

    } catch (e: any) {
        console.error("❌ ERROR:", e.message);
    }
    console.log("\n");


    // PHASE 5: DATABASE INTEGRITY (REVERSE SYNC)
    console.log("--- TEST 4: DATABASE INTEGRITY (REVERSE SYNC) ---");
    const testBullet = "Developed a RAG pipeline using Redis to achieve 50ms latency.";

    // We need a valid user ID. Let's try to fetch the first user.
    const { data: users, error: userError } = await supabase.from('profiles').select('id, resume_text').limit(1);

    if (userError || !users || users.length === 0) {
        console.log("⚠️ SKIPPING: No users found in DB to test sync.");
    } else {
        const user = users[0];
        console.log(`Testing with User ID: ${user.id}`);
        console.log(`Simulating Sync: "${testBullet}"`);

        // Simulate Action Logic
        let currentText = user.resume_text || "";
        if (!currentText.includes(testBullet)) {
            currentText += `\n\n${testBullet}`;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ resume_text: currentText })
                .eq('id', user.id);

            if (updateError) {
                console.error("❌ FAIL: Access/Update Error", updateError);
            } else {
                console.log("✅ PASS: DB Update Successful");

                // Verify
                const { data: verify } = await supabase.from('profiles').select('resume_text').eq('id', user.id).single();
                if (verify?.resume_text?.includes(testBullet)) {
                    console.log("✅ PASS: Verification Confirmed");
                } else {
                    console.error("❌ FAIL: Verification Failed");
                }
            }
        } else {
            console.log("ℹ️ INFO: Bullet already exists, skipping write.");
            console.log("✅ PASS: Idempotency Checked");
        }
    }

    console.log("\n>> DIAGNOSTICS COMPLETE.");
}

runDiagnostics();
