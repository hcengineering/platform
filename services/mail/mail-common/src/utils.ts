//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import TurndownService from 'turndown'
import sanitizeHtml from 'sanitize-html'

import { MeasureContext } from '@hcengineering/core'
import { EmailContact, EmailMessage } from './types'

export function getMdContent (ctx: MeasureContext, email: EmailMessage): string {
  if (email.content !== undefined) {
    try {
      const html = sanitizeHtml(email.content)
      const tds = new TurndownService()
      return tds.turndown(html)
    } catch (error) {
      ctx.warn('Failed to parse html content', { error })
    }
  }
  return email.textContent
}

/**
 * Parse email header into EmailContact objects
 * Supports both single and multiple addresses in formats like:
 * - "Name" <email@example.com>
 * - Name <email@example.com>
 * - email@example.com
 * - Multiple comma-separated addresses in any of the above formats
 *
 * @param headerValue Email header value to parse
 * @returns Array of EmailContact objects
 */
export function parseEmailHeader (headerValue: string | undefined): EmailContact[] {
  if (headerValue == null || headerValue.trim() === '') {
    return []
  }

  // Split the header by commas, but ignore commas inside quotes
  const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/
  const addresses = headerValue
    .split(regex)
    .map((addr) => addr.trim())
    .filter((addr) => addr !== '')

  return addresses.map((address) => parseNameFromEmailHeader(address))
}

export function parseNameFromEmailHeader (headerValue: string | undefined): EmailContact {
  if (headerValue == null || headerValue.trim() === '') {
    return {
      email: '',
      firstName: '',
      lastName: ''
    }
  }

  // Match pattern like: "Name" <email@example.com> or Name <email@example.com>
  const nameEmailPattern = /^(?:"?([^"<]+)"?\s*)?<([^>]+)>$/
  const match = headerValue.trim().match(nameEmailPattern)

  if (match == null) {
    const address = headerValue.trim()
    return {
      email: address,
      firstName: address,
      lastName: ''
    }
  }

  const displayName = match[1]?.trim()
  const email = match[2].trim()

  const wrappedEmail = displayName != null && displayName.length > 0 ? `<${email}>` : email
  return {
    email,
    firstName: wrappedEmail,
    lastName: displayName ?? ''
  }
}
