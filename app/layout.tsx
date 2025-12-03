import "./globals.css";
import SideMenu from "./components/SideMenu";

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
        <header className="w-full bg-[#111827] border-b border-gray-800 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
            {/* HAMBURGER MENU */}
            <SideMenu />
            
            {/* BRAND */}
            <div className="text-lg sm:text-xl font-bold text-white">
              Najot Nur Dashboard
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
