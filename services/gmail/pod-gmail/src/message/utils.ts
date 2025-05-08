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
import TurndownService from 'turndown'
import sanitizeHtml from 'sanitize-html'
import { EmailMessage } from '@hcengineering/mail-common'
import { MeasureContext } from '@hcengineering/core'

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
