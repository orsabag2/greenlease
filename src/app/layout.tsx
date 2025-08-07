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
    apple: '/apple-touch-icon.png',
  },
  other: {
    'permissions-policy': 'unload=*, geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Google tag (gtag.js) - Google Ads */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17414752888"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag() {dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17414752888');
            `,
          }}
        />
        {/* Google tag (gtag.js) - Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-JB9NCEQR0C"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-JB9NCEQR0C');
            `,
          }}
        />
        {/* Hotjar Tracking Code for Site 6484413 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                  h._hjSettings={hjid:6484413,hjsv:6};
                  a=o.getElementsByTagName('head')[0];
                  r=o.createElement('script');r.async=1;
                  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                  a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        />
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
