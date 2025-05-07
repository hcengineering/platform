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
    const parts = address.split('@')
    return {
      email: address,
      firstName: parts[0],
      lastName: parts[1]
    }
  }

  const displayName = match[1]?.trim()
  const email = match[2].trim()

  if (displayName == null || displayName === '') {
    const parts = email.split('@')
    return {
      email,
      firstName: parts[0],
      lastName: parts[1]
    }
  }

  const nameParts = displayName.split(/\s+/)
  let firstName: string | undefined
  let lastName: string | undefined

  if (nameParts.length === 1) {
    firstName = nameParts[0]
  } else if (nameParts.length > 1) {
    firstName = nameParts[0]
    lastName = nameParts.slice(1).join(' ')
  }

  const parts = email.split('@')
  return {
    email,
    firstName: firstName ?? parts[0],
    lastName: lastName ?? parts[1]
  }
}
