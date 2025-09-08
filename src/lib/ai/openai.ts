import OpenAI from 'openai'
import type { AIClient, TranslateOptions } from './types'
import { OPENAI_MODEL, OPENAI_HARD_LIMIT_USD } from '@/config/ai'
import { estimateTokens, estimateCostUSD } from '@/lib/cost'

export function createOpenAIClient(): AIClient {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing in environment");
  }
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  })

  return {
    async translateChunk(options: TranslateOptions): Promise<string> {
      try {
        const model = options.model || OPENAI_MODEL
        const inputText = options.user
        
        // Budget guard
        const inTok = estimateTokens(inputText)
        const outTok = Math.max(Math.ceil(inTok * 0.8), 200)
        const est = estimateCostUSD(model, inTok, outTok)
        
        if (est > OPENAI_HARD_LIMIT_USD) {
          const msg = `Estimated cost $${est.toFixed(4)} exceeds limit $${OPENAI_HARD_LIMIT_USD.toFixed(2)}.`
          const err = new Error(msg) as Error & { code?: string }
          err.code = "COST_LIMIT"
          throw err
        }

        const response = await client.chat.completions.create({
          model,
          temperature: options.temperature || 0.2,
          max_tokens: options.maxTokens || Math.min(4000, outTok),
          messages: [
            { role: 'system', content: options.system },
            { role: 'user', content: options.user }
          ]
        })

        return response.choices[0]?.message?.content?.trim() || ''
      } catch (error) {
        console.error('OpenAI translation error:', error)
        throw new Error(`OpenAI translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },

    async* streamTranslateChunk(options: TranslateOptions): AsyncIterable<string> {
      try {
        const model = options.model || OPENAI_MODEL
        const inputText = options.user
        
        // Budget guard (same as non-streaming)
        const inTok = estimateTokens(inputText)
        const outTok = Math.max(Math.ceil(inTok * 0.8), 200)
        const est = estimateCostUSD(model, inTok, outTok)
        
        if (est > OPENAI_HARD_LIMIT_USD) {
          const msg = `Estimated cost $${est.toFixed(4)} exceeds limit $${OPENAI_HARD_LIMIT_USD.toFixed(2)}.`
          const err = new Error(msg) as Error & { code?: string }
          err.code = "COST_LIMIT"
          throw err
        }

        const stream = await client.chat.completions.create({
          model,
          temperature: options.temperature || 0.2,
          max_tokens: options.maxTokens || Math.min(4000, outTok),
          messages: [
            { role: 'system', content: options.system },
            { role: 'user', content: options.user }
          ],
          stream: true,
        })

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            yield content
          }
        }
      } catch (error) {
        console.error('OpenAI streaming translation error:', error)
        throw new Error(`OpenAI streaming translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Budget)', recommended: true },
  { value: 'gpt-4o', label: 'GPT-4o (Highest Quality)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Balanced)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' },
] as const
