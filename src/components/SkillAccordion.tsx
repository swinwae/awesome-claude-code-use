"use client";

import { useState, useEffect, useRef } from "react";
import type { SkillInfo, SkillAiDescription } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  skill: "Skill",
  hook: "Hook",
  mcp: "MCP",
  agent: "Agent",
  command: "Command",
  rule: "Rule",
};

export function SkillAccordion({
  skill,
  slug,
}: {
  skill: SkillInfo;
  slug: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [skillDesc, setSkillDesc] = useState<SkillAiDescription | null>(null);
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!expanded || fetchedRef.current || descLoading) return;
    fetchedRef.current = true;
    setDescLoading(true);
    setDescError("");

    fetch("/api/skill-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, skillName: skill.name }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.description) setSkillDesc(data.description);
        else setDescError(data.error || "生成失败");
      })
      .catch(() => setDescError("加载失败"))
      .finally(() => setDescLoading(false));
  }, [expanded, slug, skill.name, descLoading]);

  function retry() {
    fetchedRef.current = false;
    setDescError("");
    setDescLoading(false);
    setSkillDesc(null);
    // Trigger re-fetch by toggling expanded
    setExpanded(true);
  }

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
          {/* Chinese AI Description */}
          <div className="pt-3 space-y-3">
            {descLoading && (
              <div className="space-y-2">
                <div className="skeleton h-4 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded w-full" />
                <div className="skeleton h-4 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded w-3/4" />
                <div className="skeleton h-4 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded w-1/2" />
                <p className="text-xs text-text-muted dark:text-text-muted light:text-light-text-muted">
                  AI 生成中文描述中...
                </p>
              </div>
            )}

            {descError && !skillDesc && (
              <div className="text-sm text-text-muted dark:text-text-muted light:text-light-text-muted">
                <p>{descError}</p>
                <button
                  onClick={retry}
                  className="mt-1 text-xs text-accent-blue hover:underline"
                >
                  重试 →
                </button>
              </div>
            )}

            {skillDesc && (
              <div className="space-y-3 p-3 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border/50">
                <div>
                  <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">
                    中文总结
                  </h4>
                  <p className="text-sm font-medium text-text-primary dark:text-text-primary light:text-light-text-primary">
                    {skillDesc.summary}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">
                    用途与场景
                  </h4>
                  <p className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary">
                    {skillDesc.purpose}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">
                    使用方式
                  </h4>
                  <p className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary whitespace-pre-wrap">
                    {skillDesc.usageGuide}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Original Info */}
          <div className="pt-1">
            <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">
              原始描述
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
