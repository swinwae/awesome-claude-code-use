"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-xs px-2 py-1 border border-border dark:border-border light:border-light-border rounded hover:bg-bg-tertiary dark:hover:bg-bg-tertiary light:hover:bg-light-bg-tertiary transition-colors text-text-secondary dark:text-text-secondary light:text-light-text-secondary"
      aria-label="复制安装命令"
    >
      {copied ? (
        <span className="text-accent-green">已复制 ✓</span>
      ) : (
        "复制"
      )}
    </button>
  );
}
