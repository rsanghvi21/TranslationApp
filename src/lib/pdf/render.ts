import { chromium, Browser, Page } from 'playwright'
import type { TranslationResult } from '../ai/types'
import { buildBilingualHTML, type BilingualPDFOptions } from './build'

export interface PDFRenderOptions extends BilingualPDFOptions {
  timeout?: number
  quality?: number
  landscape?: boolean
  printBackground?: boolean
}

export async function renderPDFFromHTML(html: string, options: PDFRenderOptions = {}): Promise<Buffer> {
  const {
    timeout = 120000,
    landscape = false,
    printBackground = true,
    pageSize = 'A4',
    margins = {
      top: '20mm',
      bottom: '20mm',
      left: '12mm',
      right: '12mm',
    }
  } = options

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // Launch browser with optimized settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    })

    page = await browser.newPage()

    // Set longer timeout for complex PDFs
    page.setDefaultTimeout(timeout)

    // Set content and wait for fonts to load
    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout,
    })

    // Wait for fonts to be fully loaded
    await page.evaluate(() => {
      return document.fonts.ready
    })

    // Additional wait for any dynamic content
    await page.waitForTimeout(1000)

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: pageSize.toLowerCase() as any,
      landscape,
      printBackground,
      margin: {
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right,
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false, // We handle headers/footers in HTML
    })

    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error('PDF rendering error:', error)
    throw new Error(`Failed to render PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    if (page) {
      await page.close().catch(console.error)
    }
    if (browser) {
      await browser.close().catch(console.error)
    }
  }
}

export async function generateBilingualPDF(
  results: TranslationResult[],
  options: PDFRenderOptions = {}
): Promise<Buffer> {
  if (results.length === 0) {
    throw new Error('No translation results provided')
  }

  // Build HTML content
  const html = buildBilingualHTML(results, options)

  // Render to PDF
  return renderPDFFromHTML(html, options)
}

// Utility function to estimate PDF size before generation
export function estimatePDFPages(results: TranslationResult[]): number {
  // Rough estimation based on content length
  const totalChars = results.reduce((sum, result) => 
    sum + result.source.length + result.translated.length, 0
  )
  
  // Assume ~2000 characters per page (very rough estimate)
  return Math.max(1, Math.ceil(totalChars / 2000))
}

// Utility function to validate rendering options
export function validateRenderOptions(options: PDFRenderOptions): void {
  if (options.timeout && options.timeout < 10000) {
    throw new Error('Timeout must be at least 10 seconds')
  }
  
  if (options.quality && (options.quality < 0 || options.quality > 100)) {
    throw new Error('Quality must be between 0 and 100')
  }
}

// Stream-friendly PDF generation for large documents
export async function generatePDFStream(
  results: TranslationResult[],
  options: PDFRenderOptions = {}
): Promise<AsyncIterable<Buffer>> {
  // For very large documents, we might want to process in chunks
  // For now, this is a simple wrapper around the main function
  const pdfBuffer = await generateBilingualPDF(results, options)
  
  return (async function* () {
    yield pdfBuffer
  })()
}

// Cleanup utility for temporary files
export function cleanupTempFiles(fileIds: string[]): void {
  // Implementation would clean up any temporary files created during PDF generation
  // This is a placeholder for future temp file management
  console.log(`Cleaning up temporary files: ${fileIds.join(', ')}`)
}
