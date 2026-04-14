import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import Navigation from "@/components/Navigation";



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
    <html lang="en" suppressHydrationWarning>
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
