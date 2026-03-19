import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import type { SkillInfo } from "@/types";

const RULE_DIRS = [
  ".claude/rules",
  ".cursor/rules",
];

const RULE_ROOT_FILES = [
  ".clinerules",
  ".cursorrules",
];

export function findRuleFiles(repoPath: string): string[] {
  const results: string[] = [];

  // Search known rule directories
  for (const dir of RULE_DIRS) {
    const fullDir = join(repoPath, dir);
    if (!existsSync(fullDir)) continue;
    try {
      const entries = readdirSync(fullDir);
      for (const entry of entries) {
        if (!entry.endsWith(".md")) continue;
        const fullPath = join(fullDir, entry);
        try {
          if (statSync(fullPath).isFile()) {
            results.push(fullPath);
          }
        } catch {
          // Skip inaccessible files
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  // Search root-level rule files
  for (const file of RULE_ROOT_FILES) {
    const fullPath = join(repoPath, file);
    if (existsSync(fullPath)) {
      try {
        if (statSync(fullPath).isFile()) {
          results.push(fullPath);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  return results;
}

export function parseRuleMd(filePath: string): SkillInfo | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);

    const name = data.name
      ? String(data.name)
      : basename(filePath, ".md");

    const description = data.description
      ? String(data.description).trim()
      : extractFirstParagraph(body);

    return {
      name,
      description,
      category: "rule",
      version: data.version ? String(data.version) : undefined,
      allowedTools: undefined,
      rawContent: content,
      filePath,
      source: "rule-md",
    };
  } catch {
    return null;
  }
}

function extractFirstParagraph(markdown: string): string {
  const lines = markdown.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("```")) {
      return trimmed.slice(0, 200);
    }
  }
  return "";
}
