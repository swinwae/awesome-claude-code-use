# Agent 识别优化设计

## 问题

当前 agent 识别逻辑过于宽泛：任何包含 `name` + `description` frontmatter 的 `.md` 文件都会被归为 agent，导致：
- 误判：普通文档/博客被识别为 agent
- 错分：应为 skill 的文件被归为 agent
- 漏判：真正的 agent 文件未被识别

## 方案

基于 Claude Code 官方 agent 定义，用多信号置信度模型 + README 辅助识别替代当前的简单 frontmatter 匹配。

---

## 设计详情

### 1. 置信度模型

将 agent 识别从"满足条件即归类"改为多信号加权打分。

**高置信度信号（单独即可确认）：**

| 信号 | 说明 |
|------|------|
| 文件在 `agents/` 或 `.claude/agents/` 目录下 | 官方标准位置 |
| README 中明确将该文件标记为 agent | 仓库作者的显式声明 |
| Frontmatter 同时包含 `model` 和 `color` 字段 | 官方 agent 特有的字段组合，skill 不会同时有这两个 |

**中置信度信号（需要 2 个以上组合）：**

| 信号 | 说明 |
|------|------|
| Frontmatter 含 `model` 字段（单独出现） | agent 常指定模型，但 skill 偶尔也会 |
| Description 以 "Use this agent when" 开头 | 官方推荐的 agent 描述格式 |
| `tools` 字段存在 | agent 常限制可用工具列表 |
| Body 包含 "You are" 开头的系统提示语 | agent body 通常是 system prompt |

**低置信度信号（仅辅助，不足以单独判定）：**

| 信号 | 说明 |
|------|------|
| Frontmatter 含 `name` + `description` | 必要条件但不充分 |
| Frontmatter 含 `color` 字段（单独出现） | 辅助信号 |

**判定逻辑：**
- 任一高置信度信号 → agent
- 2 个以上中置信度信号 → agent
- 仅低置信度信号 → 保持为 skill（不再误判为 agent）
- 50 字符 body 长度限制移除（短 system prompt 的 agent 也应被识别）

### 2. README 解析策略

新增 `parseReadmeForAgents()` 函数，从 README 中提取 agent 相关信息。

**解析规则（按优先级）：**

| 模式 | 正则/匹配逻辑 | 提取结果 |
|------|---------------|----------|
| 路径引用 | `/agents\/[\w.-]+\.md/gi` | 相对文件路径 |
| 表格中标记 | `/\|\s*([\w.-]+)\s*\|\s*agent\s*\|/gi` | 名称 |
| `## Agents` 标题段落 | 匹配 `/^#{1,3}\s+.*agents?/im` 后提取下方列表项 | 名称列表 |
| 列表中 "agent" 关键字 | `/[-*]\s+\*{0,2}([\w.-]+)\*{0,2}.*\bagent\b/gi` | 名称 |

**返回数据结构：**

```typescript
interface ReadmeAgentHint {
  name?: string;
  filePath?: string;  // 相对于仓库根目录的路径，调用方需拼接为绝对路径
}
```

**限制：**
- 只解析仓库根目录的 `README.md`（不区分大小写）
- 不递归子目录的 README
- 匹配不到返回空数组

### 3. 改造后的分析流程

```
1. [不变] 解析 SKILL.md、CLAUDE.md、Hooks、MCP、Rules
   - [改造] skill-md.ts 的 inferCategory 移除 "agent" 关键字分支，
     不再通过关键字推断 agent，改为统一走置信度模型
2. [新增] 解析 README → 得到 agentHints（白名单）
3. [改造] Agent 识别：
   a. 扫描 agents/ 和 .claude/agents/ 目录 → 高置信度，直接归为 agent
   b. 检查 README 白名单命中的文件 → 高置信度
   c. 扫描其余 .md 文件 → 用置信度模型打分，达标才归为 agent
4. [改造] 按 name 去重，agent 优先于 skill
   - 同名 skill 和 agent 共存时，保留 agent 分类
```

**findAgentCandidates 返回值改造：**

```typescript
interface AgentCandidate {
  filePath: string;
  isInAgentsDir: boolean;  // 是否在 agents/ 或 .claude/agents/ 下
}
```

分为两步扫描：先扫描 `agents/` 和 `.claude/agents/` 目录（标记 `isInAgentsDir: true`），再扫描其余目录。

**与现有逻辑的兼容性：**
- 之前被正确识别的 agent（在 `agents/` 目录或有 `model`+`color` 字段）不受影响
- 之前被误判的文件（普通 .md 只有 name + description）降级为 skill 或排除
- 之前被漏判的文件（在 `agents/` 目录但被跳过的）会被正确捕获
- `skill-md.ts` 中含 "agent" 关键字的 SKILL.md 将归为 skill 而非 agent

### 4. 数据结构与接口

**置信度打分模型：**

```typescript
interface AgentSignal {
  source: "agents-dir" | "readme" | "frontmatter" | "content";
  signal: string;
  weight: "high" | "mid" | "low";
}

function isAgent(signals: AgentSignal[]): boolean {
  if (signals.some(s => s.weight === "high")) return true;
  if (signals.filter(s => s.weight === "mid").length >= 2) return true;
  return false;
}
```

**README 解析器接口：**

```typescript
// src/lib/analyzer/parsers/readme-parser.ts（新文件）
function parseReadmeForAgents(repoPath: string): ReadmeAgentHint[];
```

**改造后的 parseAgentMd 签名：**

```typescript
function parseAgentMd(
  filePath: string,
  context: {
    isInAgentsDir: boolean;
    isReadmeHinted: boolean;
  }
): SkillInfo | null;
```

**SkillInfo 扩展（可选，用于调试）：**

```typescript
// 在 SkillInfo 中新增可选字段
confidenceSource?: string;  // 例如 "agents-dir", "readme+model", "model+tools"
```

---

## 文件改动范围

| 文件 | 改动 |
|------|------|
| `src/lib/analyzer/parsers/agent-md.ts` | 重写识别逻辑，加入置信度模型；`findAgentFiles` → `findAgentCandidates` 返回元数据 |
| `src/lib/analyzer/parsers/readme-parser.ts` | **新文件**，README agent 提取，含具体正则 |
| `src/lib/analyzer/index.ts` | 集成新流程，改造去重逻辑（agent 优先于 skill） |
| `src/lib/analyzer/parsers/skill-md.ts` | 移除 `inferCategory` 中的 "agent" 关键字分支 |
| `src/types/index.ts` | 新增可选 `confidenceSource` 字段（调试用） |
