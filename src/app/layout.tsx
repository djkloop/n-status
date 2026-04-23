import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/providers";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "接口查询控制台",
  description: "查询上游 API 分组与 API Key 列表",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <Providers>
          <div className="min-h-full flex flex-col">
            <TopNav />
            <div className="flex-1 flex flex-col">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
