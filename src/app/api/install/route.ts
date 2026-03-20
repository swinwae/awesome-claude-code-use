import { NextResponse } from "next/server";
import { installSkill, uninstallSkill, validateSkillName } from "@/lib/install";
import type { SkillInstallLevel } from "@/types";

const VALID_ACTIONS = ["install", "uninstall"] as const;
const VALID_LEVELS = ["user", "project"] as const;
const SAFE_NAME_RE = /^[a-zA-Z0-9._-]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, owner, repo, filePath, skillName, level, projectPath } =
      body as {
        action: string;
        owner: string;
        repo: string;
        filePath: string;
        skillName: string;
        level: string;
        projectPath?: string;
      };

    // Validate action
    if (!action || !(VALID_ACTIONS as readonly string[]).includes(action)) {
      return NextResponse.json(
        { success: false, error: "action 必须为 install 或 uninstall" },
        { status: 400 }
      );
    }

    // Validate level
    if (!level || !(VALID_LEVELS as readonly string[]).includes(level)) {
      return NextResponse.json(
        { success: false, error: "level 必须为 user 或 project" },
        { status: 400 }
      );
    }

    // Validate skillName (prevent path traversal)
    if (!skillName || !validateSkillName(skillName)) {
      return NextResponse.json(
        { success: false, error: "非法 Skill 名称" },
        { status: 400 }
      );
    }

    if (action === "install") {
      // Validate owner and repo format
      if (!owner || !repo || !SAFE_NAME_RE.test(owner) || !SAFE_NAME_RE.test(repo)) {
        return NextResponse.json(
          { success: false, error: "非法的 owner 或 repo" },
          { status: 400 }
        );
      }

      if (!filePath || filePath.includes("..")) {
        return NextResponse.json(
          { success: false, error: "非法的 filePath" },
          { status: 400 }
        );
      }

      if (level === "project" && !projectPath) {
        return NextResponse.json(
          { success: false, error: "Project 级安装需要 projectPath" },
          { status: 400 }
        );
      }

      const result = installSkill(
        owner,
        repo,
        filePath,
        skillName,
        level as SkillInstallLevel,
        projectPath
      );
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // action === "uninstall"
    if (level === "project" && !projectPath) {
      return NextResponse.json(
        { success: false, error: "Project 级卸载需要 projectPath" },
        { status: 400 }
      );
    }

    const result = uninstallSkill(skillName, level as SkillInstallLevel, projectPath);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, error: "请求解析失败" },
      { status: 400 }
    );
  }
}
