# Awesome Claude Code

Claude Code 技能可视化学习平台。

## Tech Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (暗色优先)
- Bun runtime
- AI 摘要双引擎：Kimi (moonshot-v1-8k) + DeepSeek (deepseek-chat)，自动 fallback
- shiki 用于服务端代码高亮
- JSON 文件缓存（无 DB）

## 项目结构
- `src/app/` - Next.js 页面和 API 路由
  - `api/analyze/route.ts` - 仓库分析 API（支持 `force` 参数）
  - `api/install/route.ts` - Skill 安装/卸载 API
  - `api/install-status/route.ts` - Skill 安装状态查询 API
  - `learn/[category]/page.tsx` - 学习路径页面（支持 rule 类型）
  - `repo/[slug]/page.tsx` - 仓库详情页（含重新分析按钮）
- `src/lib/` - 核心库（解析器、缓存、AI 客户端、安装检测）
  - `ai-client.ts` - AI 多引擎客户端（Kimi + DeepSeek fallback）
  - `install.ts` - Skill 级安装/卸载/状态检测（符号链接方式）
  - `analyzer/` - 仓库分析引擎
    - `git.ts` - Git 操作（`cloneRepo`、`pullRepo`）
    - `parsers/` - 多格式解析器（SKILL.md、CLAUDE.md、Hooks、MCP、Rules、Agents）
      - `rule-md.ts` - Rule 文件解析
      - `agent-md.ts` - Agent 置信度识别（多信号打分模型）
      - `readme-parser.ts` - README 解析（提取 agent hints）
  - `cache.ts` - 缓存管理（含 `deleteAiSummary()`）
- `src/components/` - React 组件
- `src/types/` - TypeScript 类型
- `docs/designs/` - 设计文档
- `data/` - 运行时缓存数据（gitignore）
- `setup` - 旧版安装脚本（已被 Skill 级安装取代）

## 开发
```bash
bun install
bun dev
```

## SkillCategory 类型支持
支持以下技能类型：`skill`、`hook`、`mcp`、`agent`、`command`、**`rule`**

## Skill 级安装功能

通过符号链接按需安装单个 Skill，支持两个级别：

**User 级**（全局）：`~/.claude/skills/{skillName}` → `~/.claude/skills-repo/{owner}/{repo}/{skill-dir}/`
**Project 级**（指定项目）：`{projectPath}/.claude/skills/{skillName}` → 同上

**核心逻辑（`install.ts`）：**
- `installSkill()` — 创建符号链接
- `uninstallSkill()` — 删除符号链接（仅删除 symlink，拒绝删除真实目录）
- `checkSkillInstallStatus()` — 检查 user/project 两级安装状态
- `validateSkillName()` — 只允许 `[a-zA-Z0-9._-]`，防止路径穿越

**API**：`POST /api/install` 接收 `{action, owner, repo, filePath, skillName, level, projectPath?}`

**UI**：`SkillAccordion` 中仅对 `category=skill` 的技能显示安装区域

**安全措施**：
- skillName 正则校验（禁止 `/`、`..`）
- source path 必须在 `~/.claude/skills-repo/` 内
- owner/repo 格式校验
- filePath 禁止包含 `..`
- 卸载时 lstatSync 确认是符号链接才删除

## 关键设计决策

### Git 仓库管理
- 仓库克隆位置：`~/.claude/skills-repo/{owner}/{repo}/`
- Clone 参数：`--depth=1 --single-branch --no-tags`（减小体积）
- Clone 超时：180 秒（支持大仓库）
- 增量更新策略（`pullRepo()`）：
  1. 如果本地已有，优先 `git pull --ff-only`（快速更新）
  2. 如果 pull 失败（冲突/diverged），删除重新克隆
  3. 第一次分析自动克隆，`force=true` 时重新拉取

### 缓存策略
- **分析缓存** - `data/analysis/{slug}.json`
  - 存储仓库文件解析结果
  - `force=true` 时跳过缓存，重新分析
- **AI 摘要缓存** - `data/ai-summaries/{slug}.json`
  - 延迟加载、后台异步生成
  - `force=true` 时删除旧摘要，触发重新生成

### 仓库验证和解析
- 地址正则验证：`/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/`
- 多策略解析顺序：SKILL.md → CLAUDE.md → Hooks → MCP → Rules → README(agent hints) → Agents(置信度模型)
- 去重：按 name 字段去重（agent 分类优先于 skill，其余同名取首个）

## 重新分析功能（Re-analysis）
API 参数：`POST /api/analyze` 支持 `force` 参数

**`force=false`（默认）：**
- 优先使用 `data/analysis/{slug}.json`
- 缓存未命中时自动 clone

**`force=true`：**
- 跳过分析缓存
- 执行 `pullRepo()` 拉取最新代码（含 git pull）
- 删除旧 AI 摘要（调用 `deleteAiSummary()`）
- 生成新的分析结果
- 清理 AI 摘要缓存，触发异步重新生成

**前端集成：**
- 仓库详情页提供"重新分析"按钮
- 学习路径页面展示各类型技能计数
- Rule 类型与其他类型同等对待

## Rule 类型支持
自动发现和解析 Claude Code 规则文件

**支持的位置：**
- `.claude/rules/*.md` - Claude 官方规则目录
- `.cursor/rules/*.md` - Cursor IDE 规则目录
- 根目录 `.clinerules` - Cline AI 规则文件
- 根目录 `.cursorrules` - Cursor IDE 规则文件

**解析器实现（rule-md.ts）：**
- 使用 gray-matter 解析 Frontmatter
- Frontmatter 字段：`name`、`description`、`version`
- 无 Frontmatter 时，自动提取首段落（截断到 200 字）作为描述
- 数据源标记：`source: "rule-md"`
- category：固定为 `"rule"`

## Agent 识别（置信度模型）
基于 Claude Code 官方 agent 定义，用多信号置信度模型识别真正的 agent 文件。

**置信度信号（高 → 单独即可确认，中 → 需 2 个以上组合）：**
- 高：文件在 `agents/` 或 `.claude/agents/` 目录下
- 高：README 中明确标记为 agent
- 高：Frontmatter 同时包含 `model` + `color` 字段
- 中：`model` 字段单独出现、`tools` 字段、"Use this agent when" 描述、"You are" 开头的 body

**核心逻辑（`agent-md.ts`）：**
- `findAgentCandidates()` — 两阶段扫描，优先 `agents/` 和 `.claude/agents/` 目录
- `parseAgentMd()` — 收集信号、判定是否为 agent
- `isAgent()` — 任一高信号 → true，2+ 中信号 → true
- `confidenceSource` 字段记录识别来源（如 `agents-dir`、`model+tools`）

**README 辅助识别（`readme-parser.ts`）：**
- 4 种正则模式提取 agent hints：路径引用、表格标记、标题段落、关键字列表
- 只解析根目录 README.md

**`skill-md.ts` 不再通过关键字推断 agent**，统一走置信度模型。
