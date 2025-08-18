//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { MeasureContext } from '@hcengineering/core'
import { MtaMessage } from './types'
import { getHeader } from './utils'

export function getDecodedContent (ctx: MeasureContext, mta: MtaMessage): string {
  const contentEncoding = getHeader(mta, 'Content-Transfer-Encoding')
  return decodeContent(ctx, mta.message.contents, contentEncoding)
}

export function decodeContent (ctx: MeasureContext, content: string, encoding: string | undefined): string {
  if (encoding == null || encoding.trim() === '') {
    return content
  }

  const normalizedEncoding = encoding.toLowerCase().trim()

  switch (normalizedEncoding) {
    case 'base64':
      try {
        return Buffer.from(content, 'base64').toString('utf-8')
      } catch (error: any) {
        ctx.warn('Failed to decode base64 content:', { error: error.message })
        return content
      }

    case 'quoted-printable':
      return decodeQuotedPrintable(content)
    case '7bit':
    case '8bit':
    case 'binary':
    default:
      return content
  }
}

function decodeQuotedPrintable (content: string): string {
  return content
    .replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=$/gm, '') // Remove trailing = at end of lines
}

export function decodeEncodedWords (ctx: MeasureContext, text: string): string {
  // RFC 2047 encoded word pattern: =?charset?encoding?encoded_text?=
  const encodedWordPattern = /=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g

  return text.replace(encodedWordPattern, (match, charset, encoding, encodedText) => {
    try {
      const normalizedEncoding = encoding.toLowerCase()
      let decodedBytes: Buffer

      if (normalizedEncoding === 'b') {
        // Base64 encoding
        decodedBytes = Buffer.from(encodedText, 'base64')
      } else if (normalizedEncoding === 'q') {
        // Quoted-printable encoding (with some modifications for encoded words)
        const qpDecoded = encodedText
          .replace(/_/g, ' ') // Underscores represent spaces in encoded words
          .replace(/=([0-9A-F]{2})/gi, (_match: any, hex: string) => {
            return String.fromCharCode(parseInt(hex, 16))
          })
        decodedBytes = Buffer.from(qpDecoded, 'binary')
      } else {
        // Unknown encoding, return original
        return match
      }

      // Convert to string using the specified charset
      const normalizedCharset = normalizeCharset(charset)
      return decodedBytes.toString(normalizedCharset)
    } catch (error: any) {
      ctx.warn('Failed to decode encoded word:', { match, error: error.message })
      return match // Return original if decoding fails
    }
  })
}

function normalizeCharset (charset: string): BufferEncoding {
  const normalized = charset.toLowerCase().trim()

  // Map common charset aliases to Node.js Buffer encodings
  switch (normalized) {
    case 'utf-8':
    case 'utf8':
      return 'utf8'

    case 'iso-8859-1':
    case 'latin1':
    case 'cp1252':
    case 'windows-1252':
      return 'latin1'

    case 'ascii':
    case 'us-ascii':
      return 'ascii'

    case 'utf-16':
    case 'utf-16le':
    case 'ucs-2':
    case 'ucs2':
      return 'utf16le'

    case 'base64':
      return 'base64'

    case 'hex':
      return 'hex'

    // For any unsupported charset, default to utf8
    default:
      return 'utf8'
  }
}
