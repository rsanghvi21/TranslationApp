import { NextRequest } from 'next/server'
import { z } from 'zod'
import { extractTextFromPDF, mergeTextBlocks, splitLargeBlocks } from '@/lib/pdf/extract'
import { detectLanguage } from '@/lib/i18n/detect'
import { translateChunk, TranslationQueue } from '@/lib/ai'
import { splitIntoChunks } from '@/lib/utils'
import type { TranslationChunk, TranslationResult } from '@/lib/ai/types'

const translateRequestSchema = z.object({
  input: z.object({
    type: z.enum(['text', 'pdf']),
    text: z.string().optional(),
    fileData: z.string().optional(), // base64 encoded PDF
  }),
  settings: z.object({
    provider: z.enum(['openai', 'gemini']),
    model: z.string(),
    tone: z.enum(['formal', 'informal', 'neutral']).default('neutral'),
    fidelity: z.enum(['literal', 'adaptive', 'balanced']).default('balanced'),
    keepLineBreaks: z.boolean().default(true),
    glossary: z.record(z.string()).optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'No AI provider API keys configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { input, settings } = translateRequestSchema.parse(body)

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`
          controller.enqueue(new TextEncoder().encode(message))
        }

        try {
          // Extract text based on input type
          let textBlocks: TranslationChunk[] = []
          
          sendEvent('progress', { stage: 'extracting', message: 'Processing input...' })

          if (input.type === 'text') {
            if (!input.text?.trim()) {
              sendEvent('error', { message: 'Text input is required' })
              controller.close()
              return
            }

            const chunks = splitIntoChunks(input.text, 6000)
            textBlocks = chunks.map((text, index) => ({
              id: `text-${index}`,
              text,
              page: 1,
            }))
          } else if (input.type === 'pdf') {
            if (!input.fileData) {
              sendEvent('error', { message: 'PDF file data is required' })
              controller.close()
              return
            }

            try {
              const buffer = Buffer.from(input.fileData, 'base64')
              const maxSize = parseInt(process.env.APP_MAX_FILE_MB || '25') * 1024 * 1024
              
              if (buffer.length > maxSize) {
                sendEvent('error', { message: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` })
                controller.close()
                return
              }

              const pdfResult = await extractTextFromPDF(buffer)
              let blocks = pdfResult.blocks

              // Process blocks for optimal translation
              blocks = mergeTextBlocks(blocks, 50)
              blocks = splitLargeBlocks(blocks, 2000)

              textBlocks = blocks.map(block => ({
                id: block.id,
                text: block.text,
                page: block.page,
                isRTL: block.isRTL,
              }))
            } catch (error) {
              console.error('PDF processing error:', error)
              sendEvent('error', { message: 'Failed to process PDF file' })
              controller.close()
              return
            }
          }

          if (textBlocks.length === 0) {
            sendEvent('error', { message: 'No text found to translate' })
            controller.close()
            return
          }

          sendEvent('progress', { stage: 'detecting', message: 'Detecting language...' })

          // Detect language from first few blocks
          const sampleText = textBlocks
            .slice(0, 3)
            .map(block => block.text)
            .join('\n')
            .substring(0, 1000)

          const detectedLanguage = await detectLanguage(sampleText, true, settings.provider)
          
          sendEvent('language_detected', { 
            detectedLanguage,
            totalChunks: textBlocks.length,
            totalCharacters: textBlocks.reduce((sum, chunk) => sum + chunk.text.length, 0)
          })

          // Check if already in English
          if (detectedLanguage.toLowerCase() === 'english') {
            const results: TranslationResult[] = textBlocks.map(chunk => ({
              id: chunk.id,
              source: chunk.text,
              translated: chunk.text, // Same text if already English
              page: chunk.page,
              isRTL: chunk.isRTL,
            }))

            // Send all results at once since no translation needed
            for (const result of results) {
              sendEvent('translation_complete', { result })
            }

            sendEvent('complete', {
              success: true,
              detectedLanguage,
              stats: {
                totalChunks: textBlocks.length,
                totalCharacters: textBlocks.reduce((sum, chunk) => sum + chunk.text.length, 0),
                successfulTranslations: results.length,
                errors: 0,
              },
            })
            
            controller.close()
            return
          }

          sendEvent('progress', { 
            stage: 'translating', 
            message: `Translating ${textBlocks.length} chunks from ${detectedLanguage}...` 
          })

          // Translate chunks with streaming updates
          const translationQueue = new TranslationQueue(2) // Reduce concurrency for better streaming
          const results: TranslationResult[] = []
          const errors: string[] = []
          let completed = 0

          // Process chunks sequentially for better streaming experience
          for (const chunk of textBlocks) {
            try {
              sendEvent('translation_start', { 
                chunkId: chunk.id, 
                text: chunk.text.substring(0, 100) + (chunk.text.length > 100 ? '...' : ''),
                progress: (completed / textBlocks.length) * 100
              })

              const result = await translationQueue.add(() =>
                translateChunk(chunk, detectedLanguage, settings)
              )

              results.push(result)
              completed++

              sendEvent('translation_complete', { 
                result,
                progress: (completed / textBlocks.length) * 100
              })

            } catch (error) {
              console.error(`Translation failed for chunk ${chunk.id}:`, error)
              
              // Handle cost limit errors specially - stop processing
              if (error instanceof Error && (error as any).code === 'COST_LIMIT') {
                sendEvent('error', { 
                  message: error.message,
                  code: 'COST_LIMIT'
                })
                controller.close()
                return
              }
              
              const errorMsg = `Chunk ${chunk.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
              errors.push(errorMsg)
              
              // Return original text as fallback
              const fallbackResult: TranslationResult = {
                id: chunk.id,
                source: chunk.text,
                translated: chunk.text,
                page: chunk.page,
                isRTL: chunk.isRTL,
              }
              
              results.push(fallbackResult)
              completed++

              sendEvent('translation_error', { 
                chunkId: chunk.id,
                error: errorMsg,
                fallbackResult,
                progress: (completed / textBlocks.length) * 100
              })
            }
          }

          // Sort results by original order (by ID)
          results.sort((a, b) => {
            const aIndex = textBlocks.findIndex(chunk => chunk.id === a.id)
            const bIndex = textBlocks.findIndex(chunk => chunk.id === b.id)
            return aIndex - bIndex
          })

          sendEvent('complete', {
            success: true,
            detectedLanguage,
            results,
            stats: {
              totalChunks: textBlocks.length,
              totalCharacters: textBlocks.reduce((sum, chunk) => sum + chunk.text.length, 0),
              successfulTranslations: results.length - errors.length,
              errors: errors.length,
            },
            errors: errors.length > 0 ? errors : undefined,
          })

        } catch (error) {
          console.error('Translation stream error:', error)
          
          if (error instanceof z.ZodError) {
            sendEvent('error', { 
              message: 'Invalid request format', 
              details: error.errors 
            })
          } else if (error instanceof Error && (error as any).code === 'COST_LIMIT') {
            sendEvent('error', { 
              message: error.message,
              code: 'COST_LIMIT'
            })
          } else {
            sendEvent('error', { message: 'Internal server error' })
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Stream setup error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to setup translation stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
