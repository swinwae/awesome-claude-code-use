import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import type { RepoAnalysis, RepoEntry, AiSummary, SkillAiDescription } from "@/types";

function getDataDir(): string {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// --- Repo Analysis Cache ---

export function getAnalysisCachePath(slug: string): string {
  return join(getDataDir(), "analysis", `${slug}.json`);
}

export function getCachedAnalysis(slug: string): RepoAnalysis | null {
  const path = getAnalysisCachePath(slug);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function saveAnalysis(analysis: RepoAnalysis): void {
  const path = getAnalysisCachePath(analysis.slug);
  ensureDir(path);
  writeFileSync(path, JSON.stringify(analysis, null, 2));
  updateRepoIndex(analysis);
}

// --- AI Summary Cache ---

export function getAiSummaryCachePath(slug: string): string {
  return join(getDataDir(), "ai-summaries", `${slug}.json`);
}

export function getCachedAiSummary(slug: string): AiSummary | null {
  const path = getAiSummaryCachePath(slug);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function deleteAiSummary(slug: string): void {
  const path = getAiSummaryCachePath(slug);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      // ignore deletion errors
    }
  }
}

export function saveAiSummary(slug: string, summary: AiSummary): void {
  const path = getAiSummaryCachePath(slug);
  ensureDir(path);
  writeFileSync(path, JSON.stringify(summary, null, 2));
}

// --- Skill Description Cache ---

function sanitizeFileName(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, "_");
}

export function getCachedSkillDescription(
  slug: string,
  skillName: string
): SkillAiDescription | null {
  const path = join(
    getDataDir(),
    "skill-descriptions",
    slug,
    `${sanitizeFileName(skillName)}.json`
  );
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function saveSkillDescription(
  slug: string,
  skillName: string,
  desc: SkillAiDescription
): void {
  const path = join(
    getDataDir(),
    "skill-descriptions",
    slug,
    `${sanitizeFileName(skillName)}.json`
  );
  ensureDir(path);
  writeFileSync(path, JSON.stringify(desc, null, 2));
}

// --- Repo Index ---

function getRepoIndexPath(): string {
  return join(getDataDir(), "repos.json");
}

export function getRepoIndex(): RepoEntry[] {
  const path = getRepoIndexPath();
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

function updateRepoIndex(analysis: RepoAnalysis): void {
  const repos = getRepoIndex();
  const existing = repos.findIndex((r) => r.slug === analysis.slug);

  const entry: RepoEntry = {
    slug: analysis.slug,
    owner: analysis.owner,
    repo: analysis.repo,
    analyzedAt: analysis.analyzedAt,
    skillCount: analysis.skillCount,
  };

  if (existing >= 0) {
    repos[existing] = entry;
  } else {
    repos.push(entry);
  }

  writeFileSync(getRepoIndexPath(), JSON.stringify(repos, null, 2));
}
