import { NextRequest, NextResponse } from "next/server";
import * as mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Arsenal Parse API — Direct file upload (no storage bucket).
 * Accepts a FormData body with a single 'file' field.
 * Returns { text: string } with the extracted raw text.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        const buffer = await file.arrayBuffer();
        const fileName = file.name.toLowerCase();
        let text = "";

        if (fileName.endsWith('.pdf')) {
            const pdf = await getDocumentProxy(new Uint8Array(buffer));
            const extracted = await extractText(pdf);
            text = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text;
        } else if (fileName.endsWith('.docx')) {
            const nodeBuffer = Buffer.from(buffer);
            const result = await mammoth.extractRawText(
                { buffer: nodeBuffer }
            );
            text = result.value;
        } else {
            return NextResponse.json(
                { error: "Unsupported file type. Use PDF or DOCX." },
                { status: 400 }
            );
        }

        if (!text.trim()) {
            return NextResponse.json(
                { error: "No text could be extracted from the file." },
                { status: 422 }
            );
        }

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error("[ARSENAL_PARSE] Error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
