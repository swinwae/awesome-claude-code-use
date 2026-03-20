# Awesome Claude Code

Claude Code 技能可视化学习平台。一个现代化的 Web 应用，用于分析 GitHub 仓库中的 Claude Code 技能（Skills, Hooks, MCP, Agents, Commands）并提供智能的可视化学习界面。

## 功能特点

- **自动分析** - 输入仓库地址即可自动克隆、解析和分析
- **多策略解析** - 支持 SKILL.md、CLAUDE.md、settings.json（Hooks）、MCP 配置、Rules、Agent 等多种格式
- **AI 智能摘要** - 基于 Kimi API 的智能内容理解和总结
- **学习路径** - 从基础到高级的结构化学习：Hooks → Commands → Skills → MCP → Agents → Rules
- **重新分析** - 支持强制拉取最新代码并重新分析，清理陈旧摘要数据
- **一键安装** - 自动识别 Claude Code 安装状态，支持一键链接到 `~/.claude/skills/`
- **缓存机制** - 智能缓存避免重复分析，提升性能
- **终端风格 UI** - 暗色主题、终端式交互，极客友好的设计

## 快速开始

### 前置要求

- **Node.js & Bun** - 项目使用 Bun 作为运行时
  ```bash
  # 如未安装 Bun，运行：
  curl -fsSL https://bun.sh/install | bash
  ```
- **Git** - 用于克隆分析的仓库
- **KIMI_API_KEY** - 用于 AI 摘要功能（可选，没有 API 密钥时功能降级）

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/awesome-claude-code-use.git
cd awesome-claude-code-use

# 2. 安装依赖
bun install

# 3. 配置环境变量
# 创建 .env.local 文件并添加：
# KIMI_API_KEY=your-api-key
# KIMI_BASE_URL=https://api.moonshot.cn/v1

# 4. 启动开发服务器
bun dev

# 5. 打开浏览器访问 http://localhost:3000
```

### 安装到 Claude Code

```bash
# 运行安装脚本，自动链接到 ~/.claude/skills/
./setup

# 或手动链接
ln -snf $(pwd) ~/.claude/skills/awesome-claude-code-use
```

## 项目结构

```
awesome-claude-code-use/
├── src/
│   ├── app/                          # Next.js 应用
│   │   ├── api/                      # API 路由
│   │   │   ├── analyze/route.ts      # POST 分析仓库
│   │   │   ├── repos/route.ts        # GET 仓库列表
│   │   │   ├── ai-summary/route.ts   # POST AI 摘要
│   │   │   └── install-status/route.ts # GET 安装状态
│   │   ├── learn/[category]/page.tsx # 学习路径页面（支持 hook/command/skill/mcp/agent/rule）
│   │   ├── repo/[slug]/page.tsx      # 仓库详情页面
│   │   ├── repos/page.tsx            # 仓库列表页面
│   │   ├── layout.tsx                # 全局布局
│   │   └── page.tsx                  # 首页（终端式输入）
│   ├── lib/                          # 核心库
│   │   ├── analyzer/                 # 仓库分析引擎
│   │   │   ├── index.ts              # 主分析流程
│   │   │   ├── git.ts                # Git 操作（clone、validate）
│   │   │   └── parsers/              # 多格式解析器
│   │   │       ├── skill-md.ts       # SKILL.md frontmatter 解析
│   │   │       ├── claude-md.ts      # CLAUDE.md 解析
│   │   │       ├── hooks.ts          # settings.json Hooks 解析
│   │   │       ├── mcp.ts            # MCP 配置解析
│   │   │       ├── rule-md.ts        # Rule 文件解析（.claude/rules/, .cursor/rules/）
│   │   │       ├── agent-md.ts       # Agent 置信度识别（多信号打分模型）
│   │   │       └── readme-parser.ts  # README 解析（提取 agent hints）
│   │   ├── cache.ts                  # JSON 文件缓存管理
│   │   ├── kimi.ts                   # Kimi API 客户端
│   │   └── install.ts                # Claude Code 安装检测
│   ├── components/                   # React 组件
│   │   ├── ThemeProvider.tsx         # 主题提供者
│   │   ├── Nav.tsx                   # 导航栏
│   │   ├── SkillAccordion.tsx        # 技能手风琴组件
│   │   └── CopyButton.tsx            # 复制按钮组件
│   ├── types/                        # TypeScript 类型定义
│   │   └── index.ts                  # 统一类型导出
│   └── globals.css                   # 全局样式
├── data/                             # 运行时缓存（gitignore）
│   ├── analysis/                     # 分析结果缓存
│   └── ai-summaries/                 # AI 摘要缓存
├── docs/
│   └── designs/                      # 设计文档
├── setup                             # 安装脚本
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── README.md
```

## 技术架构

### 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.3+ | Web 框架（App Router）|
| React | 19.1+ | UI 库 |
| TypeScript | 5.8+ | 类型安全 |
| Tailwind CSS | 4.1+ | 样式引擎（暗色优先）|
| Bun | 最新 | 运行时 & 包管理器 |
| Shiki | 3.4+ | 服务端代码高亮 |
| gray-matter | 4.0+ | Frontmatter 解析 |
| yaml | 2.7+ | YAML 配置解析 |

### 分析流程

```
输入仓库地址 (owner/repo) + 可选 force 参数
  ↓
