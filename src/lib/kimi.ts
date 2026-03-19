import type { AiSummary } from "@/types";

const KIMI_API_KEY = process.env.KIMI_API_KEY || "sk-CcQhYU9K0AKgmd016qupOQCIDNw4JnbAZ3Up4Fg2qj2QiVTv";
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
const TIMEOUT_MS = 30_000;

export async function generateAiSummary(
  repoName: string,
  skillsText: string
): Promise<AiSummary> {
  if (!KIMI_API_KEY) {
    throw new Error("KIMI_API_KEY 未配置");
  }

  const prompt = `你是一个 Claude Code 技能分析专家。请分析以下仓库的技能文件，生成结构化的学习摘要。

仓库: ${repoName}

技能文件内容:
${skillsText.slice(0, 8000)}

请用中文回答，输出严格的 JSON 格式（不要 markdown 代码块）:
{
  "summary": "一段话总结这个仓库的核心功能和价值（100字以内）",
  "designIntent": "分析这个仓库的设计意图和架构思路（150字以内）",
  "keyPoints": ["要点1", "要点2", "要点3", "要点4", "要点5"],
  "usageGuide": "如何使用这个仓库的技能（包含具体命令示例，200字以内）"
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Kimi API key 无效");
      if (response.status === 429) throw new Error("Kimi API 请求过于频繁，请稍后重试");
      throw new Error(`Kimi API 返回 ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Kimi API 返回空响应");
    }

    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary || "",
      designIntent: parsed.designIntent || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      usageGuide: parsed.usageGuide || "",
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Kimi API 返回格式异常");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
