import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
        }

        // Validate URL format
        let parsedUrl: URL
        try {
            parsedUrl = new URL(url)
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
        }

        // Server-side fetch to bypass CORS
        const response = await fetch(parsedUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
                { status: 422 }
            )
        }

        const html = await response.text()

        // Strip scripts, styles, and HTML tags to extract text content
        const text = html
            // Remove script tags and content
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            // Remove style tags and content
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            // Remove HTML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Replace common block elements with newlines
            .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            // Remove remaining HTML tags
            .replace(/<[^>]+>/g, ' ')
            // Decode common HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Clean up whitespace
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim()

        if (!text || text.length < 50) {
            return NextResponse.json(
                { error: 'Could not extract meaningful text from this URL. The page may require authentication or JavaScript rendering. Please paste the job description manually.' },
                { status: 422 }
            )
        }

        return NextResponse.json({ text })
    } catch (error: unknown) {
        console.error('Scrape API error:', error)
        const message = error instanceof Error ? error.message : 'Failed to scrape URL'
        return NextResponse.json(
            { error: `Scraping failed: ${message}. Please paste the job description manually.` },
            { status: 500 }
        )
    }
}
