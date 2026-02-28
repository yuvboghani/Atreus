export interface RegexDelta {
    yoe: string | null;
    salary: string | null;
    education: string | null;
    tech_stack: string[];
}

export function extractStrongContext(
    snippet: string,
    url?: string
): RegexDelta {
    const text = snippet || "";

    const yoeMatch = text.match(/[0-9]+\+?\s*(years|yrs|yoe)/i);
    const salaryMatch = text.match(/\$\d{2,3}(k|,\d{3})/i);
    const eduMatch = text.match(/(BS|MS|PhD|Bachelor|Master)/i);
    const techRegex = /(CUDA|MLIR|C\+\+|Python|PyTorch)/gi;

    const techMatches = text.match(techRegex);
    const tech_stack = techMatches
        ? Array.from(new Set(techMatches.map(t => t.toUpperCase())))
        : [];

    return {
        yoe: yoeMatch ? yoeMatch[0] : null,
        salary: salaryMatch ? salaryMatch[0] : null,
        education: eduMatch ? eduMatch[0] : null,
        tech_stack
    };
}
