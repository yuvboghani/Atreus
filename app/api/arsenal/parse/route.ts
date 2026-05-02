import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import * as mammoth from 'mammoth';

export async function POST(req: NextRequest) {
    try {
        const { filePath } = await req.json();
        if (!filePath) {
            return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
        }

        const supabase = await createServerClient();
        if (!supabase) {
             return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
             return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase.storage
            .from('arsenal_uploads')
            .download(filePath);

        if (error || !data) {
            return NextResponse.json({ error: "Failed to download file" }, { status: 404 });
        }

        const buffer = await data.arrayBuffer();
        const nodeBuffer = Buffer.from(buffer);
        let text = "";

        if (filePath.toLowerCase().endsWith('.pdf')) {
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(nodeBuffer);
            text = pdfData.text;
        } else if (filePath.toLowerCase().endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer: nodeBuffer });
            text = result.value;
        } else {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error("[ARSENAL_PARSE] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
