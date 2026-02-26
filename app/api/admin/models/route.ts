import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
    try {
        const zhipuApiKey = process.env.ZAI_API_KEY;

        if (!zhipuApiKey) {
            return NextResponse.json({ error: 'ZAI_API_KEY is missing' }, { status: 500 });
        }

        const client = new OpenAI({
            apiKey: zhipuApiKey,
            baseURL: 'https://open.bigmodel.cn/api/paas/v4'
        });

        const response = await client.models.list();

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error fetching models:', error);
        return NextResponse.json({
            error: 'Failed to fetch models',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
