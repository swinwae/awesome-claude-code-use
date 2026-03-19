import { existsSync, readdirSync, lstatSync, readlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { InstallStatus } from "@/types";

const SKILLS_DIR = join(homedir(), ".claude", "skills");

export function checkInstallStatus(repoName: string): InstallStatus {
  if (!existsSync(SKILLS_DIR)) {
    return { installed: false };
  }

  try {
    const entries = readdirSync(SKILLS_DIR);
    for (const entry of entries) {
      const fullPath = join(SKILLS_DIR, entry);
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
        // Broken symlink
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
