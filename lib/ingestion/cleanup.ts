import { createServerClient } from '@/utils/supabase/server';

export async function purgeOldJobs(): Promise<number> {
    try {
        const supabase = await createServerClient();
        if (!supabase) {
            console.error("[JANITOR] Database connection failed.");
            return 0;
        }

        // Calculate the threshold date (30 days ago)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thresholdDateStr = thirtyDaysAgo.toISOString();

        // Perform the deletion directly using Service Role key
        // NOTE: The server utility requires the service role key to bypass RLS for background jobs
        const { data, error, count } = await supabase
            .from('jobs')
            .delete({ count: 'exact' })
            .eq('is_saved', false)
            .or(`created_at.lt.${thresholdDateStr},match_score.lt.15`);

        if (error) {
            console.error("[JANITOR WARNING] Failed to purge jobs:", error.message);
            return 0;
        }

        const purgedCount = count || 0;
        console.log(`[JANITOR] Purged ${purgedCount} stale jobs from database.`);
        return purgedCount;

    } catch (error) {
        console.error("[JANITOR FATAL] Crash during purge:", error);
        return 0;
    }
}
