import { Router, Response } from "express";
import Groq from "groq-sdk";
import { z } from "zod";
import { AuthRequest, authenticate as authMiddleware } from "../middleware/auth";

const router = Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ── JSON extraction safety helper ──────────────────────────
// Sometimes the model adds text before or after the JSON
// This finds the first { and last } and parses just that part
function extractJSON(text: string): object {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Find outermost JSON object
    const start = text.indexOf("{");
    const end   = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No valid JSON object found in model response");
    }

    const slice = text.slice(start, end + 1);
    return JSON.parse(slice);
  }
}

// ── Prompt builder ─────────────────────────────────────────
function buildPrompt(title: string, description: string): string {
  return `You are a productivity coach helping someone score a work task honestly.

The user has a task:
Title: ${title}
Description: ${description || "No description provided"}

Score this task from 1 to 5 on each of these five dimensions:

- impact: How much does completing this move the needle on something important?
  (1 = almost no effect, 5 = very significant effect)

- urgency: How time-sensitive is this?
  (1 = no deadline at all, 5 = must be done today)

- learning: Will doing this teach the user something durable and new?
  (1 = they have done this many times before, 5 = completely new skill)

- risk: Does completing this remove a future blocker or reduce something that could go wrong?
  (1 = no risk involved if skipped, 5 = high risk if not done soon)

- energy: How much mental effort does this task require?
  (1 = very easy and routine, 5 = extremely draining and complex)

Return ONLY a valid JSON object. No explanation before or after. No markdown. No code blocks. Just raw JSON.

Return exactly this shape:
{
  "impact": 3,
  "urgency": 4,
  "learning": 2,
  "risk": 3,
  "energy": 4,
  "reasons": {
    "impact": "one sentence explaining the impact score",
    "urgency": "one sentence explaining the urgency score",
    "learning": "one sentence explaining the learning score",
    "risk": "one sentence explaining the risk score",
    "energy": "one sentence explaining the energy score"
  }
}`;
}

// ── Zod validation schema ──────────────────────────────────
const requestSchema = z.object({
  title:       z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
});

// ── POST /api/ai/suggest-scores ────────────────────────────
router.post(
  "/suggest-scores",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    // Validate request body
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.errors[0].message,
      });
      return;
    }

    const { title, description } = parsed.data;

    try {
      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a productivity coach. You return only valid JSON. No markdown, no explanation, no code blocks. Only raw JSON.",
          },
          {
            role: "user",
            content: buildPrompt(title, description),
          },
        ],
        temperature: 0.3,      // low = more consistent, less creative
        max_tokens:  500,
      });

      const rawText = completion.choices[0]?.message?.content;

      if (!rawText) {
        res.status(500).json({
          error: "Model returned an empty response",
        });
        return;
      }

      // Safely extract and parse JSON
      const scores = extractJSON(rawText);

      res.status(200).json(scores);
    } catch (err: any) {
      // Groq rate limit
      if (err?.status === 429) {
        res.status(429).json({
          error: "Too many requests. Please wait a moment and try again.",
        });
        return;
      }

      // Groq auth error
      if (err?.status === 401) {
        res.status(500).json({
          error: "AI service authentication failed. Check your API key.",
        });
        return;
      }

      // JSON parse failure
      if (err instanceof SyntaxError) {
        res.status(422).json({
          error: "AI returned an unexpected format. Please score manually.",
        });
        return;
      }

      console.error("Groq API error:", err);
      res.status(500).json({
        error: "AI service failed. Please score manually.",
      });
    }
  }
);

export default router;