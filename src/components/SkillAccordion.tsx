"use client";

import { useState } from "react";
import type { SkillInfo } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  skill: "Skill",
  hook: "Hook",
  mcp: "MCP",
  agent: "Agent",
  command: "Command",
};

export function SkillAccordion({ skill }: { skill: SkillInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border dark:border-border light:border-light-border rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-bg-tertiary dark:hover:bg-bg-tertiary light:hover:bg-light-bg-tertiary transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-text-muted dark:text-text-muted light:text-light-text-muted">
            {expanded ? "▼" : "▶"}
          </span>
          <span className="font-mono text-sm text-accent-blue truncate">
            {skill.name}
          </span>
          <span className="font-mono text-xs px-1.5 py-0.5 border border-border dark:border-border light:border-light-border rounded text-text-secondary dark:text-text-secondary light:text-light-text-secondary shrink-0">
            [{CATEGORY_LABELS[skill.category]}]
          </span>
        </div>
      </button>

      {!expanded && (
        <div className="px-4 pb-3 pl-10">
          <p className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary line-clamp-1">
            {skill.description}
          </p>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 pl-10 space-y-4 border-t border-border dark:border-border light:border-light-border">
          <div className="pt-3">
            <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">
              描述
            </h4>
            <p className="text-sm text-text-primary dark:text-text-primary light:text-light-text-primary">
              {skill.description}
            </p>
          </div>

          {skill.version && (
            <div>
              <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">
                版本
              </h4>
              <p className="text-sm font-mono text-text-secondary dark:text-text-secondary light:text-light-text-secondary">
                {skill.version}
              </p>
            </div>
          )}

          {skill.allowedTools && skill.allowedTools.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">
                允许的工具
              </h4>
              <div className="flex flex-wrap gap-1">
                {skill.allowedTools.map((tool) => (
                  <span
                    key={tool}
                    className="font-mono text-xs px-1.5 py-0.5 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded text-text-secondary dark:text-text-secondary light:text-light-text-secondary"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          <SkillRawContent content={skill.rawContent} />
        </div>
      )}
    </div>
  );
}

function SkillRawContent({ content }: { content: string }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="text-xs font-mono text-accent-blue hover:underline"
      >
        {showRaw ? "▼ 收起原文" : "▶ 查看原文"}
      </button>
      {showRaw && (
        <pre className="mt-2 p-3 bg-bg-primary dark:bg-bg-primary light:bg-light-bg-secondary rounded text-xs overflow-x-auto max-h-96 text-text-primary dark:text-text-primary light:text-light-text-primary">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}
