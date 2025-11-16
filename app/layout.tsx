import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Najot Nur Sales Dashboard",
  description: "Internal dashboard for sales analytics using amoCRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight"
            >
              Najot Nur Dashboard
            </Link>
            <nav className="flex gap-2 text-sm">
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-1 font-medium hover:bg-slate-800"
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                className="rounded-full px-3 py-1 font-medium hover:bg-slate-800"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
