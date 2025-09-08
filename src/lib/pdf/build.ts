import type { TranslationResult } from '../ai/types'
import { needsSpecialFonts } from '../i18n/detect'

export interface BilingualPDFOptions {
  title?: string
  filename?: string
  date?: string
  includePageNumbers?: boolean
  includeHeader?: boolean
  includeFooter?: boolean
  pageSize?: 'A4' | 'Letter' | 'Legal'
  margins?: {
    top: string
    bottom: string
    left: string
    right: string
  }
}

export function buildBilingualHTML(
  results: TranslationResult[],
  options: BilingualPDFOptions = {}
): string {
  const {
    title = 'Translation Document',
    filename = 'translation.pdf',
    date = new Date().toLocaleDateString(),
    includePageNumbers = true,
    includeHeader = true,
    includeFooter = true,
    pageSize = 'A4',
    margins = {
      top: '20mm',
      bottom: '20mm',
      left: '12mm',
      right: '12mm',
    }
  } = options

  // Determine required fonts based on content
  const allText = results.map(r => r.source + ' ' + r.translated).join(' ')
  const fontNeeds = needsSpecialFonts(allText)

  const styles = generateStyles(fontNeeds, pageSize, margins)
  const content = generateContent(results, { includeHeader, title, date })
  const scripts = includePageNumbers ? generatePageNumberScript() : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>${styles}</style>
</head>
<body>
    ${content}
    ${scripts}
</body>
</html>`
}

function generateStyles(
  fontNeeds: { cjk: boolean; rtl: boolean; indic: boolean },
  pageSize: string,
  margins: { top: string; bottom: string; left: string; right: string }
): string {
  const fontFaces = generateFontFaces(fontNeeds)
  
  return `
    ${fontFaces}
    
    @page {
      size: ${pageSize};
      margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans', system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #0A0A0A;
      margin: 0;
      padding: 0;
      background: white;
    }
    
    .page-header {
      text-align: center;
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: 1px solid #E5E5E5;
    }
    
    .page-header h1 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #4F46E5;
    }
    
    .page-header .meta {
      font-size: 10px;
      color: #666;
      margin: 0;
    }
    
    .translation-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .source-column {
      background: #F7F7F5;
      padding: 16px;
      border-radius: 8px;
      border-left: 3px solid #4F46E5;
    }
    
    .translation-column {
      background: #FFFFFF;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #E5E5E5;
    }
    
    .block-content {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .rtl {
      direction: rtl;
      text-align: right;
    }
    
    .ltr {
      direction: ltr;
      text-align: left;
    }
    
    .page-info {
      font-size: 10px;
      color: #999;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    .page-footer {
      position: fixed;
      bottom: 10mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    
    /* Print optimizations */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    /* Font optimization for different scripts */
    .cjk-text {
      font-family: 'Noto Sans CJK', 'Noto Sans', system-ui, sans-serif;
      line-height: 1.8;
    }
    
    .arabic-text {
      font-family: 'Noto Sans Arabic', 'Noto Sans', system-ui, sans-serif;
      line-height: 1.8;
    }
    
    .indic-text {
      font-family: 'Noto Sans Devanagari', 'Noto Sans', system-ui, sans-serif;
      line-height: 1.8;
    }
  `
}

function generateFontFaces(fontNeeds: { cjk: boolean; rtl: boolean; indic: boolean }): string {
  let fontFaces = `
    @font-face {
      font-family: 'Noto Sans';
      src: url('/fonts/NotoSans-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Noto Sans';
      src: url('/fonts/NotoSans-Bold.ttf') format('truetype');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
  `
  
  if (fontNeeds.cjk) {
    fontFaces += `
      @font-face {
        font-family: 'Noto Sans CJK';
        src: url('/fonts/NotoSansCJK-Regular.ttf') format('truetype');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `
  }
  
  if (fontNeeds.rtl) {
    fontFaces += `
      @font-face {
        font-family: 'Noto Sans Arabic';
        src: url('/fonts/NotoSansArabic-Regular.ttf') format('truetype');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `
  }
  
  if (fontNeeds.indic) {
    fontFaces += `
      @font-face {
        font-family: 'Noto Sans Devanagari';
        src: url('/fonts/NotoSansDevanagari-Regular.ttf') format('truetype');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `
  }
  
  return fontFaces
}

function generateContent(
  results: TranslationResult[],
  options: { includeHeader: boolean; title: string; date: string }
): string {
  const { includeHeader, title, date } = options
  
  let content = ''
  
  if (includeHeader) {
    content += `
      <div class="page-header">
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Generated on ${escapeHtml(date)} • ${results.length} blocks translated</p>
      </div>
    `
  }
  
  let currentPage = 0
  
  results.forEach((result, index) => {
    const isNewPage = result.page && result.page !== currentPage
    if (isNewPage) {
      currentPage = result.page!
      if (index > 0) {
        content += '<div class="page-break"></div>'
      }
      content += `<div class="page-info">Page ${currentPage}</div>`
    }
    
    const sourceDirection = result.isRTL ? 'rtl' : 'ltr'
    const sourceClass = getTextClass(result.source)
    const translationClass = getTextClass(result.translated)
    
    content += `
      <div class="translation-container">
        <div class="source-column">
          <div class="block-content ${sourceDirection} ${sourceClass}">${escapeHtml(result.source)}</div>
        </div>
        <div class="translation-column">
          <div class="block-content ltr ${translationClass}">${escapeHtml(result.translated)}</div>
        </div>
      </div>
    `
  })
  
  return content
}

function getTextClass(text: string): string {
  const fontNeeds = needsSpecialFonts(text)
  if (fontNeeds.cjk) return 'cjk-text'
  if (fontNeeds.rtl) return 'arabic-text'
  if (fontNeeds.indic) return 'indic-text'
  return ''
}

function generatePageNumberScript(): string {
  return `
    <script>
      // Add page numbers after content is loaded
      window.addEventListener('DOMContentLoaded', function() {
        const pageFooter = document.createElement('div')
        pageFooter.className = 'page-footer'
        pageFooter.innerHTML = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>'
        document.body.appendChild(pageFooter)
      })
    </script>
  `
}

function escapeHtml(text: string): string {
  return escapeHtmlServer(text)
}

// Fallback for server-side HTML escaping
export function escapeHtmlServer(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
