export function shouldSkipJob(
    title: string, snippet?: string
): boolean {
    if (!title) return true;

    const blocklist = [
        // Seniority
        "senior", "sr", "lead", "manager",
        "director", "vp", "principal", "staff",
        // Non-engineering roles
        "account executive", "sales",
        "recruiter", "hr", "human resources",
        "legal", "policy", "marketing",
        // Geography blocks
        "japan"
    ];

    const targetText =
        `${title} ${snippet || ''}`.toLowerCase();

    for (const term of blocklist) {
        const regex = new RegExp(
            `\\b${term}\\b`, 'i'
        );
        if (regex.test(targetText)) {
            return true;
        }
    }

    return false;
}
