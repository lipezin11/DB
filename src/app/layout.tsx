import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const interFont = Inter({
  subsets: ["latin"],
});

const robotoFont = Roboto_Mono({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Builder AI",
  description: "Visual SaaS for AI Marketing Generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${interFont.className}`}>
        {children}
      </body>
    </html>
  );
}
