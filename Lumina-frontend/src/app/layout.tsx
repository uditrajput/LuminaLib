import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "LuminaLib",
  description: "Modern library management system — AI quizzes, telemetry, PWA offline",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate a log natively sent to Grafana Loki via the instrumentation override
  console.log(`[Frontend] Server-rendered Layout Request at ${new Date().toISOString()}`);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}` }} />
      </body>
    </html>
  );
}
