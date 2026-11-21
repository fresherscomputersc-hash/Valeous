import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { getCurrentActor } from '@/server/auth/session';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: 'VALUEOUS — Customers × Creators × Businesses',
    template: '%s | VALUEOUS',
  },
  description:
    'VALUEOUS connects customers seeking trusted value, creators sharing tracked recommendations, and businesses growing through outcome-based campaigns.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getCurrentActor();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-ink-50 text-ink-950 antialiased">
        <ToastProvider>
          <AuthProvider initialActor={actor}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink-950 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
            >
              Skip to main content
            </a>

            <Navbar demoMode={demoMode} />

            <main
              id="main-content"
              className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
            >
              {children}
            </main>

            <Footer />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
