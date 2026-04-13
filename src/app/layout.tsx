import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Return to Outfit
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import Navigation from "@/components/Navigation";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "KeepNoteAI | Modern Reporting",
  description: "KeepNoteAI - AI-Powered Professional Reporting System",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <Navigation />
            <main className="container" style={{ paddingTop: '2rem' }}>
              {children}
            </main>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
