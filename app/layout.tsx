import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pricing NetEase - KOL 供应商比价系统",
  description: "上传选号表，自动匹配飞书历史报价并生成比价结果。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
