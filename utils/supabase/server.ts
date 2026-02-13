import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using service role key.
 * Used in API routes for direct database operations (bypasses RLS).
 */
export const createServerClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        return null // Returns null if Supabase isn't configured
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
