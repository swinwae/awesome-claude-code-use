import { NextResponse } from "next/server";
import {
  getCachedAnalysis,
  getCachedSkillDescription,
  saveSkillDescription,
} from "@/lib/cache";
import { generateSkillDescription } from "@/lib/kimi";

export async function POST(request: Request) {
  try {
    const { slug, skillName } = await request.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "缺少 slug 参数" }, { status: 400 });
    }
    if (!skillName || typeof skillName !== "string") {
      return NextResponse.json(
        { error: "缺少 skillName 参数" },
        { status: 400 }
      );
    }

    // Check cache
    const cached = getCachedSkillDescription(slug, skillName);
    if (cached) {
      return NextResponse.json({ description: cached, fromCache: true });
    }

    // Get analysis to find the skill
    const analysis = getCachedAnalysis(slug);
    if (!analysis) {
      return NextResponse.json({ error: "仓库尚未分析" }, { status: 404 });
    }

    const skill = analysis.skills.find((s) => s.name === skillName);
    if (!skill) {
      return NextResponse.json(
        { error: `未找到技能: ${skillName}` },
        { status: 404 }
      );
    }

    const description = await generateSkillDescription(
      skill.name,
      skill.description,
      skill.rawContent
    );

    saveSkillDescription(slug, skillName, description);

    return NextResponse.json({ description, fromCache: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "技能描述生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
