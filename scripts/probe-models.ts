import 'dotenv/config';
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.ZAI_API_KEY,
    baseURL: "https://open.bigmodel.cn/api/paas/v4/"
});

async function testModel(modelName: string) {
    try {
        console.log(`Testing ${modelName}...`);
        const response = await openai.chat.completions.create({
            model: modelName,
            messages: [{ role: "user", content: "hello" }],
            max_tokens: 10
        });
        console.log(`✅ ${modelName} SUCCESS:`, response.choices[0].message.content);
    } catch (e: any) {
        console.error(`❌ ${modelName} FAILED:`, e.error?.message || e.message);
    }
}

async function main() {
    await testModel('glm-4-flash');
    await testModel('glm-4-flashx');
    await testModel('glm-4-air');
    await testModel('glm-4-airx');
    await testModel('glm-4-plus');
    await testModel('glm-4');
}

main();
