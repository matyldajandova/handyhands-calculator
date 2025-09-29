import type { Metadata } from "next";
import { Raleway, Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-sans" });
const raleway = Raleway({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading" 
});

export const metadata: Metadata = {
  title: "Handy Hands Kalkulátor",
  description: "Kalkulátor úklidových služeb pro různé typy nemovitostí",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    shortcut: "/favicon.ico"
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Handy Hands"
  }
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
