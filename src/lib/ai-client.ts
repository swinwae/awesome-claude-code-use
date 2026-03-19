import type { AiSummary, SkillAiDescription } from "@/types";

interface AiProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const TIMEOUT_MS = 30_000;

function getProviders(): AiProvider[] {
  const providers: AiProvider[] = [];

  if (process.env.KIMI_API_KEY) {
    providers.push({
      name: "Kimi",
      apiKey: process.env.KIMI_API_KEY,
      baseUrl: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
      model: "moonshot-v1-8k",
    });
  }

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: "DeepSeek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    });
  }

  return providers;
}

async function callProvider(
  provider: AiProvider,
  prompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error(`${provider.name} API key 无效`);
      if (response.status === 429) throw new Error(`${provider.name} API 请求过于频繁`);
      throw new Error(`${provider.name} API 返回 ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(`${provider.name} API 返回空响应`);
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callWithFallback(prompt: string): Promise<string> {
  const providers = getProviders();

  if (providers.length === 0) {
    throw new Error("未配置任何 AI 提供商（需要 KIMI_API_KEY 或 DEEPSEEK_API_KEY）");
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[AI] 尝试使用 ${provider.name}...`);
      const result = await callProvider(provider, prompt);
      console.log(`[AI] ${provider.name} 调用成功`);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[AI] ${provider.name} 失败: ${msg}`);
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  throw new Error(`所有 AI 提供商均失败:\n${errors.join("\n")}`);
}

function parseJsonResponse<T>(content: string, providerContext: string): T {
  // Strip markdown code blocks if present
  const cleaned = content.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`${providerContext} 返回格式异常`);
  }
}

export async function generateAiSummary(
  repoName: string,
  skillsText: string
): Promise<AiSummary> {
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

  const content = await callWithFallback(prompt);
  const parsed = parseJsonResponse<Record<string, unknown>>(content, "AI");

  return {
    summary: (parsed.summary as string) || "",
    designIntent: (parsed.designIntent as string) || "",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    usageGuide: (parsed.usageGuide as string) || "",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateSkillDescription(
  skillName: string,
  skillDescription: string,
  skillRawContent: string
): Promise<SkillAiDescription> {
  const prompt = `你是一个 Claude Code 技能翻译和分析专家。请分析以下 Claude Code 技能，生成中文学习描述。

技能名称: ${skillName}
技能描述: ${skillDescription}
技能原文:
${skillRawContent.slice(0, 4000)}

请用中文回答，输出严格的 JSON 格式（不要 markdown 代码块）:
{
  "summary": "一句话中文总结这个技能是什么、做什么（80字以内）",
  "purpose": "详细说明这个技能的用途和适用场景（150字以内）",
  "usageGuide": "如何使用这个技能，包含具体的调用方式和关键参数说明（200字以内）"
}`;

  const content = await callWithFallback(prompt);
  const parsed = parseJsonResponse<Record<string, unknown>>(content, "AI");

  return {
    summary: (parsed.summary as string) || "",
    purpose: (parsed.purpose as string) || "",
    usageGuide: (parsed.usageGuide as string) || "",
    generatedAt: new Date().toISOString(),
  };
}
