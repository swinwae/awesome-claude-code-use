"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { SkillAccordion } from "@/components/SkillAccordion";
import type { RepoAnalysis, SkillInfo, SkillCategory } from "@/types";

const CATEGORIES: {
  key: SkillCategory;
  name: string;
  label: string;
  intro: string;
  howTo: string;
}[] = [
  {
    key: "rule",
    name: "Rules",
    label: "规范",
    intro:
      "Rules 是 Claude Code 中自动附加到对话上下文的项目规范文件。与需要用户显式调用的 Skills 不同，Rules 会在每次对话开始时自动加载，用于定义项目的编码规范、行为约束和上下文规则。",
    howTo: `在 .claude/rules/ 目录下创建 .md 文件：

.claude/rules/coding-style.md:

---
description: 项目编码风格规范
---

# 编码规范

- 使用 TypeScript strict 模式
- 变量命名使用 camelCase
- 组件命名使用 PascalCase
- 所有异步函数必须有错误处理

也支持 .cursor/rules/ 目录下的规则文件。
Rules 会自动生效，无需手动调用。`,
  },
  {
    key: "hook",
    name: "Hooks",
    label: "基础",
    intro:
      "Hooks 是 Claude Code 在特定事件（如工具调用前后、提交代码时）自动执行的脚本。它们是最基础的扩展机制，让你可以自动化常见的开发工作流。",
    howTo: `在 settings.json 中配置 hooks：

{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "echo 'About to run bash command'"
      }
    ],
    "PostToolUse": [...],
    "PreCommit": [...]
  }
}

常见事件: PreToolUse, PostToolUse, Notification, Stop`,
  },
  {
    key: "command",
    name: "Commands",
    label: "进阶",
    intro:
      "Commands 是通过 CLAUDE.md 定义的项目级指令和规范。它们告诉 Claude Code 如何在你的项目中工作 — 编码风格、测试规范、禁止的操作等。",
    howTo: `在项目根目录创建 CLAUDE.md：

# CLAUDE.md

## 编码规范
- 使用 TypeScript strict 模式
- 所有函数必须有 JSDoc 注释

## 测试规范
- 每个模块必须有单元测试
- 覆盖率不低于 80%

## 禁止的操作
- 不要修改 .env 文件
- 不要直接 push 到 main 分支`,
  },
  {
    key: "skill",
    name: "Skills",
    label: "核心",
    intro:
      "Skills 是 Claude Code 的核心扩展机制。每个 Skill 是一个带有 SKILL.md 的目录，定义了名称、描述、允许的工具和详细的执行指令。用户通过 /skill-name 调用。",
    howTo: `在 ~/.claude/skills/ 下创建目录和 SKILL.md：

~/.claude/skills/my-skill/SKILL.md:

---
name: my-skill
version: 1.0.0
description: 我的自定义技能
allowed-tools:
  - Read
  - Edit
  - Bash
---

# 技能指令

当用户调用 /my-skill 时，执行以下操作：
1. 读取当前目录结构
2. 分析代码质量
3. 生成报告`,
  },
  {
    key: "mcp",
    name: "MCP",
    label: "扩展",
    intro:
      "MCP (Model Context Protocol) 服务器为 Claude Code 提供外部工具和数据源。通过 MCP，Claude 可以访问数据库、API、文件系统等外部服务。",
    howTo: `在 .claude/settings.json 中配置 MCP 服务器：

{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my-org/mcp-server"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}

也可以使用 claude mcp add 命令快速添加。`,
  },
  {
    key: "agent",
    name: "Agents",
    label: "高级",
    intro:
      "Agents 是 Claude Code 中最高级的扩展形式。它们利用 Agent SDK 或 CLAUDE.md 中的 agent 定义来创建专门的 AI 工作流，可以自主完成复杂的多步骤任务。",
    howTo: `使用 Claude Agent SDK 创建自定义 Agent：

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// 定义工具
const tools = [
  {
    name: "read_file",
    description: "读取文件内容",
    input_schema: { ... }
  }
];

// 运行 Agent 循环
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  tools,
  messages: [{ role: "user", content: "分析这个项目" }]
});`,
  },
];

export default function LearnCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const [skills, setSkills] = useState<{ skill: SkillInfo; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryInfo = CATEGORIES.find((c) => c.key === category);

  useEffect(() => {
    // Load all analyzed repos and collect skills of this category
    fetch("/api/repos")
      .then((r) => r.json())
      .then(async (repos: { slug: string }[]) => {
        const allSkills: { skill: SkillInfo; slug: string }[] = [];
        for (const repo of repos) {
          try {
            const res = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                address: repo.slug.replace("-", "/"),
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const matching = data.analysis.skills.filter(
                (s: SkillInfo) => s.category === category
              );
              allSkills.push(
                ...matching.map((s: SkillInfo) => ({
                  skill: s,
                  slug: repo.slug,
                }))
              );
            }
          } catch {
            // Skip failed repos
          }
        }
        setSkills(allSkills);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  if (!categoryInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">未知的分类</p>
        <Link href="/" className="text-accent-blue hover:underline font-mono text-sm mt-2 inline-block">
          ← 返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Link href="/" className="text-text-muted hover:text-text-primary">
          ←
        </Link>
        <span className="font-mono text-xs text-text-muted">学习路径</span>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 font-mono text-sm overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.key}
            href={`/learn/${cat.key}`}
            className={`px-3 py-1.5 rounded border transition-colors whitespace-nowrap ${
              cat.key === category
                ? "border-accent-blue text-accent-blue"
                : "border-border text-text-secondary hover:border-accent-blue"
            }`}
            aria-current={cat.key === category ? "page" : undefined}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Category Intro */}
      <div className="space-y-3">
        <h1 className="text-lg font-bold text-text-primary dark:text-text-primary light:text-light-text-primary">
          什么是 {categoryInfo.name}？
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary light:text-light-text-secondary leading-relaxed">
          {categoryInfo.intro}
        </p>
      </div>

      {/* How To */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-text-primary dark:text-text-primary light:text-light-text-primary">
          如何创建自己的 {categoryInfo.name.slice(0, -1)}
        </h2>
        <pre className="p-4 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border dark:border-border light:border-light-border font-mono text-xs overflow-x-auto text-text-primary dark:text-text-primary light:text-light-text-primary">
          <code>{categoryInfo.howTo}</code>
        </pre>
      </div>

      {/* Skills from analyzed repos */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-text-primary dark:text-text-primary light:text-light-text-primary">
          来自已分析仓库的 {categoryInfo.name} 示例
        </h2>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="skeleton h-16 bg-bg-secondary dark:bg-bg-secondary light:bg-light-bg-secondary rounded-md border border-border"
              />
            ))}
          </div>
        )}

        {!loading && skills.length === 0 && (
          <div className="text-center py-8 text-text-muted dark:text-text-muted light:text-light-text-muted">
            <p>暂无该类型的技能示例</p>
            <Link
              href="/"
              className="text-accent-blue hover:underline font-mono text-sm mt-2 inline-block"
            >
              去首页分析一个仓库 →
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {skills.map(({ skill, slug: repoSlug }) => (
            <SkillAccordion key={`${skill.filePath}-${skill.name}`} skill={skill} slug={repoSlug} />
          ))}
        </div>
      </div>
    </div>
  );
}
