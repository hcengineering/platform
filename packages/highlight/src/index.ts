//
// Copyright © 2024 Hardcore Engineering Inc.
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

import hljs, { type LanguageFn } from 'highlight.js'
import { all } from 'lowlight'
import { svelte } from './languages/svelte'
import { vlang } from './languages/vlang'

/** @public */
export const grammars: Record<string, LanguageFn> = {
  ...all,
  svelte,
  vlang
}

Object.entries(grammars).forEach((grammar) => {
  hljs.registerLanguage(...grammar)
})

/** @public */
export interface HighlightOptions {
  auto?: boolean
  language: string | undefined
}

/** @public */
export function highlightText (text: string, options: HighlightOptions): string {
  // We should always use highlighter because it sanitizes the input
  // We have to always use highlighter to ensure that the input is sanitized
  const { language, auto } = options
  const validLanguage = language !== undefined && hljs.getLanguage(language) !== undefined

  const { value: highlighted } = validLanguage
    ? hljs.highlight(text, { language })
    : auto === true
      ? hljs.highlightAuto(text)
      : { value: text }

  return normalizeHighlightTags(highlighted)
}

/** @public */
export function highlightLines (lines: string[], options: HighlightOptions): string[] {
  const highlighted = highlightText(lines.join('\n'), options)
  return highlighted.split('\n')
}

function normalizeHighlightTags (highlighted: string): string {
  const openTags: string[] = []

  const normalized = highlighted.replace(/(<span[^>]*>)|(<\/span>)|(\n)/g, (match) => {
    if (match === '\n') {
      return '</span>'.repeat(openTags.length) + '\n' + openTags.join('')
    }

    if (match === '</span>') {
      openTags.pop()
    } else {
      openTags.push(match)
    }

    return match
  })

  return normalized
}
