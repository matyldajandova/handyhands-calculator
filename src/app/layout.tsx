import type { Metadata } from "next";
import { Raleway, Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-sans" });
const raleway = Raleway({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading" 
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: "Handy Hands Kalkulátor",
  description: "Kalkulátor úklidových služeb pro různé typy nemovitostí",
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Handy Hands"
  },
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "Handy Hands Kalkulátor",
    description: "Kalkulátor úklidových služeb pro různé typy nemovitostí",
    url: baseUrl,
    siteName: 'Handy Hands',
    images: [
      {
        url: '/hh_og_image.png',
        width: 1200,
        height: 630,
        alt: 'Handy Hands Kalkulátor úklidových služeb',
      }
    ],
    locale: 'cs_CZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Handy Hands Kalkulátor",
    description: "Kalkulátor úklidových služeb pro různé typy nemovitostí",
    images: ['/hh_og_image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${openSans.variable} ${raleway.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
