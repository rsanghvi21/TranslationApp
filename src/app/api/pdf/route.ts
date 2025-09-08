import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateBilingualPDF } from '@/lib/pdf/render'
import type { TranslationResult } from '@/lib/ai/types'

const pdfRequestSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    source: z.string(),
    translated: z.string(),
    page: z.number().optional(),
    isRTL: z.boolean().optional(),
  })),
  options: z.object({
    title: z.string().optional(),
    filename: z.string().optional(),
    includePageNumbers: z.boolean().optional(),
    includeHeader: z.boolean().optional(),
    pageSize: z.enum(['A4', 'Letter', 'Legal']).optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { results, options = {} } = pdfRequestSchema.parse(body)

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No translation results provided' },
        { status: 400 }
      )
    }

    // Set timeout from environment
    const timeout = parseInt(process.env.APP_PDF_TIMEOUT_MS || '120000')

    // Generate PDF with timeout
    const pdfBuffer = await Promise.race([
      generateBilingualPDF(results, {
        ...options,
        timeout,
        title: options.title || 'Translation Document',
        filename: options.filename || 'translation.pdf',
        includePageNumbers: options.includePageNumbers ?? true,
        includeHeader: options.includeHeader ?? true,
        pageSize: options.pageSize || 'A4',
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timeout')), timeout)
      ),
    ])

    // Return PDF as response
    const filename = options.filename || 'translation.pdf'
    
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      results: results?.length || 0,
      options
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'PDF generation timed out. Please try with a smaller document.' },
        { status: 408 }
      )
    }

    // More specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('chromium') || errorMessage.includes('playwright')) {
      return NextResponse.json(
        { error: 'PDF rendering engine not available. Please contact administrator.' },
        { status: 503 }
      )
    }

    if (errorMessage.includes('Failed to render PDF')) {
      return NextResponse.json(
        { error: `PDF generation failed: ${errorMessage}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Test if Playwright is available
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    await browser.close()
    
    return NextResponse.json({
      message: 'PDF generation API is running',
      status: 'healthy',
      playwrightAvailable: true,
      limits: {
        timeoutMs: parseInt(process.env.APP_PDF_TIMEOUT_MS || '120000'),
      },
      supportedFormats: ['A4', 'Letter', 'Legal'],
    })
  } catch (error) {
    console.error('PDF system check failed:', error)
    return NextResponse.json({
      message: 'PDF generation API has issues',
      status: 'unhealthy',
      playwrightAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      limits: {
        timeoutMs: parseInt(process.env.APP_PDF_TIMEOUT_MS || '120000'),
      },
      supportedFormats: ['A4', 'Letter', 'Legal'],
    }, { status: 503 })
  }
}