验证格式 (正则: /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/)
  ↓
检查本地缓存 (data/analysis/{slug}.json)
  ↓ (如果缓存未命中或 force=true)
Git Clone/Pull → ~/.claude/skills-repo/{owner}/{repo}/
  ↓
多策略文件解析：
  ├─ 递归查找 SKILL.md (深度 4，忽略 node_modules/.git/dist)
  ├─ 解析 CLAUDE.md (仓库根目录)
  ├─ 解析 Hooks (settings.json)
  ├─ 解析 MCP 配置 (mcp.json/.mcp.json)
  ├─ 解析 Rule 文件 (.claude/rules/, .cursor/rules/, .clinerules, .cursorrules)
  ├─ 解析 README.md（提取 agent hints 白名单）
  └─ Agent 置信度识别（agents/ 目录 + README hints + frontmatter 信号打分）
  ↓
去重 & 统计 (按 category，agent 优先于 skill)
  ↓
保存分析结果到 data/analysis/{slug}.json
  ↓
(后台异步) 触发 AI 摘要请求
  ↓
返回结果 & 渲染详情页
```

### 缓存策略

- **分析缓存** - `data/analysis/{slug}.json`
  - 存储仓库文件解析结果
  - 避免重复克隆和解析

- **AI 摘要缓存** - `data/ai-summaries/{slug}.json`
  - 缓存 Kimi API 的摘要结果
  - 延迟加载，后台异步生成

- **Git 缓存** - `~/.claude/skills-repo/{owner}/{repo}/`
  - 本地仓库副本
  - 支持增量更新

## API 文档

### POST `/api/analyze`

分析 GitHub 仓库中的 Claude Code 技能。

**请求体：**
```json
{
  "address": "owner/repo",
  "force": false
}
```

**参数说明：**
- `address` (必填) - GitHub 仓库地址 (owner/repo 格式)
- `force` (可选，默认 false) - 是否强制重新分析
  - `true`: 跳过缓存，拉取最新代码，清理陈旧摘要
  - `false`: 优先使用缓存，第一次时自动克隆

**响应（成功，200）：**
```json
{
  "analysis": {
    "slug": "owner-repo",
    "owner": "owner",
    "repo": "repo",
    "skills": [
      {
        "name": "skill_name",
        "description": "描述",
        "category": "skill|hook|mcp|agent|command|rule",
        "version": "1.0.0",
        "allowedTools": ["tool1", "tool2"],
        "rawContent": "...",
        "filePath": "/path/to/file",
        "source": "skill-md|claude-md|hooks|mcp|rule-md"
      }
    ],
    "analyzedAt": "2024-03-19T10:00:00.000Z",
    "skillCount": {
      "skill": 5,
      "hook": 3,
      "mcp": 2,
      "agent": 1,
      "command": 4,
      "rule": 2
    }
  },
  "fromCache": false
}
```

**错误响应：**
```json
{
  "error": "请输入 owner/repo 格式的仓库地址"
}
```

### GET `/api/repos`

获取已分析的仓库列表。

**响应（200）：**
```json
[
  {
    "slug": "owner-repo",
    "owner": "owner",
    "repo": "repo",
    "analyzedAt": "2024-03-19T10:00:00.000Z",
    "skillCount": { "skill": 5, "hook": 3, "mcp": 2, "agent": 1, "command": 4, "rule": 2 },
    "aiSummary": "..." // 可选
  }
]
```

### POST `/api/ai-summary`

生成仓库的 AI 摘要（异步请求）。

**请求体：**
```json
{
  "slug": "owner-repo"
}
```

**响应（200）：**
```json
{
  "summary": "整体摘要",
  "designIntent": "设计意图",
  "keyPoints": ["要点1", "要点2"],
  "usageGuide": "使用指南",
  "generatedAt": "2024-03-19T10:00:00.000Z"
}
```

### GET `/api/install-status`

检查 Claude Code 安装状态和链接情况。

**响应（200）：**
```json
{
  "installed": true,
  "path": "/Users/username/.claude/skills/awesome-claude-code-use"
}
```

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 首页 - 终端式仓库输入 + 学习路径导航 |
| `/repos` | ReposPage | 仓库列表 - 查看所有已分析的仓库 |
| `/repo/[slug]` | RepoDetailPage | 仓库详情 - 技能列表、AI 摘要、源码查看、重新分析 |
| `/learn/[category]` | LearnPage | 学习路径 - 按类型过滤技能（hook/command/skill/mcp/agent/rule）|

## 环境变量

创建 `.env.local` 文件，配置以下变量：

```bash
# Kimi API 配置（用于 AI 摘要）
KIMI_API_KEY=sk-your-api-key-here
KIMI_BASE_URL=https://api.moonshot.cn/v1
```

**获取 Kimi API Key：**
1. 访问 [Moonshot AI 控制台](https://console.moonshot.cn)
2. 创建 API 密钥
3. 复制到 `.env.local`

如果不配置 API 密钥，AI 摘要功能将不可用，但仓库分析功能不受影响。

## 类型定义

### SkillInfo

```typescript
interface SkillInfo {
  name: string;                              // 技能名称
  description: string;                       // 技能描述
  category: "skill" | "hook" | "mcp" | "agent" | "command" | "rule";
  version?: string;                          // 版本号
  allowedTools?: string[];                   // 允许的工具列表
  rawContent: string;                        // 原始内容
  filePath: string;                          // 源文件路径
  source: "skill-md" | "claude-md" | "hooks" | "mcp" | "rule-md" | "agent-md"; // 数据源
  confidenceSource?: string;                 // Agent 识别来源（如 "agents-dir", "model+tools"）
}
```

### RepoAnalysis

```typescript
interface RepoAnalysis {
  slug: string;                              // 仓库标识 (owner-repo)
  owner: string;                             // GitHub owner
  repo: string;                              // 仓库名
  skills: SkillInfo[];                       // 技能列表
  analyzedAt: string;                        // ISO 时间戳
  skillCount: Record<SkillCategory, number>; // 各类型统计
}
```

## 关键设计决策

### 1. 本地缓存 vs 数据库
- **选择**：JSON 文件缓存
- **理由**：无服务依赖、部署简单、适合中等数据量

### 2. 仓库存储位置
- **位置**：`~/.claude/skills-repo/{owner}/{repo}/`
- **理由**：遵循 Claude Code 规范、便于管理、支持多用户

### 3. 多策略解析
- **支持格式**：SKILL.md (frontmatter) → CLAUDE.md → settings.json (Hooks) → MCP 配置 → Rule 文件 → README (agent hints) → Agent 文件 (置信度模型)
- **理由**：兼容现有 Claude 生态、灵活适配不同项目结构、基于官方定义精准识别 agent

### 4. AI 摘要延迟加载
- **设计**：分析时触发异步请求、自动缓存结果
- **理由**：提升首屏性能、避免 API 超时、提高用户体验

### 5. 学习路径分层
- **顺序**：Hooks (基础) → Commands (进阶) → Skills (核心) → MCP (扩展) → Agents (高级) → Rules (规范)
- **理由**：符合认知阶梯、降低学习曲线、结构化导学

### 6. 重新分析机制
- **设计**：支持 `force=true` 参数跳过缓存、拉取最新代码、清理陈旧摘要
- **理由**：保证数据新鲜度、支持迭代开发、提高用户灵活性

## 开发指南

### 本地开发

```bash
# 安装依赖
bun install

