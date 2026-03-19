export type SkillCategory = "skill" | "hook" | "mcp" | "agent" | "command";

export interface SkillInfo {
  name: string;
  description: string;
  category: SkillCategory;
  version?: string;
  allowedTools?: string[];
  rawContent: string;
  filePath: string;
  source: "skill-md" | "claude-md" | "hooks" | "mcp";
}

export interface AiSummary {
  summary: string;
  designIntent: string;
  keyPoints: string[];
  usageGuide: string;
  generatedAt: string;
}

export interface RepoAnalysis {
  slug: string;
  owner: string;
  repo: string;
  skills: SkillInfo[];
  analyzedAt: string;
  skillCount: Record<SkillCategory, number>;
}

export interface RepoEntry {
  slug: string;
  owner: string;
  repo: string;
  analyzedAt: string;
  skillCount: Record<SkillCategory, number>;
  aiSummary?: string;
}

export interface SkillAiDescription {
  summary: string;
  purpose: string;
  usageGuide: string;
  generatedAt: string;
}

export interface InstallStatus {
  installed: boolean;
  path?: string;
  broken?: boolean;
}
