"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { SkillAccordion } from "@/components/SkillAccordion";
import type { RepoAnalysis, AiSummary, SkillCategory, InstallStatus } from "@/types";

export default function RepoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | "all">("all");
  const [installStatus, setInstallStatus] = useState<InstallStatus | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    // Load analysis
    fetch(`/api/repos`)
      .then((r) => r.json())
      .then(async () => {
        // We need the full analysis, load it
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: slug.replace("-", "/") }),
        });
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        setAnalysis(data.analysis);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Load AI summary
    setAiLoading(true);
    fetch("/api/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) setAiSummary(data.summary);
        if (data.error) setAiError(data.error);
      })
      .catch(() => setAiError("AI 摘要加载失败"))
      .finally(() => setAiLoading(false));

    // Check install status
    fetch(`/api/install-status?repo=${slug.replace("-", "/")}`)
      .then((r) => r.json())
      .then(setInstallStatus)
      .catch(() => {});
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-48 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded" />
        <div className="skeleton h-24 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border" />
        <div className="skeleton h-12 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-accent-red mb-3">{error}</p>
        <Link href="/repos" className="text-accent-blue hover:underline font-mono text-sm">
          ← 返回列表
        </Link>
      </div>
    );
  }

  if (!analysis) return null;

  const filteredSkills =
    categoryFilter === "all"
      ? analysis.skills
      : analysis.skills.filter((s) => s.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/repos"
            className="text-text-muted dark:text-text-muted light:text-light-text-muted hover:text-text-primary dark:hover:text-text-primary light:hover:text-light-text-primary"
          >
            ←
          </Link>
          <h1 className="font-mono text-lg text-text-primary dark:text-text-primary light:text-light-text-primary">
            {analysis.owner}/{analysis.repo}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setReanalyzing(true);
              setError("");
              try {
                const res = await fetch("/api/analyze", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ address: slug.replace("-", "/"), force: true }),
                });
                if (!res.ok) throw new Error("重新分析失败");
                const data = await res.json();
                setAnalysis(data.analysis);
                // Refresh AI summary
                setAiSummary(null);
                setAiLoading(true);
                fetch("/api/ai-summary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ slug }),
                })
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.summary) setAiSummary(d.summary);
                    else setAiError(d.error || "生成失败");
                  })
                  .catch(() => setAiError("AI 摘要加载失败"))
                  .finally(() => setAiLoading(false));
              } catch (err) {
                setError(err instanceof Error ? err.message : "重新分析失败");
              } finally {
                setReanalyzing(false);
              }
            }}
            disabled={reanalyzing}
            className="font-mono text-xs px-2 py-1 border border-border dark:border-border light:border-light-border rounded hover:border-accent-orange hover:text-accent-orange transition-colors text-text-muted disabled:opacity-50"
          >
            {reanalyzing ? "分析中..." : "重新分析"}
          </button>
        {installStatus && (
          <span
            className={`font-mono text-xs px-2 py-1 rounded ${
              installStatus.installed
                ? "text-accent-green border border-accent-green/30"
                : installStatus.broken
                  ? "text-accent-orange border border-accent-orange/30"
                  : "text-text-muted border border-border dark:border-border light:border-light-border"
            }`}
          >
            {installStatus.installed
              ? "已安装 ✓"
              : installStatus.broken
                ? "已损坏"
                : "未安装"}
          </span>
        )}
        </div>
      </div>

      {/* AI Summary */}
      <div className="border border-border dark:border-border light:border-light-border rounded-md p-4 space-y-2">
        <h2 className="font-mono text-xs uppercase text-text-muted dark:text-text-muted light:text-light-text-muted">
          AI 智能摘要
        </h2>
        {aiLoading && (
          <div className="space-y-2">
            <div className="skeleton h-4 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded w-full" />
            <div className="skeleton h-4 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded w-3/4" />
            <div className="skeleton h-4 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary rounded w-1/2" />
            <p className="text-xs text-text-muted dark:text-text-muted light:text-light-text-muted">AI 分析中...</p>
          </div>
        )}
        {aiError && !aiSummary && (
          <div className="text-sm text-text-muted dark:text-text-muted light:text-light-text-muted">
            <p>{aiError}</p>
            <button
              onClick={() => {
                setAiError("");
                setAiLoading(true);
                fetch("/api/ai-summary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ slug }),
                })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.summary) setAiSummary(data.summary);
                    else setAiError(data.error || "生成失败");
                  })
                  .catch(() => setAiError("生成失败"))
                  .finally(() => setAiLoading(false));
              }}
              className="mt-2 text-xs text-accent-blue hover:underline"
            >
              手动触发 →
            </button>
          </div>
        )}
        {aiSummary && (
          <div className="space-y-3">
            <p className="text-sm text-text-primary dark:text-text-primary light:text-light-text-primary">{aiSummary.summary}</p>
            <div>
              <h3 className="font-mono text-xs text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">设计意图</h3>
              <p className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary">{aiSummary.designIntent}</p>
            </div>
            {aiSummary.keyPoints.length > 0 && (
              <div>
                <h3 className="font-mono text-xs text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">核心要点</h3>
                <ul className="list-disc list-inside text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary space-y-0.5">
                  {aiSummary.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiSummary.usageGuide && (
              <div>
                <h3 className="font-mono text-xs text-text-muted dark:text-text-muted light:text-light-text-muted mb-1">使用指南</h3>
                <p className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary whitespace-pre-wrap">{aiSummary.usageGuide}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Install Guide */}
      <div className="border border-border dark:border-border light:border-light-border rounded-md p-4">
        <h2 className="font-mono text-xs uppercase text-text-muted dark:text-text-muted light:text-light-text-muted mb-2">
          安装方式
        </h2>
        <p className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary">
          通过下方技能列表中每个 Skill 的安装按钮，按需安装到 User 级（全局）或 Project 级（指定项目）。
        </p>
      </div>

      {/* Skill List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-mono text-xs uppercase text-text-muted dark:text-text-muted light:text-light-text-muted">
            技能列表
          </h2>
          <div className="flex gap-1 font-mono text-xs">
            {(["all", "skill", "hook", "mcp", "agent", "command", "rule"] as const).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    categoryFilter === cat
                      ? "border-accent-blue text-accent-blue"
                      : "border-border dark:border-border light:border-light-border text-text-secondary dark:text-text-secondary light:text-light-text-secondary hover:border-accent-blue"
                  }`}
                >
                  {cat === "all"
                    ? `All:${analysis.skills.length}`
                    : `${cat}:${analysis.skillCount[cat]}`}
                </button>
              )
            )}
          </div>
        </div>

        {filteredSkills.length === 0 && (
          <p className="text-sm text-text-muted dark:text-text-muted light:text-light-text-muted py-4 text-center">
            未发现该类型的技能文件
          </p>
        )}

        <div className="space-y-2">
          {filteredSkills.map((skill) => (
            <SkillAccordion key={skill.name} skill={skill} slug={slug} />
          ))}
        </div>
      </div>
    </div>
  );
}