# 启动开发服务器（支持 Turbopack）
bun dev

# 生产构建
bun build

# 启动生产服务器
bun start

# 代码检查
bun lint
```

### 添加新的解析器

在 `src/lib/analyzer/parsers/` 目录下创建新文件，例如 `custom.ts`：

```typescript
import type { SkillInfo } from "@/types";

export function parseCustomFormat(filePath: string): SkillInfo[] {
  // 实现解析逻辑
  return [];
}
```

然后在 `src/lib/analyzer/index.ts` 中集成：

```typescript
import { parseCustomFormat } from "./parsers/custom";

// 在 analyzeRepoFiles 中调用
skills.push(...parseCustomFormat(filePath));
```

### 添加新的学习路径

在 `src/app/page.tsx` 的 `LEARNING_PATH` 数组中添加新项，然后在 `src/app/learn/[category]/page.tsx` 中实现对应页面。

### 调试技巧

- **缓存清理** - 删除 `data/` 目录重新分析
- **Git 缓存** - 删除 `~/.claude/skills-repo/` 重新克隆
- **API 日志** - Next.js 服务端日志会显示在开发服务器输出

## 常见问题

### Q: 为什么分析失败？
**A:** 检查以下几点：
1. 仓库地址格式是否正确（owner/repo）
2. GitHub 仓库是否公开且可访问
3. 是否有网络连接
4. 磁盘空间是否充足（大仓库可能需要几百 MB）

### Q: 如何离线使用？
**A:** 第一次分析后，仓库和分析结果会被缓存。后续访问同一仓库时，不需要网络连接。

### Q: AI 摘要不生成？
**A:** 检查：
1. `.env.local` 中是否正确配置了 `KIMI_API_KEY`
2. API 配额是否充足
3. 网络连接是否正常

### Q: 如何更新已分析的仓库？
**A:** 在仓库详情页点击"重新分析"按钮，或调用 API 时传入 `force: true` 参数。系统将自动拉取最新代码、清理陈旧摘要、生成新分析。

### Q: Rule 文件是什么？
**A:** Rule 是 Claude Code 规则文件，支持以下位置：
- `.claude/rules/*.md`
- `.cursor/rules/*.md`
- 根目录 `.clinerules` 或 `.cursorrules` 文件

系统会自动发现和解析这些文件，将其作为"rule"类型的技能展示和学习。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

```bash
# Fork 项目
# 创建特性分支
git checkout -b feature/your-feature

# 提交更改
git commit -am "Add some feature"

# 推送到分支
git push origin feature/your-feature

# 创建 Pull Request
```

## 许可证

MIT

## 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - 样式引擎
- [Bun](https://bun.sh/) - JavaScript 运行时
- [Shiki](https://shiki.matsu.io/) - 代码高亮
- [Moonshot AI](https://www.moonshot.cn/) - Kimi API

---

**需要帮助？**
- 查看 [GitHub Issues](https://github.com/yourusername/awesome-claude-code-use/issues)
- 提交 [Discussion](https://github.com/yourusername/awesome-claude-code-use/discussions)
