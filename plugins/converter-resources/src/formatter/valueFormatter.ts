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

import core, {
  type AnyAttribute,
  type Class,
  type Doc,
  type Hierarchy,
  type Ref,
  type PersonId,
  getDisplayTime,
  getObjectValue
} from '@hcengineering/core'
import { translate, type IntlString, getResource } from '@hcengineering/platform'
import type { AttributeModel } from '@hcengineering/view'
import converter from '@hcengineering/converter'
import { getFormattersForClass } from './registry'
import {
  formatArrayValue,
  extractObjectTitleOrName,
  isIntlString,
  DocumentAttributeKey,
  DateFormatOption
} from './utils'
import { loadPersonName } from '../data/personLoader'
import type { ValueFormatter } from '../types'

/** Resolved context for formatting: which object we display and its value */
export interface DisplayContext {
  value: any
  displayDoc: Doc
  displayClass: Ref<Class<Doc>>
  attribute: AnyAttribute | undefined
  lookupKey: string
}

function getAttributeKey (attr: AttributeModel): string {
  if (attr.castRequest != null && attr.key.startsWith(`${attr.castRequest}.`)) {
    return attr.key.substring(attr.castRequest.length + 1)
  }
  if (attr.key.startsWith('$lookup.')) {
    return attr.key.replace('$lookup.', '').split('.')[0] ?? attr.key
  }
  return attr.key
}

function getLookupData (card: Doc, ...keys: string[]): any {
  const cardWithLookup = card as any
  const lookupData = cardWithLookup.$lookup
  if (lookupData === undefined || lookupData === null) {
    return undefined
  }

  const candidates = Array.from(
    new Set(
      keys.flatMap((key) => {
        if (key.length === 0) {
          return []
        }
        const normalized = key.startsWith('$lookup.') ? key.replace('$lookup.', '') : key
        const lastSegment = normalized.split('.').pop()
        return [key, normalized, lastSegment].filter((v): v is string => v !== undefined && v.length > 0)
      })
    )
  )

  for (const candidate of candidates) {
    if (lookupData[candidate] !== undefined) {
      return lookupData[candidate]
    }
    const nestedLookupData = getObjectValue(candidate, lookupData)
    if (nestedLookupData !== undefined) {
      return nestedLookupData
    }
  }

  return undefined
}

function formatDateValue (
  value: number | string | Date,
  isDateOnly: boolean,
  language: string | undefined
): string | undefined {
  if (!isDateOnly && typeof value === 'number') {
    return getDisplayTime(value)
  }

  const parsedDate = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined
  }

  const options: Intl.DateTimeFormatOptions = {
    year: DateFormatOption.Numeric,
    month: DateFormatOption.Short,
    day: DateFormatOption.Numeric
  }

  return parsedDate.toLocaleDateString(language ?? 'default', options)
}

/**
 * Resolve which object should be displayed (card, ref, or custom attribute) and its value.
 * Used so formatters and fallbacks can format all types consistently.
 */
