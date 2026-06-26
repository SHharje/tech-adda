// components/Navbar.js
// ─────────────────────────────────────────────────────────────────────
// Persistent top navigation bar.
// Logo: "Tech" in white, "Adda" in cyan.
// Links: Dashboard / Trends / Subscribe — right-aligned.
// ─────────────────────────────────────────────────────────────────────

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/subscribe", label: "Subscribe" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#1E293B] bg-[#0A0F1E] sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0">
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[#F8FAFC]">
            Tech
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[#00D4FF]">
            Digest
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  px-4 py-2 text-sm font-medium transition-colors
                  font-[family-name:var(--font-body)]
                  ${
                    isActive
                      ? "text-[#00D4FF] border-b-2 border-[#00D4FF]"
                      : "text-[#64748B] hover:text-[#F8FAFC]"
                  }
                `}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
