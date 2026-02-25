import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { latexString } = await req.json();

        if (!latexString || typeof latexString !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid `latexString` in request body." },
                { status: 400 }
            );
        }

        // Use latexonline.cc to compile LaTeX → PDF
        // This service accepts URL-encoded LaTeX via query param
        const encodedLatex = encodeURIComponent(latexString);
        const compileUrl = `https://latexonline.cc/compile?text=${encodedLatex}`;

        console.log("[COMPILE] Sending to latexonline.cc...");
        console.log("[COMPILE] LaTeX length:", latexString.length, "chars");

        const response = await fetch(compileUrl, {
            method: "GET",
            headers: {
                "Accept": "application/pdf",
            },
            signal: AbortSignal.timeout(30000), // 30s timeout
        });

        if (!response.ok) {
            // Try to read the error response body
            const errorText = await response.text().catch(() => "Unknown compilation error");
            console.error("[COMPILE] External compiler error:", response.status, errorText);

            return NextResponse.json(
                {
                    error: "LaTeX compilation failed",
                    details: errorText,
                    status: response.status,
                },
                { status: 400 }
            );
        }

        // Check if the response is actually a PDF
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("pdf")) {
            // The compiler returned HTML/text instead of PDF (syntax error)
            const errorBody = await response.text().catch(() => "Compilation returned non-PDF response");
            console.error("[COMPILE] Non-PDF response:", contentType, errorBody.substring(0, 500));

            return NextResponse.json(
                {
                    error: "LaTeX syntax error — compiler returned non-PDF output",
                    details: errorBody.substring(0, 2000),
                },
                { status: 400 }
            );
        }

        // Stream the PDF buffer back
        const pdfBuffer = await response.arrayBuffer();
        console.log("[COMPILE] Success! PDF size:", pdfBuffer.byteLength, "bytes");

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=output.pdf",
                "Cache-Control": "no-cache",
            },
        });
    } catch (err: any) {
        console.error("[COMPILE] Unexpected error:", err);

        // Handle timeout specifically
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            return NextResponse.json(
                {
                    error: "Compilation timed out after 30 seconds",
                    details: "The LaTeX document may be too complex or the compiler service is busy.",
                },
                { status: 504 }
            );
        }

        return NextResponse.json(
            {
                error: "Internal compilation error",
                details: err.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}
