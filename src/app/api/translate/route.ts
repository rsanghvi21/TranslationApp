import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { extractTextFromPDF, mergeTextBlocks, splitLargeBlocks } from '@/lib/pdf/extract'
import { detectLanguage } from '@/lib/i18n/detect'
import { translateChunk, TranslationQueue } from '@/lib/ai'
import { splitIntoChunks, generateId } from '@/lib/utils'
import type { TranslationChunk, TranslationSettings, TranslationResult } from '@/lib/ai/types'

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
      return NextResponse.json(
        { error: 'No AI provider API keys configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { input, settings } = translateRequestSchema.parse(body)

    // Extract text based on input type
    let textBlocks: TranslationChunk[] = []
    
    if (input.type === 'text') {
      if (!input.text?.trim()) {
        return NextResponse.json(
          { error: 'Text input is required' },
          { status: 400 }
        )
      }

      const chunks = splitIntoChunks(input.text, 6000)
      textBlocks = chunks.map((text, index) => ({
        id: `text-${index}`,
        text,
        page: 1,
      }))
    } else if (input.type === 'pdf') {
      if (!input.fileData) {
        return NextResponse.json(
          { error: 'PDF file data is required' },
          { status: 400 }
        )
      }

      try {
        const buffer = Buffer.from(input.fileData, 'base64')
        const maxSize = parseInt(process.env.APP_MAX_FILE_MB || '25') * 1024 * 1024
        
        if (buffer.length > maxSize) {
          return NextResponse.json(
            { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
            { status: 400 }
          )
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
        return NextResponse.json(
          { error: 'Failed to process PDF file' },
          { status: 400 }
        )
      }
    }

    if (textBlocks.length === 0) {
      return NextResponse.json(
        { error: 'No text found to translate' },
        { status: 400 }
      )
    }

    // Detect language from first few blocks
    const sampleText = textBlocks
      .slice(0, 3)
      .map(block => block.text)
      .join('\n')
      .substring(0, 1000)

    const detectedLanguage = await detectLanguage(sampleText, true, settings.provider)

    // Check if already in English
    if (detectedLanguage.toLowerCase() === 'english') {
      const results: TranslationResult[] = textBlocks.map(chunk => ({
        id: chunk.id,
        source: chunk.text,
        translated: chunk.text, // Same text if already English
        page: chunk.page,
        isRTL: chunk.isRTL,
      }))

      return NextResponse.json({
        success: true,
        detectedLanguage,
        results,
        stats: {
          totalChunks: textBlocks.length,
          totalCharacters: textBlocks.reduce((sum, chunk) => sum + chunk.text.length, 0),
        },
      })
    }

    // Translate chunks with concurrency control
    const translationQueue = new TranslationQueue(3) // Max 3 concurrent requests
    const results: TranslationResult[] = []
    const errors: string[] = []

    const translationPromises = textBlocks.map(async (chunk) => {
      try {
        const result = await translationQueue.add(() =>
          translateChunk(chunk, detectedLanguage, settings)
        )
        return result
      } catch (error) {
        console.error(`Translation failed for chunk ${chunk.id}:`, error)
        
        // Handle cost limit errors specially
        if (error instanceof Error && (error as any).code === 'COST_LIMIT') {
          throw error // Propagate cost limit errors immediately
        }
        
        errors.push(`Chunk ${chunk.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        
        // Return original text as fallback
        return {
          id: chunk.id,
          source: chunk.text,
          translated: chunk.text,
          page: chunk.page,
          isRTL: chunk.isRTL,
        } as TranslationResult
      }
    })

    const translationResults = await Promise.all(translationPromises)
    results.push(...translationResults)

    // Sort results by original order (by ID)
    results.sort((a, b) => {
      const aIndex = textBlocks.findIndex(chunk => chunk.id === a.id)
      const bIndex = textBlocks.findIndex(chunk => chunk.id === b.id)
      return aIndex - bIndex
    })

    return NextResponse.json({
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
    console.error('Translation API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    // Handle cost limit errors
    if (error instanceof Error && (error as any).code === 'COST_LIMIT') {
      return NextResponse.json(
        { error: error.message, code: 'COST_LIMIT' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Translation API is running',
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GOOGLE_API_KEY,
    },
    limits: {
      maxFileSizeMB: parseInt(process.env.APP_MAX_FILE_MB || '25'),
      timeoutMs: parseInt(process.env.APP_PDF_TIMEOUT_MS || '120000'),
    },
  })
}
