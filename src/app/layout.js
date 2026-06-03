import "./globals.css";

export const metadata = {
  title: "Kvitteringsdeler Local",
  description: "Lokal kvitteringsanalyse med Next.js og Ollama på samme maskin."
};

export default function RootLayout({ children }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
