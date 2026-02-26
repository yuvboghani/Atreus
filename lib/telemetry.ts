/**
 * Telemetry Utility for tracking AI token usage.
 */

export function logTokenUsage(route: string, usage: any, model: string) {
    if (!usage) {
        console.warn(`[TELEMETRY] No usage data provided for route: ${route}`);
        return;
    }

    const { prompt_tokens, completion_tokens, total_tokens } = usage;

    console.log('--- AI TELEMETRY ---');
    console.log(`Route:      ${route}`);
    console.log(`Model:      ${model}`);
    console.log(`Prompt:     ${prompt_tokens}`);
    console.log(`Completion: ${completion_tokens}`);
    console.log(`Total:      ${total_tokens}`);
    console.log('--------------------');

    /**
     * FUTURE-PROOFING:
     * Add Supabase 'insert' call here to write this to a 'token_logs' database table.
     * 
     * await supabase.from('token_logs').insert({
     *   route,
     *   model,
     *   prompt_tokens,
     *   completion_tokens,
     *   total_tokens,
     *   created_at: new Date().toISOString()
     * });
     */
}
