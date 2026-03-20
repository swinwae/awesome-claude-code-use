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
| 文件在 `agents/` 目录下 | 官方标准位置 |
| 插件 `plugin.json` 的 `agents` 数组中列出 | 官方插件声明 |
| README 中明确将该文件标记为 agent | 仓库作者的显式声明 |

**中置信度信号（需要 2 个以上组合）：**

| 信号 | 说明 |
|------|------|
| Frontmatter 含 `model` 字段 | 官方 agent 特有，skill 通常没有 |
| Frontmatter 含 `color` 字段 | 官方 agent 特有 |
| Description 以 "Use this agent when" 开头 | 官方推荐的描述格式 |

**低置信度信号（仅辅助，不足以单独判定）：**

| 信号 | 说明 |
|------|------|
| Frontmatter 含 `name` + `description` | 必要条件但不充分 |
| Body 包含系统提示语风格内容（"You are..."） | agent 的 body 通常是 system prompt |
| `tools` 字段存在 | agent 常限制可用工具 |

**判定逻辑：**
- 任一高置信度信号 → agent
- 2 个以上中置信度信号 → agent
- 仅低置信度信号 → 保持为 skill（不再误判为 agent）

### 2. README 解析策略

新增 `parseReadmeForAgents()` 函数，从 README 中提取 agent 相关信息。

**解析规则（按优先级）：**

| 模式 | 示例 | 提取结果 |
|------|------|----------|
| 路径引用 | `agents/security-reviewer.md` | 文件路径 |
| 表格中标记 | `\| security-reviewer \| agent \|` | 名称 + 类型 |
| 列表中 "agent" 关键字 | `- **security-reviewer** — a code review agent` | 名称 |
| 标题段落 | `## Agents` 下的列表项 | 名称列表 |

**返回数据结构：**

```typescript
interface ReadmeAgentHint {
  name?: string;
  filePath?: string;
}
```

**限制：**
- 只解析仓库根目录的 `README.md`
- 不递归子目录的 README
- 匹配不到返回空数组

### 3. 改造后的分析流程

```
1. [不变] 解析 SKILL.md、CLAUDE.md、Hooks、MCP、Rules
2. [新增] 解析 README → 得到 agentHints（白名单）
3. [新增] 解析 plugin.json → 得到 declaredAgents（声明列表）
4. [改造] Agent 识别：
   a. 优先扫描 agents/ 目录下的 .md 文件 → 高置信度，直接归为 agent
   b. 检查 plugin.json 声明的文件 → 高置信度
   c. 检查 README 白名单命中的文件 → 高置信度
   d. 扫描其余 .md 文件 → 用置信度模型打分，达标才归为 agent
5. [不变] 按 name 去重（先到先得）
```

**与现有逻辑的兼容性：**
- 之前被正确识别的 agent（在 `agents/` 目录或有 `model`/`color` 字段）不受影响
- 之前被误判的文件（普通 .md 只有 name + description）降级为 skill 或排除
- 之前被漏判的文件（在 `agents/` 目录但被跳过的）会被正确捕获

### 4. 数据结构与接口

**置信度打分模型：**

```typescript
interface AgentSignal {
  source: "agents-dir" | "plugin-json" | "readme" | "frontmatter" | "content";
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

**plugin.json 解析：**

```typescript
// 在 agent-md.ts 中处理
function parseDeclaredAgents(repoPath: string): Set<string>;
```

**改造后的 parseAgentMd 签名：**

```typescript
function parseAgentMd(
  filePath: string,
  context: {
    isInAgentsDir: boolean;
    isDeclaredInPlugin: boolean;
    isReadmeHinted: boolean;
  }
): SkillInfo | null;
```

---

## 文件改动范围

| 文件 | 改动 |
|------|------|
| `src/lib/analyzer/parsers/agent-md.ts` | 重写识别逻辑，加入置信度模型 |
| `src/lib/analyzer/parsers/readme-parser.ts` | **新文件**，README agent 提取 |
| `src/lib/analyzer/index.ts` | 集成新流程 |
| `src/lib/analyzer/parsers/skill-md.ts` | 微调 agent 关键字推断权重 |
