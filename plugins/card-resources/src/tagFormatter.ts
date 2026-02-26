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

import { type Class, ClassifierKind, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import { translate, type IntlString } from '@hcengineering/platform'
import cardPlugin, { type Card } from '@hcengineering/card'
import { type AttributeModel } from '@hcengineering/view'

function isIntlString (value: unknown): value is IntlString {
  return typeof value === 'string' || (typeof value === 'object' && value !== null)
}

/**
 * Whether the attribute corresponds to the tags column (CardTagsColored).
 *
 * Supports:
 * - key === 'tags' (explicit tags attribute)
 * - key === '$lookup.attachedTo' with displayProps.key === 'tags'
 * - key === '' with label ending in ':Tags' (e.g. system viewlets configured with CardTagsColored)
 */
export function isTagsColumn (attr: AttributeModel): boolean {
  if (attr.key === 'tags' || (attr.key === '$lookup.attachedTo' && attr.displayProps?.key === 'tags')) {
    return true
  }

  const labelStr = typeof attr.label === 'string' ? attr.label : ''
  if (attr.key === '' && labelStr.endsWith(':Tags')) {
    return true
  }

  return false
}

/**
 * Get tag mixins for a card, mirroring CardTagsColored (lines 41-44).
 * Returns refs of mixin classes that the card has (MIXIN kind, hasMixin(card, m)).
 */
export function getCardTagMixins (card: Card, hierarchy: Hierarchy): Array<Ref<Class<Doc>>> {
  const parentClass = hierarchy.getParentClass(card._class)
  return hierarchy
    .getDescendants(parentClass)
    .filter((m) => hierarchy.getClass(m).kind === ClassifierKind.MIXIN && hierarchy.hasMixin(card, m)) as Array<
  Ref<Class<Doc>>
  >
}

/**
 * Format card tags for markdown: same tag set as CardTagsColored, labels joined by ", ".
 */
export async function formatCardTagsForMarkdown (
  card: Card,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  const mixinRefs = getCardTagMixins(card, hierarchy)
  const labels: string[] = []
  for (const ref of mixinRefs) {
    const mixinClass = hierarchy.getClass(ref)
    const label = mixinClass?.label
    if (label !== undefined) {
      const str =
        typeof label === 'string' && isIntlString(label) ? await translate(label, {}, language) : String(label)
      labels.push(str)
    }
  }
  return labels.join(', ')
}

/**
 * Value formatter for Tag and for the card tags column.
 * - Card + tags column: return formatCardTagsForMarkdown.
 * - Card otherwise: return undefined (let formatCardValue handle it).
 * - Tag-derived doc: format by title / $lookup / _class label.
 */
export async function formatTagValue (
  attr: AttributeModel,
  doc: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined
): Promise<string | undefined> {
  const isCardClass = hierarchy.isDerived(_class, cardPlugin.class.Card)
  if (isCardClass && isTagsColumn(attr)) {
    return await formatCardTagsForMarkdown(doc as Card, hierarchy, language)
  }
  if (isCardClass) {
    return undefined
  }
  if (!hierarchy.isDerived(_class, cardPlugin.class.Tag)) {
    return undefined
  }
  const rec = doc as unknown as Record<string, unknown>
  const withLookup = rec as Record<string, unknown> & { $lookup?: Record<string, unknown> }

  // Handle _class attribute (MasterTag/Type) - format as translated label
  const isClassAttr = attr.key === '_class' || attr.key === '$lookup.attachedTo._class' || attr.key.endsWith('._class')
  if (isClassAttr) {
    let classValue: unknown = rec._class
    if (attr.key.startsWith('$lookup.') && attr.key.includes('.')) {
      const lookupKey = attr.key.replace('$lookup.', '').split('.')[0]
      const rest = attr.key.replace('$lookup.', '').split('.').slice(1).join('.')
      const lookupObj = withLookup.$lookup?.[lookupKey] as Record<string, unknown> | undefined
      if (lookupObj != null) {
        classValue = rest !== '' ? lookupObj[rest] : lookupObj._class
      }
    }
    if (classValue !== undefined && classValue !== null) {
      const lookupClass = withLookup.$lookup?._class as Record<string, unknown> | undefined
      const lookupLabel = lookupClass?.label
      if (lookupLabel !== undefined) {
        if (typeof lookupLabel === 'string' && isIntlString(lookupLabel)) {
          return await translate(lookupLabel, {}, language)
        }
        return String(lookupLabel)
      }
      if (typeof classValue === 'string') {
        const cl = hierarchy.getClass(classValue as Ref<Class<Doc>>)
        const label = cl?.label
        if (label !== undefined) {
          return typeof label === 'string' && isIntlString(label) ? await translate(label, {}, language) : String(label)
        }
      }
    }
  }

  // Tag-derived doc: format by title, lookup, or _class label
  const title = rec.title
  if (typeof title === 'string' && title.trim() !== '') {
    return title.trim()
  }
  const lookupTitle = withLookup.$lookup?.title
  if (typeof lookupTitle === 'string' && lookupTitle.trim() !== '') {
    return lookupTitle.trim()
  }
  const lookupClass = withLookup.$lookup?._class as Record<string, unknown> | undefined
  const classLabel = lookupClass?.label
  if (classLabel !== undefined) {
    if (typeof classLabel === 'string' && isIntlString(classLabel)) {
      return await translate(classLabel, {}, language)
    }
    return String(classLabel)
  }
  const classRef = rec._class
  if (typeof classRef === 'string') {
    const cl = hierarchy.getClass(classRef as Ref<Class<Doc>>)
    const label = cl?.label
    if (label !== undefined) {
      const str =
        typeof label === 'string' && isIntlString(label) ? await translate(label, {}, language) : String(label)
      return str
    }
  }
  return undefined
}
