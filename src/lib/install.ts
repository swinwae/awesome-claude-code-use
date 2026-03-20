import {
  existsSync,
  readdirSync,
  lstatSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import type { InstallStatus, SkillInstallStatus, SkillInstallLevel } from "@/types";

const USER_SKILLS_DIR = join(homedir(), ".claude", "skills");
const SKILLS_REPO_DIR = join(homedir(), ".claude", "skills-repo");

// Validate skillName: only allow simple names, no path traversal
export function validateSkillName(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name) && !name.includes("..");
}

// Validate that a path is within the skills-repo directory (prevent path traversal)
function validateSourcePath(sourcePath: string): boolean {
  const resolved = resolve(sourcePath);
  const repoBase = resolve(SKILLS_REPO_DIR);
  return resolved.startsWith(repoBase + "/") || resolved === repoBase;
}

// Validate that a project path is a real, existing directory
function validateProjectPath(projectPath: string): boolean {
  if (!projectPath) return false;
  try {
    return lstatSync(projectPath).isDirectory();
  } catch {
    return false;
  }
}

// Legacy: repo-level install check
export function checkInstallStatus(repoName: string): InstallStatus {
  if (!existsSync(USER_SKILLS_DIR)) {
    return { installed: false };
  }

  try {
    const entries = readdirSync(USER_SKILLS_DIR);
    for (const entry of entries) {
      const fullPath = join(USER_SKILLS_DIR, entry);
      try {
        const stat = lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
          const target = readlinkSync(fullPath);
          if (target.includes(repoName)) {
            return { installed: true, path: fullPath };
          }
        } else if (stat.isDirectory() && entry === repoName) {
          return { installed: true, path: fullPath };
        }
      } catch {
        if (entry === repoName) {
          return { installed: false, broken: true };
        }
      }
    }
  } catch {
    return { installed: false };
  }

  return { installed: false };
}

// Skill-level install status check
export function checkSkillInstallStatus(
  skillName: string,
  projectPath?: string
): SkillInstallStatus {
  const result: SkillInstallStatus = { user: false, project: false };

  if (!validateSkillName(skillName)) return result;

  // Check user level
  const userLink = join(USER_SKILLS_DIR, skillName);
  try {
    const stat = lstatSync(userLink);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      result.user = true;
      result.userPath = userLink;
    }
  } catch {
    // does not exist
  }

  // Check project level
  if (projectPath) {
    const projectLink = join(projectPath, ".claude", "skills", skillName);
    try {
      const stat = lstatSync(projectLink);
      if (stat.isSymbolicLink() || stat.isDirectory()) {
        result.project = true;
        result.projectPath = projectLink;
      }
    } catch {
      // does not exist
    }
  }

  return result;
}

// Compute the source directory (symlink target) for a skill
// filePath can be absolute (e.g. /Users/.../skills-repo/owner/repo/skill/SKILL.md)
// or relative (e.g. .claude/skills/skill/SKILL.md)
function getSkillSourceDir(owner: string, repo: string, filePath: string): string {
  if (filePath.startsWith("/")) {
    // Absolute path — just take the parent directory
    return dirname(filePath);
  }
  // Relative path — join with skills-repo base
  const skillRelDir = dirname(filePath);
  return join(SKILLS_REPO_DIR, owner, repo, skillRelDir);
}

export function installSkill(
  owner: string,
  repo: string,
  filePath: string,
  skillName: string,
  level: SkillInstallLevel,
  projectPath?: string
): { success: boolean; error?: string; path?: string } {
  // Validate skillName
  if (!validateSkillName(skillName)) {
    return { success: false, error: "非法 Skill 名称" };
  }

  // Compute source
  const sourceDir = getSkillSourceDir(owner, repo, filePath);

  // Security: validate source path
  if (!validateSourcePath(sourceDir)) {
    return { success: false, error: "非法路径：源目录不在 skills-repo 内" };
  }

  // Check source exists
  if (!existsSync(sourceDir)) {
    return {
      success: false,
      error: "源目录不存在，请先分析该仓库以触发克隆",
    };
  }

  // Determine target
  let targetDir: string;
  if (level === "user") {
    targetDir = USER_SKILLS_DIR;
  } else {
    if (!projectPath) {
      return { success: false, error: "Project 级安装需要指定项目路径" };
    }
    if (!validateProjectPath(projectPath)) {
      return { success: false, error: "项目路径不存在或不是目录" };
    }
    targetDir = join(projectPath, ".claude", "skills");
  }

  const linkPath = join(targetDir, skillName);

  // Check if already exists (use lstatSync directly to handle broken symlinks)
  try {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      return { success: false, error: "该 Skill 已安装" };
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      return { success: false, error: "无法读取目标状态" };
    }
    // ENOENT — path does not exist, proceed
  }

  // Ensure target directory exists
  try {
    mkdirSync(targetDir, { recursive: true });
  } catch {
    return { success: false, error: "无法创建目标目录，请检查权限" };
  }

  // Create symlink
  try {
    symlinkSync(sourceDir, linkPath);
    return { success: true, path: linkPath };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EACCES") {
      return { success: false, error: "权限不足，请检查目录权限" };
    }
    return { success: false, error: `创建符号链接失败: ${code || err}` };
  }
}

export function uninstallSkill(
  skillName: string,
  level: SkillInstallLevel,
  projectPath?: string
): { success: boolean; error?: string } {
  // Validate skillName
  if (!validateSkillName(skillName)) {
    return { success: false, error: "非法 Skill 名称" };
  }

  let targetDir: string;
  if (level === "user") {
    targetDir = USER_SKILLS_DIR;
  } else {
    if (!projectPath) {
      return { success: false, error: "Project 级卸载需要指定项目路径" };
    }
    if (!validateProjectPath(projectPath)) {
      return { success: false, error: "项目路径不存在或不是目录" };
    }
    targetDir = join(projectPath, ".claude", "skills");
  }

  const linkPath = join(targetDir, skillName);

  // Use lstatSync directly (handles broken symlinks correctly)
  let isSymlink = false;
  try {
    const stat = lstatSync(linkPath);
    if (!stat.isSymbolicLink()) {
      return { success: false, error: "目标不是符号链接，拒绝删除以防误操作" };
    }
    isSymlink = true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { success: true }; // Already gone
    }
    return { success: false, error: "无法读取目标状态" };
  }

  if (!isSymlink) return { success: false, error: "目标不是符号链接" };

  try {
    unlinkSync(linkPath);
    return { success: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EACCES") {
      return { success: false, error: "权限不足，请检查目录权限" };
    }
    return { success: false, error: `删除符号链接失败: ${code || err}` };
  }
}
