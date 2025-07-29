import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "./components/ClientWrapper";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Location Finder",
  description: "Enter your country, city, and location within the city",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Analytics />
        <ClientWrapper>
          <div>{children}</div>
        </ClientWrapper>
      </body>
    </html>
  );
}
