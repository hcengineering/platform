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

import { SaxesParser } from 'saxes'

const blockTags = [
  'address',
  'article',
  'aside',
  'blockquote',
  'canvas',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tfoot',
  'ul',
  'video'
]
const ELLIPSIS_CHAR = '…'
const WHITESPACE = ' '

export function stripTags (htmlString: string, textLimit = 0): string {
  const parser = new SaxesParser()
  const plainList: string[] = []
  let charCount = 0
  let isHardStop = false

  parser.on('text', (text: string) => {
    if (isHardStop) {
      return
    }

    if (textLimit > 0 && charCount + text.length > textLimit) {
      const toAddCount = textLimit - charCount
      const textPart = text.substring(0, toAddCount)
      plainList.push(textPart)
      plainList.push(ELLIPSIS_CHAR)
      isHardStop = true
      return
    }

    charCount += text.length
    plainList.push(text)
  })

  parser.on('opentag', (node) => {
    if (isHardStop) {
      return
    }

    const tagName = node.name.toLowerCase()
    if (blockTags.includes(tagName)) {
      if (plainList.length > 0 && plainList[plainList.length - 1] !== WHITESPACE) {
        plainList.push(WHITESPACE)
        charCount++
      }
    }
  })

  parser.write(htmlString).close()

  const text = plainList.join('')
  // TODO: remove repetetibe white spaces
  return text
}
