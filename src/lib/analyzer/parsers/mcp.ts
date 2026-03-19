import { readFileSync } from "fs";
import type { SkillInfo } from "@/types";

interface McpConfig {
  mcpServers?: Record<string, McpServerEntry>;
}

interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
  url?: string;
}

export function parseMcpConfig(filePath: string): SkillInfo[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const config: McpConfig = JSON.parse(content);
    const skills: SkillInfo[] = [];

    if (!config.mcpServers) return skills;

    for (const [name, server] of Object.entries(config.mcpServers)) {
      skills.push({
        name: `MCP: ${name}`,
        description: buildMcpDescription(name, server),
        category: "mcp",
        rawContent: JSON.stringify({ [name]: server }, null, 2),
        filePath,
        source: "mcp",
      });
    }

    return skills;
  } catch {
    return [];
  }
}

function buildMcpDescription(name: string, server: McpServerEntry): string {
  const parts = [`MCP 服务: ${name}`];
  if (server.command) parts.push(`命令: ${server.command}`);
  if (server.args?.length) parts.push(`参数: ${server.args.join(" ")}`);
  if (server.type) parts.push(`类型: ${server.type}`);
  if (server.url) parts.push(`URL: ${server.url}`);
  return parts.join(" | ");
}
