// app/page.js
// ─────────────────────────────────────────────────────────────────────
// HOMEPAGE / DASHBOARD
//
// Thin server component shell that renders the interactive
// DashboardClient. All data fetching and interactivity happens
// client-side via /api/dashboard.
// ─────────────────────────────────────────────────────────────────────

import DashboardClient from "@/components/DashboardClient";

export default function HomePage() {
  return <DashboardClient />;
}
