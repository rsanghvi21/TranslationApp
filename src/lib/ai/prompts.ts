import type { TranslationSettings } from './types'

export const SYSTEM_PROMPT = `You are a professional translator. Your task is to translate source text to natural, accurate English.

Guidelines:
- Preserve meaning, tone, and named entities
- Maintain paragraph boundaries; do not add commentary
- If the source is code or tabular data, retain structure
- Output plain text only for each chunk
- If text is already English, return the same text
- Ensure translations are contextually appropriate and fluent`

export function createUserPrompt(
  text: string, 
  detectedLanguage: string,
  settings: TranslationSettings
): string {
  const glossarySection = settings.glossary && Object.keys(settings.glossary).length > 0
    ? `\nGlossary (use these preferred translations):\n${Object.entries(settings.glossary)
        .map(([term, translation]) => `${term} → ${translation}`)
        .join('\n')}\n`
    : ''

  const toneInstruction = getToneInstruction(settings.tone)
  const fidelityInstruction = getFidelityInstruction(settings.fidelity)
  const lineBreaksInstruction = settings.keepLineBreaks 
    ? 'Preserve all line breaks and spacing exactly as in the source.'
    : 'Optimize paragraph structure for readability.'

  return `Source language (auto-detected): ${detectedLanguage}
Translation constraints:
- Tone: ${toneInstruction}
- Fidelity: ${fidelityInstruction}
- Line breaks: ${lineBreaksInstruction}${glossarySection}

--- SOURCE CHUNK START ---
${text}
--- SOURCE CHUNK END ---

Translate the above text to English:`
}

function getToneInstruction(tone: TranslationSettings['tone']): string {
  switch (tone) {
    case 'formal':
      return 'Use formal, professional language appropriate for business or academic contexts'
    case 'informal':
      return 'Use casual, conversational language as if speaking to a friend'
    case 'neutral':
    default:
      return 'Use neutral, clear language appropriate for general audiences'
  }
}

function getFidelityInstruction(fidelity: TranslationSettings['fidelity']): string {
  switch (fidelity) {
    case 'literal':
      return 'Stay as close as possible to the original structure and word choice'
    case 'adaptive':
      return 'Prioritize natural English expression over literal accuracy'
    case 'balanced':
    default:
      return 'Balance accuracy with natural English expression'
  }
}

export const LANGUAGE_DETECTION_PROMPT = `Identify the primary language of the following text. Respond with only the language name in English (e.g., "Spanish", "French", "Chinese", "Arabic", etc.). If the text contains multiple languages, identify the dominant one.

Text to analyze:
`