function resolveDisplayContext (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  isFirstColumn: boolean
): DisplayContext | null {
  const docClass = card._class

  // Custom attribute: value lives on card under label key
  if (attr.key === '' && !isFirstColumn) {
    const labelStr = typeof attr.label === 'string' ? attr.label : ''
    const isCustomAttribute = labelStr.startsWith('custom')
    if (isCustomAttribute) {
      const customValue = (card as any)[labelStr]
      let customAttr = hierarchy.findAttribute(docClass, labelStr)
      if (customAttr === undefined) {
        const allAttrs = hierarchy.getAllAttributes(docClass)
        customAttr = allAttrs.get(labelStr)
      }
      return {
        value: customValue,
        displayDoc: card,
        displayClass: docClass,
        attribute: customAttr,
        lookupKey: customAttr?.name ?? labelStr
      }
    }

    // Tags column can be configured with empty key and Tags label (CardTagsColored).
    // In that case we still want to format it via class-level MarkdownValueFormatter.
    if (labelStr.endsWith(':Tags')) {
      return {
        value: undefined,
        displayDoc: card,
        displayClass: docClass,
        attribute: undefined,
        lookupKey: 'tags'
      }
    }

    return null
  }

  let value: any
  let displayDoc: Doc = card
  let displayClass: Ref<Class<Doc>> = _class

  if (attr.castRequest != null) {
    const castDoc = hierarchy.as(card, attr.castRequest)
    value = getObjectValue(attr.key.substring(attr.castRequest.length + 1), castDoc)
    displayDoc = castDoc
    displayClass = attr.castRequest
  } else if (attr.key.startsWith('$lookup.')) {
    const lookupKey = attr.key.replace('$lookup.', '')
    const lookupParts = lookupKey.split('.')
    const cardWithLookup = card as any
    const lookupObj = cardWithLookup.$lookup?.[lookupParts[0]]
    if (lookupObj !== undefined && lookupObj !== null) {
      if (lookupParts.length > 1) {
        value = getObjectValue(lookupParts.slice(1).join('.'), lookupObj)
      } else {
        value = lookupObj
      }
      if (typeof value === 'object' && value !== null && '_class' in value) {
        displayDoc = value as Doc
        displayClass = displayDoc._class
      }
    } else {
      value = undefined
    }
  } else {
    value = getObjectValue(attr.key, card)
  }

  const attributeKey = getAttributeKey(attr)
  const attribute = attr.attribute ?? hierarchy.findAttribute(displayClass, attributeKey)
  const lookupKey = attribute?.name ?? attributeKey
  return { value, displayDoc, displayClass, attribute, lookupKey }
}

/**
 * Format a custom attribute value for markdown display
 * Handles various types: string, number, boolean, arrays, references
 */
export async function formatCustomAttributeValue (
  value: any,
  attribute: AnyAttribute | undefined,
  card: Doc,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  if (value === null || value === undefined) {
    return ''
  }

  const attrType = attribute?.type

  if (
    typeof value === 'number' &&
    (attrType?._class === core.class.TypeTimestamp || attrType?._class === core.class.TypeDate)
  ) {
    const formattedDate = formatDateValue(value, attrType?._class === core.class.TypeDate, language)
    if (formattedDate !== undefined) {
      return formattedDate
    }
  }

  if (value instanceof Date) {
    return formatDateValue(value, true, language) ?? ''
  }

  if (
    typeof value === 'string' &&
    (attrType?._class === core.class.TypeTimestamp || attrType?._class === core.class.TypeDate)
  ) {
    const formattedDate = formatDateValue(value, attrType?._class === core.class.TypeDate, language)
    if (formattedDate !== undefined) {
      return formattedDate
    }
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'string') {
    if (isIntlString(value)) {
      return await translate(value as unknown as IntlString, {}, language)
    }

    const isRef = attrType?._class === core.class.RefTo
    if (isRef && attribute !== undefined) {
      const cardWithLookup = card as any
      const lookupData = cardWithLookup.$lookup?.[attribute.name]
      if (lookupData !== undefined && lookupData !== null) {
        if (typeof lookupData === 'object' && 'title' in lookupData) {
          const title = lookupData.title ?? ''
          if (typeof title === 'string' && isIntlString(title)) {
            return await translate(title as unknown as IntlString, {}, language)
          }
          return String(title)
        }
      }
    }

    return value
  }

  if (Array.isArray(value)) {
    return await formatArrayValue(value, attrType, attribute, attribute?.name ?? '', card, language)
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, any>
    const titleOrName = await extractObjectTitleOrName(obj, language)
    return titleOrName !== '' ? titleOrName : String(value)
  }

  return String(value)
}

/**
 * Fallback formatting when no formatter returns a value. Uses current formatting logic.
 */
