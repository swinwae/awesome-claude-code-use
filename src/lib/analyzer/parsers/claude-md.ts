import { readFileSync } from "fs";
import { basename, dirname } from "path";
import type { SkillInfo } from "@/types";

export function parseClaudeMd(filePath: string): SkillInfo | null {
  try {
    const content = readFileSync(filePath, "utf-8");

    const lines = content.split("\n");
    let description = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        description = trimmed.slice(0, 200);
        break;
      }
    }

    const name = dirname(filePath).split("/").pop() || basename(filePath, ".md");

    return {
      name: `CLAUDE.md (${name})`,
      description: description || "项目级 Claude Code 配置文件",
      category: "command",
      rawContent: content,
      filePath,
      source: "claude-md",
    };
  } catch {
    return null;
  }
}
