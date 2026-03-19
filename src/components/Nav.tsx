"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";

export function Nav() {
  const { theme, toggle } = useTheme();

  return (
    <nav className="border-b border-border dark:border-border light:border-light-border px-4 py-3 flex items-center justify-between">
      <Link
        href="/"
        className="font-mono text-sm font-bold text-text-primary dark:text-text-primary light:text-light-text-primary hover:text-accent-blue transition-colors"
      >
        awesome-claude-code
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/repos"
          className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary hover:text-text-primary dark:hover:text-text-primary light:hover:text-light-text-primary transition-colors"
        >
          仓库列表
        </Link>
        <Link
          href="/learn/skill"
          className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary hover:text-text-primary dark:hover:text-text-primary light:hover:text-light-text-primary transition-colors"
        >
          学习路径
        </Link>
        <button
          onClick={toggle}
          className="text-sm px-2 py-1 rounded border border-border dark:border-border light:border-light-border text-text-secondary dark:text-text-secondary light:text-light-text-secondary hover:text-text-primary dark:hover:text-text-primary light:hover:text-light-text-primary transition-colors"
          aria-label="切换主题"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </nav>
  );
}
