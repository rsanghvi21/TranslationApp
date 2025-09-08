import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { AIClient, TranslateOptions } from './types'

export function createGeminiClient(): AIClient {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured. Please add it to your .env.local file.')
  }
  
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ]

  return {
    async translateChunk(options: TranslateOptions): Promise<string> {
      try {
        const model = genAI.getGenerativeModel({ 
          model: options.model || 'gemini-1.5-flash',
          safetySettings,
        })

        const prompt = `${options.system}\n\n${options.user}`
        console.log('Gemini translation request:', {
          model: options.model || 'gemini-1.5-flash',
          promptLength: prompt.length,
          userText: options.user.substring(0, 100) + '...'
        })
        
        const result = await model.generateContent(prompt)
        const response = await result.response
        
        // Check if response was blocked
        if (response.promptFeedback?.blockReason) {
          throw new Error(`Gemini blocked the request: ${response.promptFeedback.blockReason}`)
        }
        
        const text = response.text().trim()
        console.log('Gemini translation response:', {
          responseLength: text.length,
          response: text.substring(0, 100) + '...'
        })
        
        if (!text) {
          throw new Error('Gemini returned empty response')
        }
        
        return text
      } catch (error) {
        console.error('Gemini translation error:', error)
        
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes('API_KEY')) {
            throw new Error('Invalid Google API key. Please check your GOOGLE_API_KEY in .env.local')
          }
          if (error.message.includes('quota')) {
            throw new Error('Google API quota exceeded. Please check your billing or try again later.')
          }
          if (error.message.includes('blocked')) {
            throw new Error('Content was blocked by Gemini safety filters. Try different text.')
          }
        }
        
        throw new Error(`Gemini translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },

    async* streamTranslateChunk(options: TranslateOptions): AsyncIterable<string> {
      try {
        const model = genAI.getGenerativeModel({ 
          model: options.model || 'gemini-1.5-flash',
          safetySettings,
        })

        const prompt = `${options.system}\n\n${options.user}`
        const result = await model.generateContentStream(prompt)

        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            yield text
          }
        }
      } catch (error) {
        console.error('Gemini streaming translation error:', error)
        throw new Error(`Gemini streaming translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }
}

export const GEMINI_MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)', recommended: true },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Highest Quality)' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro (Stable)' },
] as const
