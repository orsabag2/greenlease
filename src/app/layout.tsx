import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl",
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GreenLease – חוזה שכירות דיגיטלי תוך דקות",
  description: "צור חוזה שכירות מקצועי תוך דקות עם GreenLease - הפלטפורמה הדיגיטלית המתקדמת ביותר ליצירת הסכמי שכירות",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${frankRuhl.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
