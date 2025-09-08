import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function isValidPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token for most languages
  return Math.ceil(text.length / 4)
}

export function splitIntoChunks(text: string, maxTokens: number = 6000): string[] {
  const maxChars = maxTokens * 4 // Rough estimation
  const chunks: string[] = []
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/)
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = paragraph
      } else {
        // Paragraph is too long, split by sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/)
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChars) {
            currentChunk += (currentChunk ? ' ' : '') + sentence
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim())
            }
            currentChunk = sentence
          }
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 0)
}
