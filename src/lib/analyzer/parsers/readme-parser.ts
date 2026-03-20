import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface ReadmeAgentHint {
  name?: string;
  filePath?: string; // relative to repo root
}

/**
 * Parse README.md to extract agent hints.
 * Looks for agent file paths, tables, headings, and keyword references.
 */
export function parseReadmeForAgents(repoPath: string): ReadmeAgentHint[] {
  const readmePath = findReadme(repoPath);
  if (!readmePath) return [];

  try {
    const content = readFileSync(readmePath, "utf-8");
    const hints: ReadmeAgentHint[] = [];
    const seen = new Set<string>();

    const addHint = (hint: ReadmeAgentHint) => {
      const key = hint.filePath || hint.name || "";
      if (key && !seen.has(key)) {
        seen.add(key);
        hints.push(hint);
      }
    };

    // Pattern 1: File path references like agents/foo.md
    const pathRegex = /agents\/([\w.-]+\.md)/gi;
    for (const match of content.matchAll(pathRegex)) {
      addHint({ filePath: `agents/${match[1]}`, name: match[1].replace(/\.md$/, "") });
    }

    // Pattern 2: Table rows with "agent" type: | name | agent |
    const tableRegex = /\|\s*([\w.-]+)\s*\|\s*agent\s*\|/gi;
    for (const match of content.matchAll(tableRegex)) {
      addHint({ name: match[1] });
    }

    // Pattern 3: ## Agents heading followed by list items
    const headingRegex = /^#{1,3}\s+.*agents?\s*$/im;
    const headingMatch = content.match(headingRegex);
    if (headingMatch && headingMatch.index !== undefined) {
      const afterHeading = content.slice(headingMatch.index + headingMatch[0].length);
      const lines = afterHeading.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        // Stop at next heading
        if (trimmed.startsWith("#")) break;
        const listMatch = trimmed.match(/^[-*]\s+\**`?([\w.-]+)`?\**/);
        if (listMatch) {
          addHint({ name: listMatch[1] });
        }
      }
    }

    // Pattern 4: List items with "agent" keyword
    const listAgentRegex = /[-*]\s+\*{0,2}`?([\w.-]+)`?\*{0,2}[^|\n]*\bagent\b/gi;
    for (const match of content.matchAll(listAgentRegex)) {
      addHint({ name: match[1] });
    }

    return hints;
  } catch {
    return [];
  }
}

/**
 * Find README.md in repo root (case-insensitive).
 */
function findReadme(repoPath: string): string | null {
  try {
    const entries = readdirSync(repoPath);
    const readme = entries.find((e) => e.toLowerCase() === "readme.md");
    return readme ? join(repoPath, readme) : null;
  } catch {
    return null;
  }
}
