// app/layout.tsx

import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Najot Nur Dashboard",
  description: "Sales statistics and automation system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className="bg-[#020817] text-white min-h-screen">
        {/* TOP NAVBAR */}
        <header className="w-full bg-[#111827] border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* BRAND */}
            <div className="text-xl font-bold text-white">
              Najot Nur Dashboard
            </div>

            {/* NAV BUTTONS */}
            <nav className="flex items-center space-x-6 text-gray-300">
              <Link
                href="/dashboard"
                className="hover:text-white transition-colors"
              >
                Dashboard
              </Link>

              <Link
                href="/admin"
                className="hover:text-white transition-colors"
              >
                Admin
              </Link>

              <Link
                href="/users"
                className="hover:text-white transition-colors"
              >
                Users
              </Link>
            </nav>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
