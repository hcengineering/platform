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

import core, { type AnyAttribute, type Class, type Doc, type Ref } from '@hcengineering/core'
import { translate, type IntlString } from '@hcengineering/platform'

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

/**
 * Check if a value is an IntlString (format: "plugin:resource:key").
 * Type guard: narrows unknown to string when true.
 */
export function isIntlString (value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  const parts = value.split(':')
  return parts.length >= 3 && parts.every((part) => part.length > 0)
}

/**
 * Format an array of values, handling reference lookups if needed
 */
export async function formatArrayValue (
  value: any[],
  attrType: any,
  attribute: AnyAttribute | undefined,
  attrKey: string,
  card: Doc,
  language: string | undefined
): Promise<string> {
  const isRefArray =
    attrType?._class === core.class.ArrOf &&
    (attrType as { of?: { _class?: Ref<Class<Doc>> } })?.of?._class === core.class.RefTo

  if (isRefArray && (attribute !== undefined || attrKey !== '')) {
    const cardWithLookup = card as any
    const lookupKey = attribute?.name ?? attrKey
    const lookupData = cardWithLookup.$lookup?.[lookupKey]

    if (lookupData !== undefined && lookupData !== null) {
      const resolvedArray = Array.isArray(lookupData) ? lookupData : [lookupData]
      const translatedValues = await Promise.all(
        resolvedArray.map(async (v) => {
          if (typeof v === 'object' && v !== null && 'title' in v) {
            const title = v.title ?? ''
            if (typeof title === 'string' && isIntlString(title)) {
              return await translate(title as unknown as IntlString, {}, language)
            }
            return String(title)
          }
          return typeof v === 'string' ? v : String(v)
        })
      )
      return translatedValues.join(', ')
    }
  }

  const translatedValues = await Promise.all(
    value.map(async (v) => {
      if (typeof v === 'object' && v !== null && 'title' in v) {
        const title = v.title ?? ''
        if (typeof title === 'string' && isIntlString(title)) {
          return await translate(title as unknown as IntlString, {}, language)
        }
        return String(title)
      }
      if (typeof v === 'string' && isIntlString(v)) {
        return await translate(v as unknown as IntlString, {}, language)
      }
      return typeof v === 'string' ? v : String(v)
    })
  )
  return translatedValues.join(', ')
}

/**
 * Extract title or name from an object, translating if needed
 */
export async function extractObjectTitleOrName (
  obj: Record<string, any>,
  language: string | undefined
): Promise<string> {
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
