//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Doc, Hierarchy } from '@hcengineering/core'
import { concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getObjectLinkFragment } from '@hcengineering/view-resources'
import { locationToUrl } from '@hcengineering/ui'
import { escapeMarkdownLinkText, escapeMarkdownLinkUrl } from './escape'

/**
 * Create a markdown link for a document
 */
export async function createMarkdownLink (hierarchy: Hierarchy, card: Doc, value: string): Promise<string> {
  const EDIT_DOC_COMPONENT = 'view:component:EditDoc'
  try {
    const loc = await getObjectLinkFragment(hierarchy, card, {}, EDIT_DOC_COMPONENT as any)
    const relativeUrl = locationToUrl(loc)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    const fullUrl = concatLink(frontUrl, relativeUrl)
    const escapedText = escapeMarkdownLinkText(value)
    const escapedUrl = escapeMarkdownLinkUrl(fullUrl)
    return `[${escapedText}](${escapedUrl})`
  } catch (error) {
    console.warn('Error creating markdown link', error)
    return escapeMarkdownLinkText(value)
  }
}
