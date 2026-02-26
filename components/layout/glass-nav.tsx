'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RadioTowerIcon, AnvilIcon, DatabaseIcon } from 'lucide-react';

export function GlassNav() {
    const pathname = usePathname();

    const navItems = [
        {
            name: 'THE RADAR',
            href: '/radar',
            icon: RadioTowerIcon,
            description: 'Job Intelligence'
        },
        {
            name: 'THE FORGE',
            href: '/forge',
            icon: AnvilIcon,
            description: 'Workspace'
        },
        {
            name: 'THE ARSENAL',
            href: '/arsenal',
            icon: DatabaseIcon,
            description: 'Profile & Assets'
        }
    ];

    return (
        <nav className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r-2 border-black flex flex-col z-50">
            {/* Brand */}
            <div className="h-16 border-b-2 border-black flex items-center px-6">
                <h1 className="text-xl font-bold tracking-tighter">ATREUS_OS</h1>
            </div>

            {/* Nav Links */}
            <div className="flex-1 flex flex-col p-4 gap-2">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-4 px-4 py-3 transition-none border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                                isActive
                                    ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                                    : "hover:bg-sidebar-accent"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-black")} />
                            <div className="flex flex-col">
                                <span className={cn("text-xs font-bold leading-none", isActive ? "text-white" : "text-black")}>
                                    {item.name}
                                </span>
                                <span className={cn("text-[10px] uppercase tracking-wider opacity-60", isActive ? "text-white/80" : "text-black/60")}>
                                    {item.description}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Status Bar */}
            <div className="p-4 border-t-2 border-black">
                <div className="text-[10px] font-mono opacity-40">
                    SYSTEM_STATUS: ONLINE<br />
                    V.4.0.0 (GLASS)
                </div>
            </div>
        </nav>
    );
}
