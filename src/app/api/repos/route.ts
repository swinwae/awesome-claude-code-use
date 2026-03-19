import { NextResponse } from "next/server";
import { getRepoIndex, getCachedAiSummary } from "@/lib/cache";

export async function GET() {
  const repos = getRepoIndex();

  // Attach AI summaries where available
  const enriched = repos.map((repo) => {
    const aiSummary = getCachedAiSummary(repo.slug);
    return {
      ...repo,
      aiSummary: aiSummary?.summary || undefined,
    };
  });

  return NextResponse.json(enriched);
}
