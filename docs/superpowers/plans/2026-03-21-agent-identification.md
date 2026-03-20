# Agent 识别优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 Claude Code 官方 agent 定义和 README 辅助信息，用多信号置信度模型替换当前过于宽泛的 agent 识别逻辑，减少误判、错分和漏判。

**Architecture:** 三层识别 — (1) README 预解析提供 agent 白名单 (2) 文件位置信号（`agents/` 目录） (3) Frontmatter + 内容多信号打分。去重逻辑改为 agent 优先于 skill。

**Tech Stack:** TypeScript, gray-matter, Node.js fs API, 正则表达式

**Spec:** `docs/superpowers/specs/2026-03-21-agent-identification-design.md`

---

## File Structure

| 文件 | 职责 | 操作 |
|------|------|------|
| `src/types/index.ts` | 类型定义，新增 `confidenceSource` 字段 | Modify |
| `src/lib/analyzer/parsers/readme-parser.ts` | README 解析，提取 agent hints | Create |
| `src/lib/analyzer/parsers/agent-md.ts` | 置信度模型 + agent 候选扫描 | Rewrite |
| `src/lib/analyzer/parsers/skill-md.ts` | 移除 inferCategory 中 agent 分支 | Modify |
| `src/lib/analyzer/index.ts` | 集成新流程，改造去重逻辑 | Modify |

---

### Task 1: 扩展 SkillInfo 类型

**Files:**
- Modify: `src/types/index.ts:3-12`

- [ ] **Step 1: 在 SkillInfo 接口中添加 confidenceSource 可选字段**

```typescript
export interface SkillInfo {
  name: string;
  description: string;
  category: SkillCategory;
  version?: string;
  allowedTools?: string[];
  rawContent: string;
  filePath: string;
  source: "skill-md" | "claude-md" | "hooks" | "mcp" | "rule-md" | "agent-md";
  confidenceSource?: string;
}
```

- [ ] **Step 2: 验证构建通过**

Run: `cd /Users/wl/projects/awesome-claude-code-use && bun run build 2>&1 | tail -5`
Expected: 构建成功（新增可选字段不会破坏现有代码）

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add confidenceSource field to SkillInfo type"
```

---

### Task 2: 创建 README 解析器

**Files:**
- Create: `src/lib/analyzer/parsers/readme-parser.ts`

- [ ] **Step 1: 创建 readme-parser.ts**

```typescript
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface ReadmeAgentHint {
  name?: string;
  filePath?: string; // relative to repo root
}

/**
 * Parse README.md to extract agent hints.
 * Looks for agent file paths, tables, headings, and keyword references.
 */
export function parseReadmeForAgents(repoPath: string): ReadmeAgentHint[] {
  const readmePath = findReadme(repoPath);
  if (!readmePath) return [];

  try {
    const content = readFileSync(readmePath, "utf-8");
    const hints: ReadmeAgentHint[] = [];
    const seen = new Set<string>();

    const addHint = (hint: ReadmeAgentHint) => {
      const key = hint.filePath || hint.name || "";
      if (key && !seen.has(key)) {
        seen.add(key);
        hints.push(hint);
      }
    };

    // Pattern 1: File path references like agents/foo.md
    const pathRegex = /agents\/([\w.-]+\.md)/gi;
    for (const match of content.matchAll(pathRegex)) {
      addHint({ filePath: `agents/${match[1]}`, name: match[1].replace(/\.md$/, "") });
    }

    // Pattern 2: Table rows with "agent" type: | name | agent |
    const tableRegex = /\|\s*([\w.-]+)\s*\|\s*agent\s*\|/gi;
    for (const match of content.matchAll(tableRegex)) {
      addHint({ name: match[1] });
    }

    // Pattern 3: ## Agents heading followed by list items
    const headingRegex = /^#{1,3}\s+.*agents?\s*$/im;
    const headingMatch = content.match(headingRegex);
    if (headingMatch && headingMatch.index !== undefined) {
      const afterHeading = content.slice(headingMatch.index + headingMatch[0].length);
      // Extract list items until next heading or empty section
      const listItemRegex = /^[-*]\s+\**`?([\w.-]+)`?\**/gm;
      const lines = afterHeading.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        // Stop at next heading
        if (trimmed.startsWith("#")) break;
        const listMatch = trimmed.match(/^[-*]\s+\**`?([\w.-]+)`?\**/);
        if (listMatch) {
          addHint({ name: listMatch[1] });
        }
      }
    }

    // Pattern 4: List items with "agent" keyword
    const listAgentRegex = /[-*]\s+\*{0,2}`?([\w.-]+)`?\*{0,2}[^|\n]*\bagent\b/gi;
    for (const match of content.matchAll(listAgentRegex)) {
      addHint({ name: match[1] });
    }

    return hints;
  } catch {
    return [];
  }
}

