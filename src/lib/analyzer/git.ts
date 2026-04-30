import { exec } from "child_process";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const SKILLS_REPO_DIR = join(homedir(), ".claude", "skills-repo");
const CLONE_TIMEOUT_MS = 180_000;

const REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export function validateRepoAddress(address: string): boolean {
  return REPO_REGEX.test(address);
}

export function getRepoLocalPath(owner: string, repo: string): string {
  return join(SKILLS_REPO_DIR, owner, repo);
}

export function isRepoCloned(owner: string, repo: string): boolean {
  return existsSync(getRepoLocalPath(owner, repo));
}

export async function pullRepo(
  owner: string,
  repo: string
): Promise<string> {
  const localPath = getRepoLocalPath(owner, repo);

  if (!existsSync(localPath)) {
    return cloneRepo(owner, repo);
  }

  const proxyArg = process.env.GIT_PROXY ? `-c http.proxy=${process.env.GIT_PROXY}` : "";

  return new Promise((resolve, reject) => {
    exec(
      `git ${proxyArg} -C "${localPath}" pull --ff-only`,
      { timeout: 30_000 },
      (error) => {
        if (error) {
          // Pull failed (e.g. conflicts), delete and re-clone
          try {
            rmSync(localPath, { recursive: true, force: true });
          } catch {
            // ignore cleanup errors
          }
          cloneRepo(owner, repo).then(resolve, reject);
          return;
        }
        resolve(localPath);
      }
    );
  });
}

export async function cloneRepo(
  owner: string,
  repo: string
): Promise<string> {
  const localPath = getRepoLocalPath(owner, repo);

  if (existsSync(localPath)) {
    return localPath;
  }

  const url = `https://github.com/${owner}/${repo}.git`;
  const proxyArg = process.env.GIT_PROXY ? `-c http.proxy=${process.env.GIT_PROXY}` : "";

  return new Promise((resolve, reject) => {
    const child = exec(
      `git ${proxyArg} clone --depth=1 --single-branch --no-tags "${url}" "${localPath}"`,
      { timeout: CLONE_TIMEOUT_MS },
      (error, _stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(new Error("克隆超时（超过180秒），仓库可能过大"));
          } else if (stderr.includes("not found") || stderr.includes("Repository not found")) {
            reject(new Error(`仓库 ${owner}/${repo} 不存在`));
          } else {
            reject(new Error(`克隆失败: ${stderr || error.message}`));
          }
          return;
        }
        resolve(localPath);
      }
    );

    child.on("error", (err) => {
      reject(new Error(`克隆失败: ${err.message}`));
    });
  });
}
