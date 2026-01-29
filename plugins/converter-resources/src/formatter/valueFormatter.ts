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

  if (typeof value === 'number' && attrType?._class === core.class.TypeTimestamp) {
    return getDisplayTime(value)
  }

  if (value instanceof Date) {
    const options: Intl.DateTimeFormatOptions = {
      year: DateFormatOption.Numeric,
      month: DateFormatOption.Short,
      day: DateFormatOption.Numeric
    }
    return value.toLocaleDateString(language ?? 'default', options)
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
 * Format a single attribute value for display (used by table builders)
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
  // Try custom formatter first (from actionProps)
  if (customFormatter !== undefined) {
    const formattedValue = await customFormatter(attr, card, hierarchy, _class, language)
    if (formattedValue !== undefined) {
      return formattedValue
    }
  }

  // Try mixin-based formatter (MarkdownValueFormatter on the class)
  const formatterMixin = hierarchy.classHierarchyMixin(_class, converter.mixin.MarkdownValueFormatter)
  if (formatterMixin?.formatter !== undefined) {
    const formatter = await getResource(formatterMixin.formatter)
    const result = await formatter(attr, card, hierarchy, _class, language)
    if (result !== undefined) {
      return result
    }
  }

  // Fall back to registered value formatters
  const formatters = getFormattersForClass(hierarchy, _class)
  for (const formatter of formatters) {
    const formattedValue = await formatter(attr, card, hierarchy, _class, language)
    if (formattedValue !== undefined) {
      return formattedValue
    }
  }

  let value: any
  if (attr.castRequest != null) {
    value = getObjectValue(attr.key.substring(attr.castRequest.length + 1), hierarchy.as(card, attr.castRequest))
  } else {
    if (attr.key.startsWith('$lookup.')) {
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
      } else {
        value = undefined
      }
    } else {
      value = getObjectValue(attr.key, card)
    }
  }

  if (attr.key === '' && !isFirstColumn) {
    const labelStr = typeof attr.label === 'string' ? attr.label : ''
    const isCustomAttribute = labelStr.startsWith('custom')

    if (isCustomAttribute) {
      const customValue = (card as any)[labelStr]
      if (customValue === null || customValue === undefined) {
        return ''
      }

      const docClass = card._class
      let customAttr = hierarchy.findAttribute(docClass, labelStr)

      if (customAttr === undefined) {
        const allAttrs = hierarchy.getAllAttributes(docClass)
        customAttr = allAttrs.get(labelStr)
      }

      return await formatCustomAttributeValue(customValue, customAttr, card, hierarchy, language)
    }

    return ''
  }

  if (value === null || value === undefined) {
    return ''
  }

  const attribute = attr.attribute ?? hierarchy.findAttribute(_class, attr.key)
  const attrType = attribute?.type

  if (typeof value === 'number' && attrType?._class === core.class.TypeTimestamp) {
    return getDisplayTime(value)
  }

  if (value instanceof Date) {
    const options: Intl.DateTimeFormatOptions = {
      year: DateFormatOption.Numeric,
      month: DateFormatOption.Short,
      day: DateFormatOption.Numeric
    }
    return value.toLocaleDateString(language ?? 'default', options)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'string') {
    const isRef = attrType?._class === core.class.RefTo
    if (isRef) {
      const cardWithLookup = card as any
      const lookupData = cardWithLookup.$lookup?.[attr.key]
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
    return await formatArrayValue(value, attrType, attribute, attr.key, card, language)
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, any>
    const titleOrName = await extractObjectTitleOrName(obj, language)
    return titleOrName !== '' ? titleOrName : String(value)
  }

  return String(value)
}
