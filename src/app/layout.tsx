import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Awesome Claude Code",
  description: "Claude Code 技能可视化学习平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-bg-primary dark:bg-bg-primary light:bg-light-bg-primary text-text-primary dark:text-text-primary light:text-light-text-primary min-h-screen">
        <ThemeProvider>
          <Nav />
          <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
