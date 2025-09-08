const TOKENS_PER_CHAR = 0.25; // ~rough
export const estimateTokens = (s: string) => Math.ceil(s.length * TOKENS_PER_CHAR);

// USD per 1M tokens (adjust if you maintain a pricing map elsewhere)
const PRICES = {
  "gpt-4o-mini": { in: 0.60, out: 2.40 },
  "gpt-5-mini":  { in: 0.30, out: 1.20 },
  "gpt-5-nano":  { in: 0.05, out: 0.20 },
} as const;

export function estimateCostUSD(model: string, inputTokens: number, outputTokens: number) {
  const p = (PRICES as any)[model] ?? PRICES["gpt-4o-mini"];
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}
