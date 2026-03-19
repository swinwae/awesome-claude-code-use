import { readFileSync } from "fs";
import type { SkillInfo } from "@/types";

interface HookConfig {
  hooks?: Record<string, HookEntry[]>;
}

interface HookEntry {
  matcher?: string;
  command?: string;
  type?: string;
}

export function parseHooksFromSettings(filePath: string): SkillInfo[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const config: HookConfig = JSON.parse(content);
    const skills: SkillInfo[] = [];

    if (!config.hooks) return skills;

    for (const [event, entries] of Object.entries(config.hooks)) {
      if (!Array.isArray(entries)) continue;

      for (const entry of entries) {
        const name = entry.matcher
          ? `${event}:${entry.matcher}`
          : event;

        skills.push({
          name,
          description: buildHookDescription(event, entry),
          category: "hook",
          rawContent: JSON.stringify(entry, null, 2),
          filePath,
          source: "hooks",
        });
      }
    }

    return skills;
  } catch {
    return [];
  }
}

function buildHookDescription(event: string, entry: HookEntry): string {
  const parts = [`Hook 事件: ${event}`];
  if (entry.matcher) parts.push(`匹配: ${entry.matcher}`);
  if (entry.command) parts.push(`命令: ${entry.command}`);
  if (entry.type) parts.push(`类型: ${entry.type}`);
  return parts.join(" | ");
}
