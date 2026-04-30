"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { RepoEntry, SkillCategory } from "@/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ReposPage() {
  const [repos, setRepos] = useState<RepoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SkillCategory | "all">("all");

  useEffect(() => {
    fetch(`${BASE_PATH}/api/repos`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRepos(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = repos.filter((repo) => {
    const matchSearch =
      !search ||
      `${repo.owner}/${repo.repo}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" || (repo.skillCount[filter] ?? 0) > 0;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton h-20 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border dark:border-border light:border-light-border"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary">
          已分析仓库
        </h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索..."
          className="flex-1 bg-transparent border-b border-border dark:border-border light:border-light-border font-mono text-sm text-text-primary dark:text-text-primary light:text-light-text-primary focus:outline-none focus:border-accent-blue py-1 placeholder:text-text-muted"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as SkillCategory | "all")}
          className="font-mono text-xs bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary border border-border dark:border-border light:border-light-border rounded px-2 py-1 text-text-primary dark:text-text-primary light:text-light-text-primary"
        >
          <option value="all">全部</option>
          <option value="skill">Skills</option>
          <option value="hook">Hooks</option>
          <option value="mcp">MCP</option>
          <option value="agent">Agents</option>
          <option value="command">Commands</option>
          <option value="rule">Rules</option>
        </select>
      </div>

      {filtered.length === 0 && repos.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-text-muted dark:text-text-muted light:text-light-text-muted">
            还没分析过仓库
          </p>
          <Link
            href="/"
            className="inline-block font-mono text-sm text-accent-blue hover:underline"
          >
            去首页分析 →
          </Link>
        </div>
      )}

      {filtered.length === 0 && repos.length > 0 && (
        <p className="text-center py-8 text-text-muted dark:text-text-muted light:text-light-text-muted">
          没有匹配的仓库
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((repo) => (
          <Link
            key={repo.slug}
            href={`/repo/${repo.slug}`}
            className="block px-4 py-3 border border-border dark:border-border light:border-light-border rounded-md hover:border-accent-blue transition-colors"
            role="article"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-accent-blue">
                {repo.owner}/{repo.repo}
              </span>
              <span className="text-xs text-text-muted dark:text-text-muted light:text-light-text-muted">
                {new Date(repo.analyzedAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
            <div className="font-mono text-xs text-text-secondary dark:text-text-secondary light:text-light-text-secondary mt-1">
              {formatSkillCount(repo.skillCount)}
            </div>
            {repo.aiSummary && (
              <p className="text-xs text-text-muted dark:text-text-muted light:text-light-text-muted mt-1 line-clamp-1">
                {repo.aiSummary}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
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
