//
// Copyright © 2023 Hardcore Engineering Inc.
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

import hljs from 'highlight.js'
import { hljsDefineSvelte } from './languages/svelte-hljs'

hljs.registerLanguage('svelte', hljsDefineSvelte)

export interface HighlightOptions {
  language: string | undefined
}

export function highlightText (text: string, options: HighlightOptions): string {
  // We should always use highlighter because it sanitizes the input
  // We have to always use highlighter to ensure that the input is sanitized
  const { language } = options
  const validLanguage = language !== undefined && hljs.getLanguage(language) !== undefined

  const { value: highlighted } = validLanguage ? hljs.highlight(text, { language }) : hljs.highlightAuto(text)

  return normalizeHighlightTags(highlighted)
}

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
