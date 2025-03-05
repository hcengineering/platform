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

import { MarkupNode } from '@hcengineering/text-core'
import { MarkdownParser } from './parser'
import { MarkdownState, storeMarks, storeNodes } from './serializer'

export * from './compare'
export * from './parser'
export * from './serializer'

/** @public */
export interface MarkdownOptions {
  refUrl?: string
  imageUrl?: string
}

/** @public */
export function markupToMarkdown (markup: MarkupNode, options?: MarkdownOptions): string {
  const refUrl = options?.refUrl ?? 'ref://'
  const imageUrl = options?.imageUrl ?? 'image://'

  const state = new MarkdownState(storeNodes, storeMarks, { tightLists: true, refUrl, imageUrl })
  state.renderContent(markup)
  return state.out
}

/** @public */
export function markdownToMarkup (markdown: string, options?: MarkdownOptions): MarkupNode {
  const refUrl = options?.refUrl ?? 'ref://'
  const imageUrl = options?.imageUrl ?? 'image://'

  const parser = new MarkdownParser({ refUrl, imageUrl })
  return parser.parse(markdown ?? '')
}
