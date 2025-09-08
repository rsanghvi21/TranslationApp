# Claude Translator

A Claude-themed AI translator that converts text or PDF documents to bilingual PDFs with original text on the left and English translation on the right.

![Claude Translator](public/screenshot.png)

## Features

- 🌍 **Multi-language Support**: Translate from 100+ languages to English
- 📄 **PDF & Text Input**: Upload PDF files or paste text directly
- 🤖 **Multiple AI Providers**: Choose between OpenAI GPT models and Google Gemini
- 🎨 **Beautiful Output**: Generate professional bilingual PDFs with side-by-side layout
- 🔍 **Smart Detection**: Automatic language detection with RTL and CJK script support
- ⚡ **Fast Processing**: Concurrent translation with progress tracking
- 🔒 **Secure**: No permanent file storage, API keys stay server-side
- 🎯 **Customizable**: Adjust tone, fidelity, and formatting options

## Tech Stack

- **Framework**: Next.js 14+ with App Router, TypeScript
- **Styling**: Tailwind CSS with Claude-inspired design tokens
- **UI Components**: shadcn/ui with Radix UI primitives
- **AI Providers**: OpenAI GPT models, Google Gemini
- **PDF Processing**: pdf-parse for extraction, Playwright for generation
- **Language Detection**: Custom pattern matching + AI fallback
- **Fonts**: Noto Sans family for global script support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for translation providers:
  - OpenAI API key (recommended: GPT-4o-mini)
  - Google AI API key (for Gemini models)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd claude-translator
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

4. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your API keys:
```env
# AI Provider API Keys (at least one required)
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_API_KEY="your-google-ai-api-key"

# App Configuration
APP_MAX_FILE_MB="25"
APP_PDF_TIMEOUT_MS="120000"
NEXT_PUBLIC_APP_NAME="Claude Translator"
```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Upload or Paste Content**
   - Drag & drop a PDF file or click to browse
   - Or switch to text mode and paste content directly

2. **Configure Settings**
   - Choose AI provider (OpenAI or Gemini)
   - Select model (GPT-4o-mini recommended for speed/cost)
   - Adjust tone (formal, neutral, informal)
   - Set translation fidelity (literal, balanced, adaptive)

3. **Translate**
   - Click "Translate to English"
   - Watch real-time progress as chunks are processed
   - Review results in the bilingual preview

4. **Download PDF**
   - Click "Download PDF" to generate the final document
   - Original text appears on the left, translation on the right
   - Includes page numbers, headers, and proper typography

## API Endpoints

### POST `/api/translate`
Translate text or PDF content.

**Request:**
```json
{
  "input": {
    "type": "text" | "pdf",
    "text": "string (for text input)",
    "fileData": "base64-string (for PDF input)"
  },
  "settings": {
    "provider": "openai" | "gemini",
    "model": "string",
    "tone": "formal" | "neutral" | "informal",
    "fidelity": "literal" | "balanced" | "adaptive",
    "keepLineBreaks": boolean,
    "glossary": { "term": "translation" }
  }
}
```

### POST `/api/pdf`
Generate bilingual PDF from translation results.

**Request:**
```json
{
  "results": [
    {
      "id": "string",
      "source": "string",
      "translated": "string",
      "page": number,
      "isRTL": boolean
    }
  ],
  "options": {
    "title": "string",
    "filename": "string",
    "pageSize": "A4" | "Letter" | "Legal"
  }
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: OpenAI API key for GPT models
- `GOOGLE_API_KEY`: Google AI API key for Gemini models
- `APP_MAX_FILE_MB`: Maximum upload file size (default: 25)
- `APP_PDF_TIMEOUT_MS`: PDF generation timeout (default: 120000)

### Supported Models

**OpenAI:**
- `gpt-4o-mini` (recommended - fast & economical)
- `gpt-4o` (highest quality)
- `gpt-4-turbo` (balanced)
- `gpt-3.5-turbo` (budget)

**Google Gemini:**
- `gemini-1.5-flash` (recommended - fast)
- `gemini-1.5-pro` (highest quality)
- `gemini-1.0-pro` (stable)

## Font Support

The app includes Noto Sans fonts for comprehensive language support:

- **Latin scripts**: English, European languages
- **CJK scripts**: Chinese, Japanese, Korean
- **RTL scripts**: Arabic, Hebrew
- **Indic scripts**: Hindi, Tamil, Bengali, etc.

Fonts are embedded in generated PDFs for consistent rendering.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Limitations

- Maximum file size: 25MB (configurable)
- PDF generation timeout: 2 minutes (configurable)
- Scanned PDFs require OCR (not yet implemented)
- Rate limits depend on chosen AI provider

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit: `git commit -m 'Add feature'`
5. Push: `git push origin feature-name`
6. Create a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Anthropic Claude** for design inspiration
- **OpenAI** and **Google** for AI translation capabilities
- **Noto Fonts** for comprehensive typography support
- **shadcn/ui** for beautiful, accessible components
- **Vercel** for seamless deployment platform

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review environment setup

---

Built with ❤️ using Next.js, TypeScript, and modern AI technologies.
