<!-- Generated: 2026-03-20 | Files scanned: 18 | Token estimate: ~700 -->

# Backend Architecture

## API Routes

```
POST /api/analyze        → analyzeRepoFiles() → cache.saveAnalysis()
POST /api/ai-summary     → cache check → ai-client.generateAiSummary()
POST /api/skill-description → cache check → ai-client.generateSkillDescription()
GET  /api/repos          → cache.getRepoIndex()
POST /api/install        → install.installSkill() / uninstallSkill()
GET  /api/install-status → install.checkSkillInstallStatus()
```

## Analysis Pipeline

```
POST /api/analyze { address, force? }
  ↓
validateRepoAddress(address)
  ↓
getCachedAnalysis(slug) ──hit──→ return
  ↓ miss (or force)
cloneRepo() / pullRepo()  →  ~/.claude/skills-repo/{owner}/{repo}/
  ↓
analyzeRepoFiles(repoPath)
  ├─ parseSkillMd()        (recursive SKILL.md, depth 4)
  ├─ parseClaudeMd()       (root CLAUDE.md → "command")
  ├─ parseHooksFromSettings() (.claude/settings.json)
  ├─ parseMcpConfig()      (.claude/settings.json, mcp.json, .mcp.json)
  ├─ findRuleFiles() + parseRuleMd()  (.claude/rules/, .cursor/rules/)
  └─ findAgentFiles() + parseAgentMd() (frontmatter with name+description)
  ↓
deduplicate by skill.name → saveAnalysis() → return
```

## AI Client Flow

```
callWithFallback(prompt)
  ├─ Try DeepSeek (DEEPSEEK_API_KEY, 30s timeout)
  ├─ Fallback: Try Kimi (KIMI_API_KEY, 30s timeout)
  └─ Fallback: Try GLM (GLM_API_KEY, 30s timeout)
  ↓
parseJsonResponse() → strip markdown fences → JSON.parse
```

## Install Flow

```
POST /api/install { action, owner, repo, filePath, skillName, level, projectPath? }
  ↓
validateSkillName(skillName)   ← /^[a-zA-Z0-9._-]+$/, no ".."
validateSourcePath(sourceDir)  ← must be under ~/.claude/skills-repo/
  ↓
Install:  symlinkSync(sourceDir, targetDir/skillName)
Uninstall: lstatSync → confirm symlink → unlinkSync
```

## Key Files

| File | Lines | Role |
|------|-------|------|
| `src/app/api/analyze/route.ts` | 62 | Repo analysis endpoint |
| `src/app/api/install/route.ts` | 97 | Install/uninstall endpoint |
| `src/lib/analyzer/index.ts` | 134 | Analysis orchestrator |
| `src/lib/analyzer/git.ts` | 89 | Git clone/pull |
| `src/lib/ai-client.ts` | 171 | AI dual-engine client |
| `src/lib/install.ts` | 253 | Symlink install/uninstall |
| `src/lib/cache.ts` | 146 | JSON file cache |

## Cache Structure

```
data/
├── repos.json                          # repo index
├── analysis/{slug}.json                # per-repo analysis
├── ai-summaries/{slug}.json            # per-repo AI summary
└── skill-descriptions/{slug}/{name}.json  # per-skill AI desc
```
