export const OPENAI_MODEL =
  (process.env.OPENAI_MODEL ?? "").trim() || "gpt-4o-mini"; // safe fallback

export const OPENAI_HARD_LIMIT_USD =
  Number(process.env.OPENAI_HARD_LIMIT_USD ?? 1.0);
