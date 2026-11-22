import type { Metadata } from "next";
import { Google_Sans_Flex, DM_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrintSafe",
  description: "Print anywhere. Share nothing.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png?v=3", sizes: "64x64", type: "image/png" },
      { url: "/icon.png?v=3", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=3",
    apple: "/favicon.png?v=3",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PrintSafe",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${googleSansFlex.variable} ${dmMono.variable}`}
    >
      <body className="antialiased min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
