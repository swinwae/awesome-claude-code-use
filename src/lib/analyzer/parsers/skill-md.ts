import { readFileSync } from "fs";
import { basename, dirname } from "path";
import matter from "gray-matter";
import type { SkillInfo } from "@/types";

export function parseSkillMd(filePath: string): SkillInfo | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);

    const name = data.name || basename(dirname(filePath));
    const description = data.description
      ? String(data.description).trim()
      : extractFirstParagraph(body);

    return {
      name,
      description,
      category: inferCategory(name, description, data),
      version: data.version ? String(data.version) : undefined,
      allowedTools: Array.isArray(data["allowed-tools"])
        ? data["allowed-tools"]
        : undefined,
      rawContent: content,
      filePath,
      source: "skill-md",
    };
  } catch {
    return null;
  }
}

function inferCategory(
  name: string,
  description: string,
  data: Record<string, unknown>
): SkillInfo["category"] {
  const text = `${name} ${description}`.toLowerCase();
  if (data.category) return String(data.category) as SkillInfo["category"];
  if (text.includes("hook")) return "hook";
  if (text.includes("mcp") || text.includes("server")) return "mcp";
  if (text.includes("command") || text.includes("cmd")) return "command";
  return "skill";
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
