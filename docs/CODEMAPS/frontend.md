<!-- Generated: 2026-03-20 | Files scanned: 10 | Token estimate: ~500 -->

# Frontend Architecture

## Page Tree

```
/ (page.tsx, 272 lines)
├── Terminal-style repo input
├── Learning path cards (6 categories)
└── Recent repos list

/repos (repos/page.tsx, 133 lines)
└── Searchable/filterable repo list with skill counts

/repo/[slug] (repo/[slug]/page.tsx, 287 lines)
├── Repo header + re-analyze button + install status badge
├── AI summary (lazy-loaded)
├── Install guide text
├── Category filter tabs
└── SkillAccordion list

/learn/[category] (learn/[category]/page.tsx, 307 lines)
├── Category tabs (rule/hook/command/skill/mcp/agent)
├── Category intro + how-to guide
└── Skills from all analyzed repos (filtered by category)
```

## Component Hierarchy

```
layout.tsx
├── ThemeProvider (dark/light, localStorage)
├── Nav (logo, links, theme toggle)
└── {children}
    └── Page components (all "use client")
        └── SkillAccordion (per-skill expandable)
            ├── AI description (lazy-loaded on expand)
            ├── SkillInstallSection (only for category=skill)
            │   ├── User 级安装 button
            │   ├── Project 级安装 button + path input
            │   └── 卸载 buttons (per level)
            ├── Original description
            ├── Version / Allowed tools
            └── SkillRawContent (collapsible source)
```

## State Management

All client-side state via `useState` — no external state library.

| Page | Key State |
|------|-----------|
| `/` | repos, loading, analysisResult |
| `/repos` | repos, search filter |
| `/repo/[slug]` | analysis, aiSummary, installStatus, categoryFilter |
| `/learn/[cat]` | skills (aggregated from all repos) |
| `SkillAccordion` | expanded, skillDesc, descLoading |
| `SkillInstallSection` | status, actionLoading, projectPath, error |

## Data Fetching Pattern

All pages use `useEffect` + `fetch` to API routes. No SSR data fetching.

```
Page mount → fetch /api/... → setState → render
```

## Components

| Component | Lines | Props |
|-----------|-------|-------|
| SkillAccordion | 418 | `{ skill: SkillInfo, slug: string }` |
| Nav | 40 | none |
| ThemeProvider | 37 | `{ children }` |
| CopyButton | 27 | `{ text: string }` |
