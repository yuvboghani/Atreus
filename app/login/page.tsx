import { signIn, signUp } from './actions'
import { AlertTriangleIcon, TerminalIcon, ShieldIcon } from 'lucide-react'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string, message?: string }>
}) {
    const params = await searchParams
    const error = params?.error
    const message = params?.message

    return (
        <div className="min-h-screen bg-[#F4F4F0] text-[#111111] flex flex-col font-mono">
            {/* STATUS BAR */}
            <div className="h-10 border-b-2 border-black flex items-center px-4 justify-between">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
                    <div className="w-2 h-2 bg-black animate-pulse" />
                    <span>ATREUS // USER AUTHENTICATION</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] opacity-40">
                    SECURE_CHANNEL
                </span>
            </div>

            {/* MAIN BODY */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* HEADER */}
                    <div className="mb-12 text-center">
                        <h1 className="text-5xl font-black tracking-tighter mb-2">
                            ATREUS
                        </h1>
                        <div className="text-xs uppercase tracking-[0.4em] opacity-50">
                            Autonomous Career OS
                        </div>
                    </div>

                    {/* MESSAGE DISPLAY */}
                    {message && !error && (
                        <div className="border-2 border-blue-600 bg-blue-50 p-4 mb-8">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldIcon className="w-4 h-4 text-blue-600" />
                                <span className="font-black text-[10px] uppercase tracking-widest text-blue-600">
                                    SYSTEM MESSAGE
                                </span>
                            </div>
                            <p className="text-xs font-mono text-blue-800">
                                {decodeURIComponent(message)}
                            </p>
                        </div>
                    )}

                    {/* ERROR DISPLAY */}
                    {error && (
                        <div className="border-2 border-red-600 bg-red-50 p-4 mb-8">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangleIcon className="w-4 h-4 text-red-600" />
                                <span className="font-black text-[10px] uppercase tracking-widest text-red-600">
                                    ACCESS DENIED
                                </span>
                            </div>
                            <p className="text-xs font-mono text-red-800">
                                {decodeURIComponent(error)}
                            </p>
                        </div>
                    )}

                    {/* THE FORM */}
                    <form className="space-y-6">
                        {/* EMAIL */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-[10px] font-bold uppercase tracking-[0.3em] mb-2"
                            >
                                USER_EMAIL
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="user@atreus.io"
                                className="w-full border-2 border-black bg-white px-4 py-3 font-mono text-sm placeholder:opacity-30 outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-[10px] font-bold uppercase tracking-[0.3em] mb-2"
                            >
                                PASSWORD
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                minLength={6}
                                placeholder="••••••••••••"
                                className="w-full border-2 border-black bg-white px-4 py-3 font-mono text-sm placeholder:opacity-30 outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                            />
                        </div>

                        {/* BUTTONS */}
                        <div className="space-y-3 pt-4">
                            <button
                                formAction={signIn}
                                className="w-full border-2 border-black bg-black text-[#F4F4F0] py-4 px-6 font-black text-lg uppercase tracking-widest hover:bg-[#F4F4F0] hover:text-black transition-colors duration-200 flex items-center justify-center gap-3"
                            >
                                <ShieldIcon className="w-5 h-5" />
                                SIGN IN
                            </button>

                            <button
                                formAction={signUp}
                                className="w-full border-2 border-black bg-[#F4F4F0] text-black py-4 px-6 font-black text-lg uppercase tracking-widest hover:bg-black hover:text-[#F4F4F0] transition-colors duration-200 flex items-center justify-center gap-3"
                            >
                                <TerminalIcon className="w-5 h-5" />
                                CREATE ACCOUNT
                            </button>
                        </div>
                    </form>

                    {/* FOOTER NOTE */}
                    <div className="mt-12 text-center">
                        <p className="text-[9px] uppercase tracking-[0.3em] opacity-30">
                            All sessions are encrypted via Supabase Auth
                        </p>
                    </div>
                </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="h-8 border-t-2 border-black flex items-center px-4 justify-between text-[9px] uppercase tracking-[0.2em] opacity-30">
                <span>Project Atreus — v0.9.0</span>
                <span>Active Profile</span>
            </div>
        </div>
    )
}
