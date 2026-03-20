<!-- Generated: 2026-03-20 | Files scanned: 28 | Token estimate: ~600 -->

# Architecture Overview

## System Diagram

```
                    ┌──────────────────────────────────┐
                    │         Browser (React 19)        │
                    │  page.tsx / repos / repo / learn  │
                    └──────────┬───────────────────────┘
                               │ fetch
                    ┌──────────▼───────────────────────┐
                    │      Next.js 15 API Routes        │
                    │  analyze │ install │ ai-summary    │
                    │  repos   │ status  │ skill-desc    │
                    └──┬───────┬─────────┬─────────────┘
                       │       │         │
              ┌────────▼──┐ ┌──▼────┐ ┌──▼──────────┐
              │ analyzer/  │ │install│ │ ai-client.ts │
              │ index.ts   │ │ .ts   │ │ Kimi+DeepSeek│
              │ 6 parsers  │ │symlink│ └──────┬──────┘
              └─────┬──────┘ └───┬───┘        │
                    │            │             │
         ┌──────────▼────────────▼─────────────▼────┐
         │              Filesystem                   │
         │  ~/.claude/skills-repo/  (git clones)     │
         │  ~/.claude/skills/       (user symlinks)  │
         │  {proj}/.claude/skills/  (proj symlinks)  │
         │  data/analysis/          (JSON cache)     │
         │  data/ai-summaries/      (JSON cache)     │
         │  data/skill-descriptions/(JSON cache)     │
         └──────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Bun + Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS v4 (dark-first)
- **AI**: Kimi (moonshot) + DeepSeek, auto fallback
- **Storage**: JSON file cache, no DB
- **Parsing**: gray-matter, yaml, shiki

## Key Design Decisions

1. File-based cache (no DB dependency)
2. Shallow git clones (`--depth=1`)
3. 6-parser pipeline: SKILL.md → CLAUDE.md → Hooks → MCP → Rules → Agents
4. Skill-level symlink install (user + project)
5. Lazy AI generation with dual-engine fallback
