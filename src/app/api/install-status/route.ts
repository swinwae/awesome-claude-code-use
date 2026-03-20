import { NextResponse } from "next/server";
import { checkInstallStatus, checkSkillInstallStatus, validateSkillName } from "@/lib/install";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const skillName = searchParams.get("skillName");
  const projectPath = searchParams.get("projectPath") || undefined;

  // Skill-level check
  if (skillName) {
    if (!validateSkillName(skillName)) {
      return NextResponse.json({ user: false, project: false });
    }
    const status = checkSkillInstallStatus(skillName, projectPath);
    return NextResponse.json(status);
  }

  // Legacy: repo-level check
  if (!repo) {
    return NextResponse.json({ installed: false });
  }

  const repoName = repo.split("/").pop() || repo;
  const status = checkInstallStatus(repoName);

  return NextResponse.json(status);
}