async function formatValueFallback (
  value: any,
  attr: AttributeModel,
  ctx: DisplayContext,
  card: Doc,
  hierarchy: Hierarchy,
  language: string | undefined,
  userCache?: Map<PersonId, string>
): Promise<string> {
  if (value === null || value === undefined) {
    return ''
  }

  const isCustomAttribute = attr.key === '' && typeof attr.label === 'string' && attr.label.startsWith('custom')
  if (isCustomAttribute) {
    return await formatCustomAttributeValue(value, ctx.attribute, card, hierarchy, language)
  }

  const attribute = ctx.attribute
  const attrType = attribute?.type

  if (
    typeof value === 'number' &&
    (attrType?._class === core.class.TypeTimestamp || attrType?._class === core.class.TypeDate)
  ) {
    const formattedDate = formatDateValue(value, attrType?._class === core.class.TypeDate, language)
    if (formattedDate !== undefined) {
      return formattedDate
    }
  }

  if (value instanceof Date) {
    return formatDateValue(value, true, language) ?? ''
  }

  if (
    typeof value === 'string' &&
    (attrType?._class === core.class.TypeTimestamp || attrType?._class === core.class.TypeDate)
  ) {
    const formattedDate = formatDateValue(value, attrType?._class === core.class.TypeDate, language)
    if (formattedDate !== undefined) {
      return formattedDate
    }
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'string') {
    const isRef = attrType?._class === core.class.RefTo
    if (isRef) {
      const lookupData = getLookupData(card, ctx.lookupKey, attribute?.name ?? '', attr.key)
      if (lookupData !== undefined && lookupData !== null) {
        const resolvedObj = lookupData
        if (typeof resolvedObj === 'object' && resolvedObj !== null && 'title' in resolvedObj) {
          const title = resolvedObj[DocumentAttributeKey.Title] ?? ''
          if (typeof title === 'string' && isIntlString(title)) {
            return await translate(title as unknown as IntlString, {}, language)
          }
          return String(title)
        }
      }
    }

    if (isIntlString(value)) {
      return await translate(value as unknown as IntlString, {}, language)
    }
    if (attr.key === DocumentAttributeKey.CreatedBy || attr.key === DocumentAttributeKey.ModifiedBy) {
      return await loadPersonName(value as PersonId, hierarchy, userCache)
    }
    return value
  }

  if (Array.isArray(value)) {
    return await formatArrayValue(value, attrType, attribute, ctx.lookupKey, card, language)
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, any>
    const titleOrName = await extractObjectTitleOrName(obj, language)
    return titleOrName !== '' ? titleOrName : String(value)
  }

  return String(value)
}

/**
 * Format a single attribute value for display (used by table builders).
 */
export async function formatValue (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined,
  isFirstColumn: boolean = false,
  userCache?: Map<PersonId, string>,
  customFormatter?: ValueFormatter
): Promise<string> {
  const ctx = resolveDisplayContext(attr, card, hierarchy, _class, isFirstColumn)
  if (ctx === null) {
    return ''
  }

  const { value, displayDoc, displayClass } = ctx

  if (customFormatter !== undefined) {
    const formattedValue = await customFormatter(attr, displayDoc, hierarchy, displayClass, language)
    if (formattedValue !== undefined) {
      return formattedValue
    }
  }

  const formatterMixin = hierarchy.classHierarchyMixin(displayClass, converter.mixin.MarkdownValueFormatter)
  if (formatterMixin?.formatter !== undefined) {
    const formatter = await getResource(formatterMixin.formatter)
    const result = await formatter(attr, displayDoc, hierarchy, displayClass, language)
    if (result !== undefined) {
      return result
    }
  }

  const formatters = getFormattersForClass(hierarchy, displayClass)
  for (const formatter of formatters) {
    const formattedValue = await formatter(attr, displayDoc, hierarchy, displayClass, language)
    if (formattedValue !== undefined) {
      return formattedValue
    }
  }

  return await formatValueFallback(value, attr, ctx, card, hierarchy, language, userCache)
}
