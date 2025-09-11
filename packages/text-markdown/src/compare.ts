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

/**
 * Calculate Sørensen–Dice coefficient
 */
export function calcSørensenDiceCoefficient (a: string, b: string): number {
  const first = a.replace(/\s+/g, '')
  const second = b.replace(/\s+/g, '')

  if (first === second) return 1 // identical or empty
  if (first.length < 2 || second.length < 2) return 0 // if either is a 0-letter or 1-letter string

  const firstBigrams = new Map<string, number>()
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substring(i, i + 2)
    const count = (firstBigrams.get(bigram) ?? 0) + 1

    firstBigrams.set(bigram, count)
  }

  let intersectionSize = 0
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substring(i, i + 2)
    const count = firstBigrams.get(bigram) ?? 0

    if (count > 0) {
      firstBigrams.set(bigram, count - 1)
      intersectionSize++
    }
  }

  return (2.0 * intersectionSize) / (first.length + second.length - 2)
}

/**
 * Perform markdown diff/comparison to understand do we have a major differences.
 */
export function isMarkdownsEquals (source1: string, source2: string): boolean {
  const normalized1 = normalizeMarkdown(source1)
  const normalized2 = normalizeMarkdown(source2)
  return normalized1 === normalized2
}

export function normalizeMarkdown (source: string): string {
  const tagRegex = /<(\w+)([^>]*?)(\/?)>/g
  const attrRegex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

  // Normalize line endings to LF
  source = source.replace(/\r?\n/g, '\n')

  // Remove extra blank lines
  source = source
    .split('\n')
    .map((it) => it.trimEnd())
    .filter((it) => it.length > 0)
    .join('\n')

  // Normalize HTML tags
  source = source.replace(tagRegex, (match, tagName, attributes) => {
    const attrs: Record<string, string> = {}

    let attrMatch = attrRegex.exec(attributes)
    while (attrMatch !== null) {
      const attrName = attrMatch[1]
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''
      attrs[attrName] = attrValue
      attrMatch = attrRegex.exec(attributes)
    }

    // Sort attributes by name for consistent order
    const sortedAttrs = Object.keys(attrs)
      .sort()
      .map((key) => {
        const value = attrs[key]
        return value !== '' ? `${key}="${value}"` : key
      })
      .join(' ')

    // Normalize to self-closing format for void elements
    const voidElements = [
      'img',
      'br',
      'hr',
      'input',
      'meta',
      'area',
      'base',
      'col',
      'embed',
      'link',
      'param',
      'source',
      'track',
      'wbr'
    ]
    const isVoidElement = voidElements.includes(tagName.toLowerCase())

    if (sortedAttrs !== '') {
      return isVoidElement ? `<${tagName} ${sortedAttrs} />` : `<${tagName} ${sortedAttrs}>`
    } else {
      return isVoidElement ? `<${tagName} />` : `<${tagName}>`
    }
  })

  return source
}
