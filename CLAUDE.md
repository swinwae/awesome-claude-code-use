# Awesome Claude Code

Claude Code 技能可视化学习平台。

## Tech Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (暗色优先)
- Bun runtime
- Kimi API (moonshot-v1-8k) 用于 AI 摘要
- shiki 用于服务端代码高亮
- JSON 文件缓存（无 DB）

## 项目结构
- `src/app/` - Next.js 页面和 API 路由
- `src/lib/` - 核心库（解析器、缓存、Kimi 客户端、安装检测）
- `src/components/` - React 组件
- `src/types/` - TypeScript 类型
- `data/` - 运行时缓存数据（gitignore）
- `setup` - 安装脚本（符号链接到 ~/.claude/skills/）

## 开发
```bash
bun install
bun dev
```

## 关键设计决策
- 仓库 clone 到 `~/.claude/skills-repo/{owner}/{repo}/`
- 解析结果缓存到 `data/analysis/{slug}.json`
- AI 摘要延迟加载，缓存到 `data/ai-summaries/{slug}.json`
- 仓库地址正则验证: `/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/`
- shiki 代码高亮在服务端渲染
