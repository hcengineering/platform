//
// Copyright © 2024 Hardcore Engineering Inc.
//
import mammoth from 'mammoth'
import sanitizeHtml from 'sanitize-html'

export async function convertToHtml (buffer: Buffer): Promise<string> {
  const html = (await mammoth.convertToHtml({ buffer })).value
  return sanitizeHtml(html)
}