/**
 * Find README.md in repo root (case-insensitive).
 */
function findReadme(repoPath: string): string | null {
  try {
    const entries = readdirSync(repoPath);
    const readme = entries.find((e) => e.toLowerCase() === "readme.md");
    return readme ? join(repoPath, readme) : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 验证构建通过**

Run: `cd /Users/wl/projects/awesome-claude-code-use && bun run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/lib/analyzer/parsers/readme-parser.ts
git commit -m "feat: add README parser for agent hint extraction"
```

---

### Task 3: 重写 agent-md.ts + skill-md.ts + index.ts（原子化改造）

> **Note:** 这三个文件的改动互相依赖（agent-md.ts 改了导出签名，index.ts 和 skill-md.ts 需要同步更新），必须在同一个 commit 中完成以保持构建不断。

**Files:**
- Rewrite: `src/lib/analyzer/parsers/agent-md.ts`
- Modify: `src/lib/analyzer/parsers/skill-md.ts:42`
- Modify: `src/lib/analyzer/index.ts`

- [ ] **Step 1: 重写 agent-md.ts**

```typescript
import { readFileSync, readdirSync, statSync } from "fs";
import { join, basename, relative } from "path";
import matter from "gray-matter";
import type { SkillInfo } from "@/types";

// Files to skip — known documentation, not agent definitions
const SKIP_FILES = new Set([
  "readme.md",
  "contributing.md",
  "changelog.md",
  "license.md",
  "code_of_conduct.md",
  "security.md",
  "skill.md",
]);

// Directories to skip
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "examples",
  "docs",
  "commands",
]);

// --- Confidence model ---

interface AgentSignal {
  source: "agents-dir" | "readme" | "frontmatter" | "content";
  signal: string;
  weight: "high" | "mid" | "low";
}

function isAgent(signals: AgentSignal[]): boolean {
  if (signals.some((s) => s.weight === "high")) return true;
  if (signals.filter((s) => s.weight === "mid").length >= 2) return true;
  return false;
}

function buildConfidenceSource(signals: AgentSignal[]): string {
  const highSignals = signals.filter((s) => s.weight === "high");
  if (highSignals.length > 0) return highSignals.map((s) => s.signal).join("+");
  const midSignals = signals.filter((s) => s.weight === "mid");
  return midSignals.map((s) => s.signal).join("+");
}

// --- Candidate scanning ---

export interface AgentCandidate {
  filePath: string;
  isInAgentsDir: boolean;
}

/**
 * Scan for agent candidate files. Returns metadata about each candidate.
 * First scans agents/ and .claude/agents/ directories (high confidence),
 * then scans remaining directories.
 */
export function findAgentCandidates(
  repoPath: string,
  maxDepth = 4
): AgentCandidate[] {
  const candidates: AgentCandidate[] = [];
  const seen = new Set<string>();

  // Priority scan: agents/ and .claude/agents/ directories
  const agentDirs = [
    join(repoPath, "agents"),
    join(repoPath, ".claude", "agents"),
  ];

  for (const agentDir of agentDirs) {
    for (const filePath of scanMdFiles(agentDir, 2, 0)) {
      if (!seen.has(filePath)) {
        seen.add(filePath);
        candidates.push({ filePath, isInAgentsDir: true });
      }
    }
  }

  // General scan: remaining directories
  for (const filePath of scanMdFiles(repoPath, maxDepth, 0)) {
    if (!seen.has(filePath)) {
      seen.add(filePath);
      candidates.push({ filePath, isInAgentsDir: false });
    }
  }

  return candidates;
}

/**
 * Recursively find .md files, skipping known non-agent files/dirs.
 */
function scanMdFiles(dir: string, maxDepth: number, depth: number): string[] {
  if (depth > maxDepth) return [];
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (SKIP_DIRS.has(lower) || SKIP_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isFile() && lower.endsWith(".md") && !SKIP_FILES.has(lower)) {
          results.push(fullPath);
        } else if (stat.isDirectory()) {
          results.push(...scanMdFiles(fullPath, maxDepth, depth + 1));
        }
      } catch {
        // Skip inaccessible
      }
    }
  } catch {
    // Skip inaccessible
  }

  return results;
}

// --- Agent parsing with confidence model ---

interface AgentParseContext {
  isInAgentsDir: boolean;
  isReadmeHinted: boolean;
}

/**
 * Parse a markdown file as an agent definition using the confidence model.
 * Returns SkillInfo only if confidence signals indicate this is a real agent.
 */
export function parseAgentMd(
  filePath: string,
  context: AgentParseContext
): SkillInfo | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);

    // Must have at least name and description in Frontmatter
    if (!data.name || !data.description) return null;

    // Skip command definitions
    if (data.command) return null;

    const name = String(data.name).trim();
    const description = String(data.description).trim();

    // Collect signals
    const signals: AgentSignal[] = [];

    // High confidence signals
    if (context.isInAgentsDir) {
      signals.push({ source: "agents-dir", signal: "agents-dir", weight: "high" });
    }
    if (context.isReadmeHinted) {
      signals.push({ source: "readme", signal: "readme", weight: "high" });
    }
    if (data.model && data.color) {
      signals.push({ source: "frontmatter", signal: "model+color", weight: "high" });
    }

    // Mid confidence signals
    if (data.model && !data.color) {
      signals.push({ source: "frontmatter", signal: "model", weight: "mid" });
    }
    if (/^use this agent when/i.test(description)) {
      signals.push({ source: "frontmatter", signal: "agent-description", weight: "mid" });
    }
    if (data.tools) {
      signals.push({ source: "frontmatter", signal: "tools", weight: "mid" });
    }
    if (/^you are\b/im.test(body.trim())) {
      signals.push({ source: "content", signal: "system-prompt", weight: "mid" });
    }

    // Low confidence signals (tracked but not sufficient alone)
    if (!data.model && data.color) {
      signals.push({ source: "frontmatter", signal: "color-only", weight: "low" });
    }

    if (!isAgent(signals)) return null;

    return {
      name,
      description: description.slice(0, 500),
      category: "agent",
      version: data.version ? String(data.version) : undefined,
      allowedTools: parseTools(data.tools),
      rawContent: content,
      filePath,
      source: "agent-md",
      confidenceSource: buildConfidenceSource(signals),
    };
  } catch {
    return null;
  }
}

function parseTools(tools: unknown): string[] | undefined {
  if (Array.isArray(tools)) return tools.map(String);
  if (typeof tools === "string") {
    return tools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return undefined;
}
```

- [ ] **Step 2: 移除 skill-md.ts 中的 agent 关键字推断**

将 `skill-md.ts` 第 42 行删除：
```typescript
  if (text.includes("agent")) return "agent";
```

修改后的 `inferCategory` 函数：

```typescript
function inferCategory(
  name: string,
  description: string,
  data: Record<string, unknown>
): SkillInfo["category"] {
  const text = `${name} ${description}`.toLowerCase();
  if (data.category) return String(data.category) as SkillInfo["category"];
  if (text.includes("hook")) return "hook";
  if (text.includes("mcp") || text.includes("server")) return "mcp";
  if (text.includes("command") || text.includes("cmd")) return "command";
  return "skill";
}
```

- [ ] **Step 3: 重写 index.ts 的 analyzeRepoFiles**

```typescript
import { readdirSync, statSync, existsSync } from "fs";
import { join, basename } from "path";
import { parseSkillMd } from "./parsers/skill-md";
import { parseClaudeMd } from "./parsers/claude-md";
import { parseHooksFromSettings } from "./parsers/hooks";
import { parseMcpConfig } from "./parsers/mcp";
import { findRuleFiles, parseRuleMd } from "./parsers/rule-md";
import { findAgentCandidates, parseAgentMd } from "./parsers/agent-md";
import { parseReadmeForAgents } from "./parsers/readme-parser";
import type { SkillInfo, SkillCategory, RepoAnalysis } from "@/types";

export function analyzeRepoFiles(
  repoPath: string,
  owner: string,
  repo: string
): RepoAnalysis {
  const skills: SkillInfo[] = [];

  // 1. Find and parse SKILL.md files
  const skillMdFiles = findFiles(repoPath, "SKILL.md");
  for (const f of skillMdFiles) {
    const skill = parseSkillMd(f);
    if (skill) skills.push(skill);
  }

  // 2. Find and parse CLAUDE.md files (root only)
  const claudeMdPath = join(repoPath, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    const skill = parseClaudeMd(claudeMdPath);
    if (skill) skills.push(skill);
  }

  // 3. Parse hooks from settings files
  const settingsFiles = [
    join(repoPath, ".claude", "settings.json"),
    join(repoPath, "settings.json"),
  ];
  for (const f of settingsFiles) {
    if (existsSync(f)) {
      skills.push(...parseHooksFromSettings(f));
    }
  }

  // 4. Parse MCP configurations
  const mcpFiles = [
    join(repoPath, ".claude", "settings.json"),
    join(repoPath, "mcp.json"),
    join(repoPath, ".mcp.json"),
  ];
  for (const f of mcpFiles) {
    if (existsSync(f)) {
      skills.push(...parseMcpConfig(f));
    }
  }

  // 5. Find and parse Rule files
  const ruleFiles = findRuleFiles(repoPath);
  for (const f of ruleFiles) {
    const rule = parseRuleMd(f);
    if (rule) skills.push(rule);
  }

  // 6. Parse README for agent hints
  const agentHints = parseReadmeForAgents(repoPath);
  const hintedNames = new Set(agentHints.map((h) => h.name).filter(Boolean));
  const hintedPaths = new Set(
    agentHints
      .map((h) => (h.filePath ? join(repoPath, h.filePath) : null))
      .filter(Boolean) as string[]
  );

  // 7. Find and parse Agent candidates with confidence model
  const candidates = findAgentCandidates(repoPath);
  for (const candidate of candidates) {
    const isReadmeHinted =
      hintedPaths.has(candidate.filePath) ||
      hintedNames.has(basename(candidate.filePath, ".md"));

    const agent = parseAgentMd(candidate.filePath, {
      isInAgentsDir: candidate.isInAgentsDir,
      isReadmeHinted,
    });
    if (agent) skills.push(agent);
  }

  // Deduplicate by name — agent takes priority over skill
  const nameMap = new Map<string, SkillInfo>();
  for (const s of skills) {
    const existing = nameMap.get(s.name);
    if (!existing) {
      nameMap.set(s.name, s);
    } else if (s.category === "agent" && existing.category === "skill") {
      // Agent classification takes priority over skill
      nameMap.set(s.name, s);
    }
  }
  const uniqueSkills = Array.from(nameMap.values());

  const skillCount: Record<SkillCategory, number> = {
    skill: 0,
    hook: 0,
    mcp: 0,
    agent: 0,
    command: 0,
    rule: 0,
  };
  for (const s of uniqueSkills) {
    skillCount[s.category]++;
  }

  return {
    slug: `${owner}-${repo}`,
    owner,
    repo,
    skills: uniqueSkills,
    analyzedAt: new Date().toISOString(),
    skillCount,
  };
}

function findFiles(
  dir: string,
  filename: string,
  maxDepth = 4,
  depth = 0
): string[] {
  if (depth > maxDepth) return [];

  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git" || entry === "dist") {
        continue;
      }

      const fullPath = join(dir, entry);

      try {
        const stat = statSync(fullPath);
        if (stat.isFile() && basename(fullPath) === filename) {
          results.push(fullPath);
        } else if (stat.isDirectory()) {
          results.push(...findFiles(fullPath, filename, maxDepth, depth + 1));
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return results;
}
```

- [ ] **Step 4: 验证构建通过**

Run: `cd /Users/wl/projects/awesome-claude-code-use && bun run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/lib/analyzer/parsers/agent-md.ts src/lib/analyzer/parsers/skill-md.ts src/lib/analyzer/index.ts
git commit -m "feat: rewrite agent identification with confidence model and README hints"
```

---

### Task 4: 端到端验证

- [ ] **Step 1: 完整构建验证**

Run: `cd /Users/wl/projects/awesome-claude-code-use && bun run build 2>&1 | tail -20`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 2: 启动 dev server 验证页面加载**

Run: `cd /Users/wl/projects/awesome-claude-code-use && timeout 10 bun run dev 2>&1 || true`
Expected: 服务启动成功

- [ ] **Step 3: 测试分析一个已知含 agent 的仓库**

通过浏览器或 curl 访问 `/api/analyze`，传入一个已知含 `agents/` 目录的仓库（如 `anthropics/claude-code`），验证：
- agent 被正确识别
- 普通 .md 文件不再被误判为 agent
- `confidenceSource` 字段有值

- [ ] **Step 4: 检查学习路径页面的 agent 计数**

访问学习路径页面，确认 agent 计数与实际匹配。
