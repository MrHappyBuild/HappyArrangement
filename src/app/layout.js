import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://happy-arrangement.vercel.app";

export const metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "Happy Arrangement",
  title: {
    default: "Happy Arrangement",
    template: "%s | Happy Arrangement"
  },
  description: "Planlegging, gjestenettsider, sitteplan og økonomi for arrangementer.",
  openGraph: {
    title: "Happy Arrangement",
    description: "Planlegging, gjestenettsider, sitteplan og økonomi for arrangementer.",
    siteName: "Happy Arrangement",
    type: "website",
    url: APP_URL
  },
  twitter: {
    card: "summary_large_image",
    title: "Happy Arrangement",
    description: "Planlegging, gjestenettsider, sitteplan og økonomi for arrangementer."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
