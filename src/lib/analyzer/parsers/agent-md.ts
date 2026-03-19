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

/**
 * Recursively find .md files that could be agent definitions.
 * Skips known documentation files and already-handled SKILL.md.
 */
export function findAgentFiles(
  dir: string,
  maxDepth = 4,
  depth = 0
): string[] {
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
          results.push(...findAgentFiles(fullPath, maxDepth, depth + 1));
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

/**
 * Parse a markdown file as an agent definition.
 * Returns SkillInfo only if the file has Frontmatter with both `name` and `description`.
 */
export function parseAgentMd(filePath: string): SkillInfo | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);

    // Must have both name and description in Frontmatter to be considered an agent
    if (!data.name || !data.description) return null;

    // Skip command definitions (have `command` field in frontmatter)
    if (data.command) return null;

    const name = String(data.name).trim();
    const description = String(data.description).trim();

    // Extra validation: skip files with very short content (likely not real agent defs)
    if (body.trim().length < 50) return null;

    return {
      name,
      description: description.slice(0, 500),
      category: "agent",
      version: data.version ? String(data.version) : undefined,
      allowedTools: parseTools(data.tools),
      rawContent: content,
      filePath,
      source: "agent-md",
    };
  } catch {
    return null;
  }
}

function parseTools(tools: unknown): string[] | undefined {
  if (Array.isArray(tools)) return tools.map(String);
  if (typeof tools === "string") {
    return tools.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return undefined;
}
