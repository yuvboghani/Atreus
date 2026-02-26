'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    RadarIcon,
    CrosshairIcon,
    ShieldIcon,
    SettingsIcon,
    MenuIcon,
    XIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrutalistSidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    const navItems = [
        { name: 'THE RADAR', path: '/radar', icon: RadarIcon, label: 'JOB INTELLIGENCE' },
        { name: 'THE FORGE', path: '/forge', icon: CrosshairIcon, label: 'WORKSPACE' },
        { name: 'THE ARSENAL', path: '/arsenal', icon: ShieldIcon, label: 'PROFILE & ASSETS' },
    ];

    return (
        <>
            {/* Toggle Button (Floating) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed top-4 z-[100] p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
                    isOpen ? "left-60" : "left-4"
                )}
            >
                {isOpen ? <ChevronLeftIcon className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
            </button>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-[#F4F4F0] border-r-2 border-black transition-transform duration-300 ease-in-out flex flex-col",
                    !isOpen && "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="p-6 border-b-2 border-black flex items-center justify-between">
                    <div className="flex flex-col">
                        <Link href="/" className="text-2xl font-black tracking-[0.3em] uppercase leading-none hover:opacity-80 transition-opacity">
                            A T R E U S
                        </Link>
                        <span className="text-[10px] font-mono opacity-50 uppercase mt-1">Autonomous Profile v1.0</span>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={cn(
                                    "group flex flex-col p-4 border-2 border-transparent transition-all uppercase tracking-widest",
                                    isActive
                                        ? "bg-black text-white border-black"
                                        : "hover:bg-black hover:text-white hover:border-black"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="w-5 h-5" />
                                    <span className="text-xs font-black">{item.name}</span>
                                </div>
                                <span className={cn(
                                    "text-[9px] font-mono mt-1",
                                    isActive ? "opacity-50" : "opacity-30 group-hover:opacity-50"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t-2 border-black bg-black/5 flex flex-col gap-2">
                    <div className="text-[10px] font-mono opacity-40 uppercase">
                        System: Active
                    </div>
                </div>
            </aside>

            {/* Layout Filler - Only exists to push main content when isOpen is true */}
            {isOpen && <div className="hidden lg:block w-64 shrink-0 transition-all duration-300" />}
        </>
    );
}
