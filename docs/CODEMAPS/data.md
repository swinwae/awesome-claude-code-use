<!-- Generated: 2026-03-20 | Files scanned: 5 | Token estimate: ~400 -->

# Data Architecture

## Storage (no database — JSON file cache)

```
data/                                    # runtime cache (gitignored)
├── repos.json                           # repo index: RepoEntry[]
├── analysis/
│   └── {owner}-{repo}.json             # RepoAnalysis per repo
├── ai-summaries/
│   └── {owner}-{repo}.json             # AiSummary per repo
└── skill-descriptions/
    └── {owner}-{repo}/
        └── {skill-name}.json           # SkillAiDescription per skill

~/.claude/skills-repo/                   # git clones (shared across projects)
└── {owner}/{repo}/                      # shallow clone (--depth=1)

~/.claude/skills/                        # user-level skill installs
└── {skillName} -> skills-repo/.../      # symlink to skill dir

{project}/.claude/skills/                # project-level skill installs
└── {skillName} -> skills-repo/.../      # symlink to skill dir
```

## Type Relationships

```
RepoEntry (index)
  └─ slug → RepoAnalysis (detail)
               ├─ skills: SkillInfo[]
               │    └─ name → SkillAiDescription (per-skill AI)
               └─ slug → AiSummary (repo-level AI)

SkillInfo.name → SkillInstallStatus (install check)
```

## Cache Lifecycle

| Cache | Created | Invalidated | TTL |
|-------|---------|-------------|-----|
| analysis/{slug}.json | POST /api/analyze | force=true | indefinite |
| ai-summaries/{slug}.json | POST /api/ai-summary | force=true (analyze) | indefinite |
| skill-descriptions/{slug}/{name}.json | POST /api/skill-description | never (manual delete) | indefinite |
| repos.json | auto-updated on analyze | auto-updated | indefinite |

## Git Clone Strategy

- Clone: `--depth=1 --single-branch --no-tags` (180s timeout)
- Update: `git pull --ff-only`, fallback to delete + re-clone
- Location: `~/.claude/skills-repo/{owner}/{repo}/`
