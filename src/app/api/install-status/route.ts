import { NextResponse } from "next/server";
import { checkInstallStatus } from "@/lib/install";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({ installed: false });
  }

  const repoName = repo.split("/").pop() || repo;
  const status = checkInstallStatus(repoName);

  return NextResponse.json(status);
}
