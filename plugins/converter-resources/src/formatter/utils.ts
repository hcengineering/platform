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

import contact from '@hcengineering/contact'
import core, {
  getDisplayTime,
  type AnyAttribute,
  type Class,
  type Doc,
  type Hierarchy,
  type PersonId,
  type Ref
} from '@hcengineering/core'
import { translate, type IntlString } from '@hcengineering/platform'
import { markupToJSON } from '@hcengineering/text'
import { markupToMarkdown } from '@hcengineering/text-markdown'
import { loadPersonNameByRef } from '../data/personLoader'

export enum DocumentAttributeKey {
  CreatedBy = 'createdBy',
  CreatedOn = 'createdOn',
  ModifiedBy = 'modifiedBy',
  ModifiedOn = 'modifiedOn',
  Title = 'title',
  Name = 'name'
}

export enum DateFormatOption {
  Numeric = 'numeric',
  Short = 'short'
}

export function formatDateValue (
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
 * Format a single value of any supported type.
 */
export async function formatSingleValue (
  value: any,
  attrType: any,
  hierarchy: Hierarchy,
  language: string | undefined,
  userCache?: Map<PersonId, string>,
  elementFormatter?: (doc: Doc, title: string) => Promise<string>
): Promise<string> {
  if (value === null || value === undefined) {
    return ''
  }

  if (
    typeof value === 'number' &&
    (attrType?._class === core.class.TypeTimestamp || attrType?._class === core.class.TypeDate)
  ) {
    return formatDateValue(value, attrType?._class === core.class.TypeDate, language) ?? ''
  }

  if (value instanceof Date) {
    return formatDateValue(value, true, language) ?? ''
  }

  if (
    typeof value === 'string' &&
    (attrType?._class === core.class.TypeTimestamp || attrType?._class === core.class.TypeDate)
  ) {
    return formatDateValue(value, attrType?._class === core.class.TypeDate, language) ?? ''
  }

  const isMarkup =
    attrType?._class === core.class.TypeMarkup ||
    attrType?._class === core.class.TypeCollaborativeDoc ||
    (typeof value === 'object' && value !== null && (value.type === 'doc' || value._class === 'core:class:Markup'))

  if (isMarkup) {
    try {
      return markupToMarkdown(markupToJSON(value))
    } catch (e) {
      // fallback
    }
  }

  if (typeof value === 'object' && value !== null) {
    if ('title' in value || 'name' in value) {
      const title = value.title ?? value.name ?? ''
      const text =
        typeof title === 'string' && isIntlString(title)
          ? await translate(title as unknown as IntlString, {}, language)
          : String(title)
      if (elementFormatter !== undefined) {
        return await elementFormatter(value as Doc, text)
      }
      return text
    }
  }

  if (typeof value === 'boolean') {
    return value ? '✅ Yes' : '❌ No'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    if (isIntlString(value)) {
      return await translate(value as unknown as IntlString, {}, language)
    }

    const isRef = attrType?._class === core.class.RefTo
    if (isRef) {
      if (attrType.to !== undefined && hierarchy.isDerived(attrType.to, contact.mixin.Employee)) {
        const name = await loadPersonNameByRef(value as any, hierarchy, userCache as any)
        return name
      }
    }
  }

  return String(value)
}

export function isIntlString (value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  if (value.includes('://')) {
    return false
  }
  if (value.startsWith('embedded:embedded:')) {
    return value.length > 'embedded:embedded:'.length
  }
  const m = /^([a-z][a-z0-9-]*):([a-zA-Z][a-zA-Z0-9_]*):(.+)$/.exec(value)
  if (m === null) {
    return false
  }
  const plugin = m[1]
  const rest = m[3]
  if (rest.length === 0) {
    return false
  }
  if (/^https?$/i.test(plugin)) {
    return false
  }
  return true
}

export async function formatArrayValue (
  value: any[],
  attrType: any,
  attribute: AnyAttribute | undefined,
  attrKey: string,
  card: Doc,
  hierarchy: Hierarchy,
  language: string | undefined,
  userCache?: Map<PersonId, string>,
  elementFormatter?: (doc: Doc, title: string) => Promise<string>
): Promise<string> {
  const isRef =
    attrType?._class === core.class.RefTo ||
    (attrType?._class === core.class.ArrOf &&
      (attrType as { of?: { _class?: Ref<Class<Doc>> } })?.of?._class === core.class.RefTo)

  const cardWithLookup = card as any
  const lookupKey = attribute?.name ?? attrKey
  const lookupData = cardWithLookup.$lookup?.[lookupKey]

  const resolveItem = async (v: any, index: number): Promise<string> => {
    // If we have lookup data and v is an ID, find the object
    let item = v
    if (isRef && lookupData !== undefined && typeof v === 'string') {
      const resolvedArray = Array.isArray(lookupData) ? lookupData : [lookupData]
      const found = resolvedArray.find((obj) => obj._id === v)
      if (found !== undefined) {
        item = found
      } else if (resolvedArray[index] !== undefined) {
        // Fallback to index-based lookup if no _id matches (useful for tests or simplified data)
        item = resolvedArray[index]
      }
    }

    const itemType = attrType?._class === core.class.ArrOf ? attrType.of : attrType
    return await formatSingleValue(item, itemType, hierarchy, language, userCache, elementFormatter)
  }

  const formattedValues = await Promise.all(value.map(async (v, i) => await resolveItem(v, i)))
  return formattedValues.filter((v) => v !== '').join(', ')
}

/**
 * Extract title or name from an object, translating if needed
 */
export async function extractObjectTitleOrName (
  obj: Record<string, any>,
  language: string | undefined
): Promise<string> {
  if (obj._class === core.class.TypeMarkup || obj._class === core.class.TypeCollaborativeDoc) {
    return '' // Should be handled by markupToMarkdown
  }
  if ('title' in obj) {
    const title = String(obj.title ?? '')
    if (isIntlString(title)) {
      return await translate(title as unknown as IntlString, {}, language)
    }
    return title
  }
  if ('name' in obj) {
    const name = String(obj.name ?? '')
    if (isIntlString(name)) {
      return await translate(name as unknown as IntlString, {}, language)
    }
    return name
  }
  return ''
}
