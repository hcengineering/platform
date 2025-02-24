import {} from 'mime-types'
import { docExtractor } from './doc'
import { docxExtractor } from './docx'
import { htmlExtractor } from './html'
import { pdfExtractor } from './pdf'
import { rtfExtractor } from './rtf'
import { DocumentExtractor } from './types'
export * from './types'

const extractors: Record<string, DocumentExtractor> = {
  pdf: pdfExtractor,
  rtf: rtfExtractor,
  html: htmlExtractor,
  doc: docExtractor,
  docx: docxExtractor
}

export async function extract (
  fileName: string,
  type: string | false,
  data: Buffer
): Promise<{ matched: boolean, content: string, error?: any }> {
  if (type === false) {
    return { matched: true, content: '', error: new Error('Unknown file type') }
  }
  console.log('extracting text ', fileName, type)
  for (const ex of Object.entries(extractors)) {
    if (await ex[1].isMatch(fileName, type, data)) {
      try {
        const content = await ex[1].extract(fileName, type, data)
        return { matched: true, content }
      } catch (err: any) {
        console.log(err)
        return { matched: true, content: '', error: err }
      }
    }
  }
  return { matched: false, content: '' }
}
