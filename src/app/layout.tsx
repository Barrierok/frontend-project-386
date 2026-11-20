import type { Metadata } from "next";

import "./globals.css";
import { Montserrat } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Calendar — запись на звонок",
    template: "%s — Calendar",
  },
  description:
    "Календарь звонков: выберите тип события и свободное время, чтобы записаться за минуту.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={cn("font-sans", montserrat.variable)}>
      <body className="flex min-h-svh flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
