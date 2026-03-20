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
