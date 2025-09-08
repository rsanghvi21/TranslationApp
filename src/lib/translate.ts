import { openai } from "./openai";
import { OPENAI_MODEL, OPENAI_HARD_LIMIT_USD } from "@/config/ai";
import { estimateTokens, estimateCostUSD } from "./cost";

const SYSTEM = "You are a professional translator. Translate the source to natural, accurate English. Preserve paragraph structure.";

export async function translateChunk(text: string, model: string = OPENAI_MODEL) {
  const inTok  = estimateTokens(text);
  const outTok = Math.max(Math.ceil(inTok * 0.8), 200);
  const est    = estimateCostUSD(model, inTok, outTok);
  
  if (est > OPENAI_HARD_LIMIT_USD) {
    const msg = `Estimated cost $${est.toFixed(4)} exceeds limit $${OPENAI_HARD_LIMIT_USD.toFixed(2)}.`;
    const err = new Error(msg) as Error & { code?: string };
    err.code = "COST_LIMIT";
    throw err;
  }

  const r = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: text }
    ],
    temperature: 0.2,
    max_tokens: Math.min(4000, outTok),
  });

  // unified extraction
  return r.choices[0]?.message?.content?.trim() || '';
}
