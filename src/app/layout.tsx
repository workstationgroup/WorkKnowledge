import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "WSO Knowledge Base",
  description: "Work Station Office (Thailand) — Employee Learning Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">
        <NextTopLoader color="#6366f1" height={3} showSpinner={false} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
