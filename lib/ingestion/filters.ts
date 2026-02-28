export function shouldSkipJob(title: string, snippet?: string): boolean {
    if (!title) return true;

    // Hard Rule: Block Senior/Leadership roles to preserve token quota for Entry/Mid
    const blocklist = [
        "senior", "sr", "lead", "manager", "director", "vp", "principal", "staff"
    ];

    const targetText = `${title} ${snippet || ''}`.toLowerCase();

    for (const term of blocklist) {
        // Use word boundaries to prevent matching 'senior' inside 'seniorengineer' 
        // if that were a thing, but mainly for accuracy.
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(targetText)) {
            return true;
        }
    }

    return false;
}
