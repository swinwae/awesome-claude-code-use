import { NextResponse } from "next/server";
import { getCachedAnalysis, getCachedAiSummary, saveAiSummary } from "@/lib/cache";
import { generateAiSummary } from "@/lib/kimi";

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "缺少 slug 参数" },
        { status: 400 }
      );
    }

    // Check AI summary cache
    const cached = getCachedAiSummary(slug);
    if (cached) {
      return NextResponse.json({ summary: cached, fromCache: true });
    }

    // Get analysis data
    const analysis = getCachedAnalysis(slug);
    if (!analysis) {
      return NextResponse.json(
        { error: "仓库尚未分析" },
        { status: 404 }
      );
    }

    // Build text from skills
    const skillsText = analysis.skills
      .map((s) => `## ${s.name}\n${s.description}\n\n${s.rawContent.slice(0, 1000)}`)
      .join("\n\n---\n\n");

    const repoName = `${analysis.owner}/${analysis.repo}`;
    const summary = await generateAiSummary(repoName, skillsText);

    // Cache result
    saveAiSummary(slug, summary);

    return NextResponse.json({ summary, fromCache: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 摘要生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
