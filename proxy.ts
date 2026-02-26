import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * THE BOUNCER — Middleware for route protection.
 * 
 * Rules:
 * 1. / (landing) → always public
 * 2. /login → if logged in, redirect to /radar
 * 3. /forge, /arsenal, /radar → if NOT logged in, redirect to /login
 * 4. /api/* → pass through (API routes handle their own auth)
 */
export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Do not add logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very
    // hard to debug issues with users being randomly logged out.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // PROTECTED ROUTES — redirect to login if not authenticated
    const protectedPaths = ['/forge', '/arsenal', '/radar']
    const isProtected = protectedPaths.some(
        path => pathname === path || pathname.startsWith(path + '/')
    )

    if (isProtected && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // LOGIN ROUTE — redirect to radar if already authenticated
    if (pathname === '/login' && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/radar'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/ (API routes handle their own auth)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
