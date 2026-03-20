import { readFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import type { SkillInfo } from "@/types";

// Files to skip — known documentation, not agent definitions
const SKIP_FILES = new Set([
  "readme.md",
  "contributing.md",
  "changelog.md",
  "license.md",
  "code_of_conduct.md",
  "security.md",
  "skill.md",
]);

// Directories to skip
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "examples",
  "docs",
  "commands",
]);

// --- Confidence model ---

interface AgentSignal {
  source: "agents-dir" | "readme" | "frontmatter" | "content";
  signal: string;
  weight: "high" | "mid" | "low";
}

function isAgent(signals: AgentSignal[]): boolean {
  if (signals.some((s) => s.weight === "high")) return true;
  if (signals.filter((s) => s.weight === "mid").length >= 2) return true;
  return false;
}

function buildConfidenceSource(signals: AgentSignal[]): string {
  const highSignals = signals.filter((s) => s.weight === "high");
  if (highSignals.length > 0) return highSignals.map((s) => s.signal).join("+");
  const midSignals = signals.filter((s) => s.weight === "mid");
  return midSignals.map((s) => s.signal).join("+");
}

// --- Candidate scanning ---

export interface AgentCandidate {
  filePath: string;
  isInAgentsDir: boolean;
}

/**
 * Scan for agent candidate files. Returns metadata about each candidate.
 * First scans agents/ and .claude/agents/ directories (high confidence),
 * then scans remaining directories.
 */
export function findAgentCandidates(
  repoPath: string,
  maxDepth = 4
): AgentCandidate[] {
  const candidates: AgentCandidate[] = [];
  const seen = new Set<string>();

  // Priority scan: agents/ and .claude/agents/ directories
  const agentDirs = [
    join(repoPath, "agents"),
    join(repoPath, ".claude", "agents"),
  ];

  for (const agentDir of agentDirs) {
    for (const filePath of scanMdFiles(agentDir, 2, 0)) {
      if (!seen.has(filePath)) {
        seen.add(filePath);
        candidates.push({ filePath, isInAgentsDir: true });
      }
    }
  }

  // General scan: remaining directories
  for (const filePath of scanMdFiles(repoPath, maxDepth, 0)) {
    if (!seen.has(filePath)) {
      seen.add(filePath);
      candidates.push({ filePath, isInAgentsDir: false });
    }
  }

  return candidates;
}

/**
 * Recursively find .md files, skipping known non-agent files/dirs.
 */
function scanMdFiles(dir: string, maxDepth: number, depth: number): string[] {
  if (depth > maxDepth) return [];
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (SKIP_DIRS.has(lower) || SKIP_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isFile() && lower.endsWith(".md") && !SKIP_FILES.has(lower)) {
          results.push(fullPath);
        } else if (stat.isDirectory()) {
          results.push(...scanMdFiles(fullPath, maxDepth, depth + 1));
        }
      } catch {
        // Skip inaccessible
      }
    }
  } catch {
    // Skip inaccessible
  }

  return results;
}

// --- Agent parsing with confidence model ---

interface AgentParseContext {
  isInAgentsDir: boolean;
  isReadmeHinted: boolean;
}

/**
 * Parse a markdown file as an agent definition using the confidence model.
 * Returns SkillInfo only if confidence signals indicate this is a real agent.
 */
export function parseAgentMd(
  filePath: string,
  context: AgentParseContext
): SkillInfo | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);

    // Must have at least name and description in Frontmatter
    if (!data.name || !data.description) return null;

    // Skip command definitions
    if (data.command) return null;

    const name = String(data.name).trim();
    const description = String(data.description).trim();

    // Collect signals
    const signals: AgentSignal[] = [];

    // High confidence signals
    if (context.isInAgentsDir) {
      signals.push({ source: "agents-dir", signal: "agents-dir", weight: "high" });
    }
    if (context.isReadmeHinted) {
      signals.push({ source: "readme", signal: "readme", weight: "high" });
    }
    if (data.model && data.color) {
      signals.push({ source: "frontmatter", signal: "model+color", weight: "high" });
    }

    // Mid confidence signals
    if (data.model && !data.color) {
      signals.push({ source: "frontmatter", signal: "model", weight: "mid" });
    }
    if (/^use this agent when/i.test(description)) {
      signals.push({ source: "frontmatter", signal: "agent-description", weight: "mid" });
    }
    if (data.tools) {
      signals.push({ source: "frontmatter", signal: "tools", weight: "mid" });
    }
    if (/^you are\b/im.test(body.trim())) {
      signals.push({ source: "content", signal: "system-prompt", weight: "mid" });
    }

    // Low confidence signals (tracked but not sufficient alone)
    if (!data.model && data.color) {
      signals.push({ source: "frontmatter", signal: "color-only", weight: "low" });
    }

    if (!isAgent(signals)) return null;

    return {
      name,
      description: description.slice(0, 500),
      category: "agent",
      version: data.version ? String(data.version) : undefined,
      allowedTools: parseTools(data.tools),
      rawContent: content,
      filePath,
      source: "agent-md",
      confidenceSource: buildConfidenceSource(signals),
    };
  } catch {
    return null;
  }
}

function parseTools(tools: unknown): string[] | undefined {
  if (Array.isArray(tools)) return tools.map(String);
  if (typeof tools === "string") {
    return tools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return undefined;
}
