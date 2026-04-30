"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RepoEntry } from "@/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const EXAMPLES = ["garrytan/gstack", "anthropics/prompt-eng-interactive-tutorial"];

const LEARNING_PATH = [
  { name: "Hooks", label: "基础", href: "/learn/hook" },
  { name: "Rules", label: "规范", href: "/learn/rule" },
  { name: "Commands", label: "进阶", href: "/learn/command" },
  { name: "Skills", label: "核心", href: "/learn/skill" },
  { name: "MCP", label: "扩展", href: "/learn/mcp" },
  { name: "Agents", label: "高级", href: "/learn/agent" },
];

export default function HomePage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [recentRepos, setRecentRepos] = useState<RepoEntry[]>([]);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/repos`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentRepos(data.slice(-3).reverse());
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async (forceReanalyze = false) => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("请输入仓库地址");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setError("请输入 owner/repo 格式");
      return;
    }

    setError("");
    setLoading(true);
    setStep(1);

    try {
      setStep(1); // 克隆中
      const res = await fetch(`${BASE_PATH}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed, force: forceReanalyze || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "分析失败");
      }

      setStep(3); // 完成
      const data = await res.json();

      // Trigger AI summary in background
      fetch(`${BASE_PATH}/api/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: data.analysis.slug }),
      }).catch(() => {});

      router.push(`/repo/${data.analysis.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
      setLoading(false);
      setStep(0);
    }
  };

  return (
    <div className="space-y-10 pt-8">
      {/* Terminal-style input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-accent-green text-sm">$</span>
          <span className="font-mono text-text-secondary dark:text-text-secondary light:text-light-text-secondary text-sm">
            analyze
          </span>
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleAnalyze(); }}
            placeholder="owner/repo"
            className="flex-1 bg-transparent border-b border-border dark:border-border light:border-light-border font-mono text-sm text-text-primary dark:text-text-primary light:text-light-text-primary focus:outline-none focus:border-accent-blue py-1 placeholder:text-text-muted dark:placeholder:text-text-muted light:placeholder:text-light-text-muted"
            aria-label="输入 GitHub 仓库地址"
            disabled={loading}
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="font-mono text-sm px-3 py-1 bg-bg-tertiary dark:bg-bg-tertiary light:bg-light-bg-tertiary border border-border dark:border-border light:border-light-border rounded hover:border-accent-blue transition-colors disabled:opacity-50 text-text-primary dark:text-text-primary light:text-light-text-primary"
          >
            {loading ? "..." : "Enter"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="font-mono text-xs text-accent-red pl-5">{error}</p>
        )}

        {/* Progress */}
        {loading && (
          <div className="pl-5 space-y-2">
            <div className="flex items-center gap-3 font-mono text-xs">
              <StepIndicator active={step >= 1} done={step > 1} />
              <span className={step >= 1 ? "text-text-primary dark:text-text-primary light:text-light-text-primary" : "text-text-muted"}>
                克隆仓库
              </span>
              <StepIndicator active={step >= 2} done={step > 2} />
              <span className={step >= 2 ? "text-text-primary dark:text-text-primary light:text-light-text-primary" : "text-text-muted"}>
                解析文件
              </span>
              <StepIndicator active={step >= 3} done={step > 3} />
              <span className={step >= 3 ? "text-text-primary dark:text-text-primary light:text-light-text-primary" : "text-text-muted"}>
                生成索引
              </span>
            </div>
          </div>
        )}

        {/* Examples */}
        {!loading && (
          <div className="pl-5 flex items-center gap-2 font-mono text-xs text-text-muted dark:text-text-muted light:text-light-text-muted">
            <span>try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setAddress(ex)}
                className="text-accent-blue hover:underline"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Learning Path */}
      <div className="space-y-3">
        <div className="font-mono text-xs text-text-muted dark:text-text-muted light:text-light-text-muted flex items-center gap-2">
          <span className="flex-1 border-t border-border dark:border-border light:border-light-border" />
          <span>学习路径</span>
          <span className="flex-1 border-t border-border dark:border-border light:border-light-border" />
        </div>
        <div className="flex items-center justify-center gap-1 overflow-x-auto">
          {LEARNING_PATH.map((item, i) => (
            <div key={item.name} className="flex items-center gap-1">
              <Link
                href={item.href}
                className="font-mono text-sm px-3 py-1.5 border border-border dark:border-border light:border-light-border rounded hover:border-accent-blue hover:text-accent-blue transition-colors text-text-primary dark:text-text-primary light:text-light-text-primary"
              >
                <div>{item.name}</div>
                <div className="text-xs text-text-muted dark:text-text-muted light:text-light-text-muted">
                  {item.label}
                </div>
              </Link>
              {i < LEARNING_PATH.length - 1 && (
                <span className="text-text-muted dark:text-text-muted light:text-light-text-muted">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Repos */}
      {recentRepos.length > 0 && (
        <div className="space-y-3">
          <div className="font-mono text-xs text-text-muted dark:text-text-muted light:text-light-text-muted flex items-center gap-2">
            <span className="flex-1 border-t border-border dark:border-border light:border-light-border" />
            <span>最近分析</span>
            <span className="flex-1 border-t border-border dark:border-border light:border-light-border" />
          </div>
          <div className="space-y-2">
            {recentRepos.map((repo) => (
              <div
                key={repo.slug}
                className="flex items-center gap-2 px-4 py-2 border border-border dark:border-border light:border-light-border rounded hover:border-accent-blue transition-colors"
              >
                <Link
                  href={`/repo/${repo.slug}`}
                  className="flex-1 min-w-0"
                >
                  <div className="font-mono text-sm text-accent-blue">
                    {repo.owner}/{repo.repo}
                  </div>
                  <div className="font-mono text-xs text-text-muted dark:text-text-muted light:text-light-text-muted mt-0.5">
                    {formatSkillCount(repo.skillCount)}
                  </div>
                </Link>
                <button
                  onClick={async () => {
                    setError("");
                    setLoading(true);
                    setStep(1);
                    try {
                      const res = await fetch(`${BASE_PATH}/api/analyze`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ address: `${repo.owner}/${repo.repo}`, force: true }),
                      });
                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "重新分析失败");
                      }
                      setStep(3);
                      const data = await res.json();
                      fetch(`${BASE_PATH}/api/ai-summary`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ slug: data.analysis.slug }),
                      }).catch(() => {});
                      router.push(`/repo/${data.analysis.slug}`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "重新分析失败");
                      setLoading(false);
                      setStep(0);
                    }
                  }}
                  disabled={loading}
                  className="shrink-0 font-mono text-xs px-2 py-1 border border-border dark:border-border light:border-light-border rounded hover:border-accent-orange hover:text-accent-orange transition-colors text-text-muted disabled:opacity-50"
                  title="重新分析"
                >
                  重新分析
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRepos.length === 0 && !loading && (
        <p className="text-center text-sm text-text-muted dark:text-text-muted light:text-light-text-muted">
          还没分析过仓库，试试输入 garrytan/gstack
        </p>
      )}
    </div>
  );
}

function StepIndicator({ active, done }: { active: boolean; done: boolean }) {
  if (done) return <span className="text-accent-green">●</span>;
  if (active) return <span className="text-accent-orange skeleton">●</span>;
  return <span className="text-text-muted">○</span>;
}

function formatSkillCount(count: Record<string, number>): string {
  const parts = [];
  if (count.skill) parts.push(`${count.skill} Skills`);
  if (count.hook) parts.push(`${count.hook} Hooks`);
  if (count.mcp) parts.push(`${count.mcp} MCP`);
  if (count.agent) parts.push(`${count.agent} Agents`);
  if (count.command) parts.push(`${count.command} Commands`);
  if (count.rule) parts.push(`${count.rule} Rules`);
  return parts.join(" · ") || "无技能文件";
}
