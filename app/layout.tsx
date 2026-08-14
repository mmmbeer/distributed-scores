import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Geist_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://scores.fairway3games.com";
const title = "Shared Scores | Live Volleyball Scorekeeping";
const description = "Keep score courtside and share a live volleyball scoreboard with anyone using one link or six-character match code.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | Shared Scores" },
  description,
  applicationName: "Shared Scores",
  category: "sports",
  keywords: ["live volleyball scores", "volleyball scorekeeper", "live scoreboard", "share scores", "volleyball scoring app"],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Shared Scores",
    title,
    description,
    images: [{ url: "/shared-scores-mark.png", width: 1024, height: 1024, alt: "Shared Scores live scoreboard logo" }],
  },
  twitter: { card: "summary", title, description, images: ["/shared-scores-mark.png"] },
  icons: {
    icon: "/shared-scores-favicon.png",
    shortcut: "/shared-scores-favicon.png",
    apple: "/shared-scores-mark.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = { themeColor: "#3581B8", colorScheme: "light" };

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Shared Scores",
      description,
      inLanguage: "en-US",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      url: `${siteUrl}/`,
      name: "Shared Scores",
      description,
      applicationCategory: "SportsApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and a modern web browser",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: ["Real-time volleyball scoreboard", "Shareable match link and code", "Mobile scorekeeper controls", "Public read-only score API"],
      image: `${siteUrl}/shared-scores-mark.png`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} ${geistMono.variable} antialiased`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
