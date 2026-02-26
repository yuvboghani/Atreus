'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAuthClient } from '@/utils/supabase/auth-server'

export async function signIn(formData: FormData) {
    const supabase = await createAuthClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/radar')
}

export async function signUp(formData: FormData) {
    const supabase = await createAuthClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { data: authData, error } = await supabase.auth.signUp(data)

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    if (authData.session === null) {
        // Requires email verification
        redirect('/login?message=Account created. Please check your email to verify before signing in.')
    }

    revalidatePath('/', 'layout')
    redirect('/radar')
}

export async function signOut() {
    const supabase = await createAuthClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
