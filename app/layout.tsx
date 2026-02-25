import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Atreus | JobOps",
  description: "Automated Resume Tailoring — Direct Drive Architecture",
};

import { GlassNav } from "@/components/layout/glass-nav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${jetbrainsMono.variable} bg-background text-foreground antialiased min-h-screen flex`}>
        <QueryProvider>
          <GlassNav />
          <main className="flex-1 ml-64 min-h-screen">
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
