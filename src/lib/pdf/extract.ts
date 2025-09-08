// Import pdf-parse dynamically to avoid build issues
let pdfjsLib: any
import { isRTL } from '../i18n/detect'

export interface TextBlock {
  id: string
  page: number
  text: string
  isRTL?: boolean
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface PDFExtractionResult {
  blocks: TextBlock[]
  totalPages: number
  metadata?: {
    title?: string
    author?: string
    creator?: string
    producer?: string
    creationDate?: string
    modificationDate?: string
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    // Dynamic import to avoid build issues
    if (!pdfjsLib) {
      pdfjsLib = (await import('pdf-parse')).default
    }
    const pdfData = await pdfjsLib(buffer)
    
    // Basic extraction - pdf-parse gives us the full text
    const fullText = pdfData.text
    const totalPages = pdfData.numpages
    
    // Split text into meaningful blocks
    // For now, we'll split by double newlines (paragraphs) and assign to pages
    const paragraphs = fullText
      .split(/\n\s*\n/)
      .filter((p: string) => p.trim().length > 0)
      .map((p: string) => p.replace(/\s+/g, ' ').trim())
    
    const blocks: TextBlock[] = []
    const paragraphsPerPage = Math.max(1, Math.ceil(paragraphs.length / totalPages))
    
    paragraphs.forEach((text: string, index: number) => {
      const page = Math.floor(index / paragraphsPerPage) + 1
      const block: TextBlock = {
        id: `block-${index}`,
        page: Math.min(page, totalPages),
        text,
        isRTL: isRTL(text),
      }
      blocks.push(block)
    })
    
    return {
      blocks,
      totalPages,
      metadata: {
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        creator: pdfData.info?.Creator,
        producer: pdfData.info?.Producer,
        creationDate: pdfData.info?.CreationDate,
        modificationDate: pdfData.info?.ModDate,
      }
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Advanced PDF text extraction using pdf2pic + OCR (future enhancement)
export async function extractTextFromScannedPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  // This would use Tesseract.js for OCR on scanned PDFs
  // For now, we'll throw an error to indicate this isn't supported yet
  throw new Error('Scanned PDF extraction not yet implemented. Please use text-based PDFs.')
}

// Utility function to validate PDF
export function validatePDF(buffer: Buffer): boolean {
  // Check PDF signature
  const signature = buffer.subarray(0, 4).toString()
  return signature === '%PDF'
}

// Utility function to detect if PDF is scanned (image-only)
export async function isPDFScanned(buffer: Buffer): Promise<boolean> {
  try {
    const result = await extractTextFromPDF(buffer)
    // If we get very little text relative to the number of pages, it's likely scanned
    const avgTextPerPage = result.blocks.reduce((sum, block) => sum + block.text.length, 0) / result.totalPages
    return avgTextPerPage < 100 // Less than 100 characters per page suggests scanned content
  } catch {
    return true // If extraction fails, assume it's scanned
  }
}

// Merge small text blocks that belong together
export function mergeTextBlocks(blocks: TextBlock[], minBlockSize: number = 50): TextBlock[] {
  const merged: TextBlock[] = []
  let currentBlock: TextBlock | null = null
  
  for (const block of blocks) {
    if (!currentBlock) {
      currentBlock = { ...block }
      continue
    }
    
    // If on the same page and both blocks are small, merge them
    if (
      currentBlock.page === block.page &&
      currentBlock.text.length < minBlockSize &&
      block.text.length < minBlockSize
    ) {
      currentBlock.text += '\n\n' + block.text
      currentBlock.id = `${currentBlock.id}-${block.id}`
    } else {
      merged.push(currentBlock)
      currentBlock = { ...block }
    }
  }
  
  if (currentBlock) {
    merged.push(currentBlock)
  }
  
  return merged
}

// Split large text blocks for better translation
export function splitLargeBlocks(blocks: TextBlock[], maxBlockSize: number = 2000): TextBlock[] {
  const result: TextBlock[] = []
  
  for (const block of blocks) {
    if (block.text.length <= maxBlockSize) {
      result.push(block)
      continue
    }
    
    // Split by sentences, then by paragraphs if needed
    const sentences = block.text.split(/(?<=[.!?])\s+/)
    let currentChunk = ''
    let chunkIndex = 0
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= maxBlockSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence
      } else {
        if (currentChunk) {
          result.push({
            id: `${block.id}-${chunkIndex}`,
            page: block.page,
            text: currentChunk.trim(),
            isRTL: block.isRTL,
          })
          chunkIndex++
        }
        currentChunk = sentence
      }
    }
    
    if (currentChunk) {
      result.push({
        id: `${block.id}-${chunkIndex}`,
        page: block.page,
        text: currentChunk.trim(),
        isRTL: block.isRTL,
      })
    }
  }
  
  return result
}
