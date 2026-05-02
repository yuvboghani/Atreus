import { NextResponse } from "next/server"
import { orchestrator } from "@/lib/ai/orchestrator"

export async function POST(req: Request) {
  try {
    const { url, rawText } = await req.json()
    console.log(`[FORGE] Ingesting from: ${url}`)
    console.log(`[FORGE] Raw text preview: ${rawText?.substring(0, 100)}...`)

    if (!rawText) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      )
    }

    // 1. Trigger Strategist with the "Raw Text" logic
    // We pass the raw text as the source material for the LLM
    const result = await orchestrator.tailor({
      url,
      rawText,
      mode: "aggressive" // Custom flag for high-precision extraction
    })

    return NextResponse.json({
      success: true,
      url,
      ...result
    })

  } catch (error: any) {
    console.error("Forge Ingestion Error:", error)
    return NextResponse.json(
      { error: error.message || "Forge failed" },
      { status: 500 }
    )
  }
}
