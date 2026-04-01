import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Design Builder AI",
  description: "Visual SaaS for AI Marketing Generation",
};

import { Sidebar } from '@/components/layout/Sidebar';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-[#050505]`}>
        <AppProvider>
          {children}
          <Sidebar />
        </AppProvider>
      </body>
    </html>
  );
}
