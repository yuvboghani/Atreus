import { createServerClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const supabase = await createServerClient();
        if (!supabase) return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Runtime require to avoid top-level side effects and DOMMatrix errors
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        const text = data.text;

        // ... (AI Extraction note omitted for brevity, keeping original logic)

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('Resume Ingestion Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
