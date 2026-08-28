import { compactHistory, latestFull, runAnalysis } from "@/lib/analysis";
import { fail, handleRouteError, readJson, requireUser } from "@/lib/api";
import { decryptSecret } from "@/lib/crypto";
import { getConversation, getSettings, listExams, saveConversation } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";

const DEFAULT_ENDPOINT = "https://apihub.agnes-ai.com/v1/chat/completions";
const DEFAULT_MODEL = "agnes-2.5-flash";

export async function GET() {
  try {
    const user = await requireUser();
    const conv = await getConversation(user.id);
    return Response.json({ messages: conv?.messages ?? [] });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ prompt?: string; preset?: string }>(req);
    const prompt = (body.prompt ?? "").trim();
    const preset = body.preset ?? "";
    if (!prompt && !preset) return fail(400, "请输入问题");

    const [exams, settings, conv] = await Promise.all([
      listExams(user.id),
      getSettings(user.id),
      getConversation(user.id),
    ]);
    const analysis = runAnalysis(exams, settings);
    const payload = {
      user_context: {
        region: "上海",
        subjects_enabled: settings.enabled_minor_subjects
          ? ["语文", "数学", "英语", ...settings.enabled_minor_subjects]
          : ["语文", "数学", "英语"],
        long_term_goal: settings.long_term_goals,
      },
      history_compact: compactHistory(exams, settings),
      latest_exam_full: latestFull(exams[exams.length - 1], settings),
      rule_analysis_results: {
        anomalies: analysis.anomalies.map((a) => a.message),
        subject_impact: analysis.impacts.slice(0, 3),
        correlations: Object.fromEntries(
          analysis.correlations.filter((c) => c.coefficient != null).map((c) => [c.subject, c.coefficient]),
        ),
        suggestions: analysis.suggestions.slice(0, 6),
      },
    };

    const userText =
      preset === "priority"
        ? "请根据数据给出各科提分优先级排序和理由。"
        : preset === "strategy"
          ? "请基于当前差距和目标，给出考前复习重点建议。"
          : prompt;

    const history = ((conv?.messages ?? []) as ChatMessage[]).slice(-6);
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "你是 Rank Track 的学业分析助手，服务上海 3+3 高考生。用中文简洁作答，基于给定 JSON 数据，不要编造不存在的分数。可用 Markdown。",
      },
      ...history,
      { role: "user", content: `${userText}\n\n数据：\n${JSON.stringify(payload)}` },
    ];

    const endpoint = settings.user_ai.endpoint || DEFAULT_ENDPOINT;
    const model = settings.user_ai.model || DEFAULT_MODEL;
    const apiKey = settings.user_ai.api_key_enc
      ? decryptSecret(settings.user_ai.api_key_enc)
      : process.env.AGNES_API_KEY;
    if (!apiKey) return fail(500, "未配置 AI API Key");

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 1024,
        temperature: settings.ai_temperature ?? 0.7,
        messages,
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return fail(502, text || "AI 服务请求失败");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let assistant = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const chunks = buf.split("\n");
            buf = chunks.pop() ?? "";
            for (const line of chunks) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data) as {
                  choices?: { delta?: { content?: string }; message?: { content?: string } }[];
                };
                const token = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? "";
                if (token) {
                  assistant += token;
                  controller.enqueue(encoder.encode(token));
                }
              } catch {
                // ignore malformed sse
              }
            }
          }
          const stored: ChatMessage[] = [
            ...history,
            { role: "user" as const, content: userText },
            { role: "assistant" as const, content: assistant },
          ].slice(-6);
          await saveConversation(user.id, stored);
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await saveConversation(user.id, []);
    return Response.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
