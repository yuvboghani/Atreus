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

    const { data: userData } = await supabase.auth.getUser()
    let redirectPath = '/forge' // Default

    if (userData.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', userData.user.id)
            .single()
        
        if (profile && !profile.onboarding_completed) {
            redirectPath = '/arsenal'
        }
    }

    revalidatePath('/', 'layout')
    redirect(redirectPath)
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

    let redirectPath = '/forge'

    if (authData.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', authData.user.id)
            .single()
        
        if (profile && !profile.onboarding_completed) {
            redirectPath = '/arsenal'
        }
    }

    revalidatePath('/', 'layout')
    redirect(redirectPath)
}

export async function signOut() {
    const supabase = await createAuthClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
