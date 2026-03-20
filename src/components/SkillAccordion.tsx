"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SkillInfo, SkillAiDescription, SkillInstallStatus } from "@/types";

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
    setExpanded(true);
  }

  // Parse owner/repo from slug (format: "owner-repo")
  const parts = slug.split("-");
  const owner = parts[0] || "";
  const repo = parts.slice(1).join("-") || "";

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

          {/* Install Section — only for skill category */}
          {skill.category === "skill" && (
            <SkillInstallSection
              skillName={skill.name}
              filePath={skill.filePath}
              owner={owner}
              repo={repo}
            />
          )}

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

function SkillInstallSection({
  skillName,
  filePath,
  owner,
  repo,
}: {
  skillName: string;
  filePath: string;
  owner: string;
  repo: string;
}) {
  const [status, setStatus] = useState<SkillInstallStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [projectPath, setProjectPath] = useState("");
  // Remember the project path used during install for uninstall
  const [installedProjectPath, setInstalledProjectPath] = useState("");

  const fetchStatus = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/install-status?skillName=${encodeURIComponent(skillName)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then(setStatus)
      .catch((err) => {
        if (err.name !== "AbortError") setStatus({ user: false, project: false });
      })
      .finally(() => setLoading(false));
    return controller;
  }, [skillName]);

  useEffect(() => {
    const controller = fetchStatus();
    return () => controller.abort();
  }, [fetchStatus]);

  const doInstall = async (level: "user" | "project", path?: string) => {
    setActionLoading(level);
    setError("");
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "install",
          owner,
          repo,
          filePath,
          skillName,
          level,
          projectPath: path,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "安装失败");
      } else {
        if (level === "project" && path) {
          setInstalledProjectPath(path);
        }
        setShowProjectInput(false);
        setProjectPath("");
        fetchStatus();
      }
    } catch {
      setError("安装请求失败");
    } finally {
      setActionLoading(null);
    }
  };

  const doUninstall = async (level: "user" | "project") => {
    setActionLoading(`un-${level}`);
    setError("");
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uninstall",
          skillName,
          level,
          projectPath: level === "project" ? installedProjectPath : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "卸载失败");
      } else {
        if (level === "project") setInstalledProjectPath("");
        fetchStatus();
      }
    } catch {
      setError("卸载请求失败");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-3 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border/50">
        <div className="skeleton h-4 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded w-32" />
      </div>
    );
  }

  return (
    <div className="p-3 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border/50 space-y-2">
      <h4 className="text-xs font-mono uppercase text-text-muted dark:text-text-muted light:text-light-text-muted">
        安装
      </h4>

      <div className="flex flex-wrap items-center gap-2">
        {/* User level */}
        {status?.user ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs">
            <span className="text-accent-green">&#10003; 已安装 (user)</span>
            <button
              onClick={() => doUninstall("user")}
              disabled={actionLoading !== null}
              className="text-accent-red/70 hover:text-accent-red hover:underline disabled:opacity-50"
            >
              {actionLoading === "un-user" ? "卸载中..." : "卸载"}
            </button>
          </span>
        ) : (
          <button
            onClick={() => doInstall("user")}
            disabled={actionLoading !== null}
            className="font-mono text-xs px-2.5 py-1 border border-accent-blue/50 text-accent-blue rounded hover:bg-accent-blue/10 transition-colors disabled:opacity-50"
          >
            {actionLoading === "user" ? "安装中..." : "User 级安装"}
          </button>
        )}

        {/* Project level */}
        {status?.project ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs">
            <span className="text-accent-green">&#10003; 已安装 (project)</span>
            <button
              onClick={() => doUninstall("project")}
              disabled={actionLoading !== null}
              className="text-accent-red/70 hover:text-accent-red hover:underline disabled:opacity-50"
            >
              {actionLoading === "un-project" ? "卸载中..." : "卸载"}
            </button>
          </span>
        ) : showProjectInput ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/your/project"
              className="font-mono text-xs px-2 py-1 border border-border dark:border-border light:border-light-border rounded bg-bg-primary dark:bg-bg-primary light:bg-light-bg-primary text-text-primary dark:text-text-primary light:text-light-text-primary w-56"
            />
            <button
              onClick={() => {
                if (projectPath.trim()) doInstall("project", projectPath.trim());
              }}
              disabled={actionLoading !== null || !projectPath.trim()}
              className="font-mono text-xs px-2 py-1 border border-accent-blue/50 text-accent-blue rounded hover:bg-accent-blue/10 transition-colors disabled:opacity-50"
            >
              {actionLoading === "project" ? "安装中..." : "确认"}
            </button>
            <button
              onClick={() => {
                setShowProjectInput(false);
                setProjectPath("");
              }}
              className="font-mono text-xs text-text-muted hover:text-text-primary"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowProjectInput(true)}
            disabled={actionLoading !== null}
            className="font-mono text-xs px-2.5 py-1 border border-border dark:border-border light:border-light-border text-text-secondary dark:text-text-secondary light:text-light-text-secondary rounded hover:border-accent-blue hover:text-accent-blue transition-colors disabled:opacity-50"
          >
            Project 级安装
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-accent-red">{error}</p>
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
