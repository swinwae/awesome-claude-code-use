import { NextResponse } from "next/server";
import { validateRepoAddress, cloneRepo, pullRepo } from "@/lib/analyzer/git";
import { analyzeRepoFiles } from "@/lib/analyzer";
import { getCachedAnalysis, saveAnalysis, deleteAiSummary } from "@/lib/cache";

export async function POST(request: Request) {
  try {
    const { address, force } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "请输入仓库地址" },
        { status: 400 }
      );
    }

    const trimmed = address.trim();
    if (!validateRepoAddress(trimmed)) {
      return NextResponse.json(
        { error: "请输入 owner/repo 格式的仓库地址" },
        { status: 400 }
      );
    }

    const [owner, repo] = trimmed.split("/");
    const slug = `${owner}-${repo}`;

    // Check cache first (skip if force re-analysis)
    if (!force) {
      const cached = getCachedAnalysis(slug);
      if (cached) {
        return NextResponse.json({
          analysis: cached,
          fromCache: true,
        });
      }
    }

    // Clone or pull repo
    const repoPath = force
      ? await pullRepo(owner, repo)
      : await cloneRepo(owner, repo);

    // Analyze
    const analysis = analyzeRepoFiles(repoPath, owner, repo);

    // Save cache (clear old AI summary on force re-analysis)
    if (force) {
      deleteAiSummary(slug);
    }
    saveAnalysis(analysis);

    return NextResponse.json({
      analysis,
      fromCache: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "分析失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
