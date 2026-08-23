import { Router, type IRouter } from "express";
import {
  GenerateProjectBody,
  GenerateProjectResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function extractJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return JSON.parse(start >= 0 && end >= start ? candidate.slice(start, end + 1) : candidate);
}

router.post("/builder/generate", async (req, res) => {
  const parsed = GenerateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please describe what you want to build." });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "AI generation is not configured yet." });
    return;
  }

  const existing = parsed.data.currentFiles?.slice(0, 30) ?? [];
  const context = existing.length
    ? `\nCurrent project files:\n${existing.map((file) => `--- ${file.path}\n${file.content}`).join("\n")}`
    : "";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://replit.com",
        "X-Title": "JEVISH AI Builder",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are the generation engine inside JEVISH AI Builder. Return only valid JSON with keys summary (string) and files (array of objects with path and content). Build a small, complete, runnable web project using plain HTML, CSS, and JavaScript unless the user asks otherwise. Keep files concise. Never mention model names or providers.",
          },
          { role: "user", content: `${parsed.data.prompt}${context}` },
        ],
      }),
    });

    if (!response.ok) {
      req.log.error({ status: response.status }, "AI generation request failed");
      res.status(500).json({ error: "The builder could not complete that request." });
      return;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "The builder returned an empty result." });
      return;
    }

    const result = GenerateProjectResponse.parse(extractJson(content));
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "AI generation failed");
    res.status(500).json({ error: "The builder could not complete that request." });
  }
});

export default router;