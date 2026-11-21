import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-xs text-ink-600 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-extrabold text-ink-950">VALUEOUS</p>
          <p className="mt-1.5 leading-relaxed">
            Value discovery platform for Indian consumers, creators and D2C businesses. Trusted recommendations, tracked outcomes, and wallets settled in INR.
          </p>
        </div>

        <div>
          <p className="font-bold text-ink-900 uppercase">Marketplace</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link href="/" className="hover:text-brand-700 hover:underline">
                Browse Product Campaigns
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="hover:text-brand-700 hover:underline">
                How VALUEOUS Works
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-brand-700 hover:underline">
                Pricing &amp; Fee Structure
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-bold text-ink-900 uppercase">Get Started</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link href="/register?role=CUSTOMER" className="hover:text-brand-700 hover:underline">
                Discover Trusted Offers (Customers)
              </Link>
            </li>
            <li>
              <Link href="/register?role=BUSINESS" className="hover:text-brand-700 hover:underline">
                List Products (For Businesses)
              </Link>
            </li>
            <li>
              <Link href="/register?role=INFLUENCER" className="hover:text-brand-700 hover:underline">
                Earn with Promo Codes (Creators)
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-brand-700 hover:underline">
                Sign In / Interactive Demo
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-bold text-ink-900 uppercase">Legal &amp; Support</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link href="/terms" className="hover:text-brand-700 hover:underline">
                Terms of Service &amp; ASCI Rules
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-brand-700 hover:underline">
                Privacy &amp; Data Policy
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-700 hover:underline">
                Support &amp; Compliance Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-100 py-4 text-center text-[11px] text-ink-500">
        © {new Date().getFullYear()} VALUEOUS. All monetary ledgers settled in INR (₹).
      </div>
    </footer>
  );
}
