import { createAIClient } from '../ai'
import { LANGUAGE_DETECTION_PROMPT } from '../ai/prompts'

// RTL language detection patterns
const RTL_PATTERNS = [
  /[\u0600-\u06FF]/, // Arabic
  /[\u0590-\u05FF]/, // Hebrew
  /[\u0750-\u077F]/, // Arabic Supplement
  /[\u08A0-\u08FF]/, // Arabic Extended-A
  /[\uFB50-\uFDFF]/, // Arabic Presentation Forms-A
  /[\uFE70-\uFEFF]/, // Arabic Presentation Forms-B
]

// CJK patterns
const CJK_PATTERNS = [
  /[\u4E00-\u9FFF]/, // Chinese
  /[\u3040-\u309F]/, // Hiragana
  /[\u30A0-\u30FF]/, // Katakana
  /[\uAC00-\uD7AF]/, // Korean
]

// Common language patterns for quick detection
const LANGUAGE_PATTERNS = {
  'Chinese': /[\u4E00-\u9FFF]/,
  'Japanese': /[\u3040-\u309F\u30A0-\u30FF]/,
  'Korean': /[\uAC00-\uD7AF]/,
  'Arabic': /[\u0600-\u06FF]/,
  'Hebrew': /[\u0590-\u05FF]/,
  'Russian': /[\u0400-\u04FF]/,
  'Greek': /[\u0370-\u03FF]/,
  'Thai': /[\u0E00-\u0E7F]/,
  'Hindi': /[\u0900-\u097F]/,
  'Tamil': /[\u0B80-\u0BFF]/,
  'Telugu': /[\u0C00-\u0C7F]/,
  'Gujarati': /[\u0A80-\u0AFF]/,
  'Bengali': /[\u0980-\u09FF]/,
} as const

export function isRTL(text: string): boolean {
  return RTL_PATTERNS.some(pattern => pattern.test(text))
}

export function isCJK(text: string): boolean {
  return CJK_PATTERNS.some(pattern => pattern.test(text))
}

export function quickLanguageDetection(text: string): string | null {
  // Remove whitespace and get first 500 chars for detection
  const sample = text.trim().substring(0, 500)
  
  if (!sample) return null
  
  // Check for specific script patterns
  for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(sample)) {
      return language
    }
  }
  
  // Check for Latin script languages by common words/patterns
  const lowerSample = sample.toLowerCase()
  
  // Spanish
  if (/\b(el|la|de|en|un|una|con|por|para|es|son|está|están|que|como|pero|muy|más|todo|todos|esta|este|desde|hasta|entre|sobre|bajo|sin|contra|durante|mediante|según|hacia|ante|tras)\b/.test(lowerSample)) {
    return 'Spanish'
  }
  
  // French
  if (/\b(le|la|de|et|en|un|une|du|des|les|ce|cette|avec|pour|sur|dans|par|est|sont|être|avoir|que|qui|comme|mais|très|plus|tout|tous|cette|depuis|jusqu|entre|sous|sans|contre|pendant|selon|vers|avant|après)\b/.test(lowerSample)) {
    return 'French'
  }
  
  // German
  if (/\b(der|die|das|und|in|zu|den|von|ist|mit|sich|auf|für|als|werden|an|hat|im|um|am|sind|wird|war|nicht|ein|eine|auch|nach|bei|ich|sie|wir|oder|aber|alle|wenn|kann|man|über|nur|so|haben|aus|zu|noch|wie|einem|einer)\b/.test(lowerSample)) {
    return 'German'
  }
  
  // Italian
  if (/\b(il|la|di|e|in|un|una|del|dei|le|con|per|su|da|è|sono|essere|avere|che|come|ma|molto|più|tutto|tutti|questa|questo|dalla|dalle|nella|nelle|sulla|sulle|tra|fra|senza|contro|durante|secondo|verso|prima|dopo)\b/.test(lowerSample)) {
    return 'Italian'
  }
  
  // Portuguese
  if (/\b(o|a|de|e|em|um|uma|do|da|dos|das|com|para|por|na|no|nas|nos|é|são|ser|ter|que|como|mas|muito|mais|todo|todos|esta|este|essa|esse|pela|pelo|pelas|pelos|entre|sobre|sob|sem|contra|durante|segundo|para|até|desde)\b/.test(lowerSample)) {
    return 'Portuguese'
  }
  
  // Dutch
  if (/\b(de|het|en|in|een|van|is|op|met|voor|als|worden|aan|heeft|in|om|bij|zijn|wordt|was|niet|ook|na|door|uit|te|nog|zoals|hebben|maar|alle|wanneer|kan|men|over|alleen|zo|uit|naar|nog|zoals|onder|tussen|zonder|tegen|tijdens|volgens|naar|voor|na)\b/.test(lowerSample)) {
    return 'Dutch'
  }
  
  return null
}

export async function detectLanguageWithAI(text: string, provider: 'openai' | 'gemini' = 'openai'): Promise<string> {
  try {
    const client = createAIClient(provider)
    const sample = text.trim().substring(0, 1000) // Use first 1000 chars
    
    const result = await client.translateChunk({
      model: provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash',
      system: 'You are a language detection expert. Identify languages accurately and respond with only the language name.',
      user: LANGUAGE_DETECTION_PROMPT + sample,
      temperature: 0,
      maxTokens: 50,
    })
    
    return result.trim()
  } catch (error) {
    console.error('AI language detection failed:', error)
    throw new Error('Language detection failed')
  }
}

export async function detectLanguage(text: string, useAI: boolean = false, provider?: 'openai' | 'gemini'): Promise<string> {
  if (!text.trim()) {
    return 'Unknown'
  }
  
  // Try quick detection first
  const quickResult = quickLanguageDetection(text)
  if (quickResult && !useAI) {
    return quickResult
  }
  
  // If English text is detected or no pattern matches, check if it's actually English
  const englishWords = /\b(the|be|to|of|and|a|in|that|have|i|it|for|not|on|with|he|as|you|do|at|this|but|his|by|from|they|she|or|an|will|my|one|all|would|there|their|we|him|been|has|had|which|more|when|who|oil|its|did|get|may|new|now|way|could|time|very|what|know|just|first|into|over|think|also|your|work|life|only|can|still|should|after|being|made|before|here|through|when|where|much|go|good|how|too|any|each|most|us|no|some|what|up|out|many|then|them|these|so|some|her|would|make|like|him|into|time|has|two|more|go|no|way|could|my|than|first|been|call|who|its|now|find|long|down|day|did|get|come|made|may|part)\b/gi
  const englishMatches = text.match(englishWords)
  const totalWords = text.split(/\s+/).length
  const englishRatio = englishMatches ? englishMatches.length / totalWords : 0
  
  if (englishRatio > 0.3) {
    return 'English'
  }
  
  // Fall back to AI detection if enabled
  if (useAI && provider) {
    try {
      return await detectLanguageWithAI(text, provider)
    } catch {
      // If AI fails, return quick result or unknown
      return quickResult || 'Unknown'
    }
  }
  
  return quickResult || 'Unknown'
}

// Utility function to get text direction
export function getTextDirection(text: string): 'ltr' | 'rtl' {
  return isRTL(text) ? 'rtl' : 'ltr'
}

// Utility function to determine if text needs special font handling
export function needsSpecialFonts(text: string): { cjk: boolean; rtl: boolean; indic: boolean } {
  const cjk = isCJK(text)
  const rtl = isRTL(text)
  const indic = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/.test(text)
  
  return { cjk, rtl, indic }
}
