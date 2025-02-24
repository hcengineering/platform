import { convert } from 'html-to-text'
import { contentType } from 'mime-types'
import { DocumentExtractor } from './types'

export const htmlExtractor: DocumentExtractor = {
  async isMatch (fileName: string, type: string | false, data): Promise<boolean> {
    if (type === false) return false
    if (isType(type)) {
      return true
    }
    // Try detect by fileName
    type = contentType(fileName)
    return type === false ? false : isType(type)
  },

  async extract (fileName: string, type: string, data): Promise<string> {
    return convertString(data.toString())
  }
}
export function convertString (text: string): string {
  return convert(text, {
    preserveNewlines: true,
    selectors: [{ selector: 'img', format: 'skip' }]
  })
}
function isType (type: string): boolean {
  return type === 'text/html' || type === 'application/xhtml+xml'
}
