export interface AtsJob {
    id: string;
    title: string;
    absolute_url: string;
    location?: {
        name: string;
    };
    metadata?: any;
    company: string;
    source: 'greenhouse' | 'lever';
}

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

export async function fetchGreenhouse(company: string): Promise<AtsJob[]> {
    try {
        const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`, {
            headers: COMMON_HEADERS
        });

        if (!response.ok) {
            console.warn(`Greenhouse fetch failed for ${company}: ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (!data.jobs || !Array.isArray(data.jobs)) return [];

        return data.jobs.map((job: any) => ({
            id: String(job.id),
            title: job.title,
            absolute_url: job.absolute_url,
            location: { name: job.location?.name || 'Remote' },
            metadata: job.metadata,
            company: company,
            source: 'greenhouse'
        }));
    } catch (error) {
        console.error(`Error fetching Greenhouse for ${company}:`, error);
        return [];
    }
}

export async function fetchLever(company: string): Promise<AtsJob[]> {
    try {
        const response = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`, {
            headers: COMMON_HEADERS
        });

        if (!response.ok) {
            console.warn(`Lever fetch failed for ${company}: ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (!Array.isArray(data)) return [];

        return data.map((job: any) => ({
            id: job.id,
            title: job.text,
            absolute_url: job.hostedUrl,
            location: { name: job.categories?.location || 'Remote' },
            metadata: {
                team: job.categories?.team,
                commitment: job.categories?.commitment
            },
            company: company,
            source: 'lever'
        }));
    } catch (error) {
        console.error(`Error fetching Lever for ${company}:`, error);
        return [];
    }
}
