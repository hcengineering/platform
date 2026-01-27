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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import core, {
  type AnyAttribute,
  type Class,
  type Doc,
  type Hierarchy,
  type Ref,
  concatLink,
  getDisplayTime
} from '@hcengineering/core'
import { translate, type IntlString, getMetadata } from '@hcengineering/platform'
import { locationToUrl } from '@hcengineering/ui'
import presentation from '@hcengineering/presentation'
import { type AttributeModel, type BuildModelKey } from '@hcengineering/view'
import { getObjectLinkFragment } from './utils'
import view from './plugin'

enum DateFormatOption {
  Numeric = 'numeric',
  Short = 'short'
}

/**
 * Check if a string is an IntlString (format: "plugin:resource:key")
 */
export function isIntlString (value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  const parts = value.split(':')
  return parts.length >= 3 && parts.every((part) => part.length > 0)
}

/**
 * Resolve the human-readable label for a custom attribute
 * @param attrLabel - The attribute label (may be an ID like "custom...")
 * @param docClass - The document's class (MasterTag) where the attribute is defined
 * @param hierarchy - The hierarchy instance
 * @param language - Current language
 * @returns The translated human-readable label, or the original label if not found
 */
export async function resolveCustomAttributeLabel (
  attrLabel: string,
  docClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  if (!attrLabel.startsWith('custom')) {
    return attrLabel
  }

  let customAttr = hierarchy.findAttribute(docClass, attrLabel)
  if (customAttr === undefined) {
    const allAttrs = hierarchy.getAllAttributes(docClass)
    customAttr = allAttrs.get(attrLabel)
  }

  if (customAttr?.label !== undefined) {
    return await translate(customAttr.label, {}, language)
  }

  return attrLabel
}

/**
 * Generate table headers from AttributeModel array
 * Handles custom attributes, IntlStrings, and regular labels
 * @param model - Array of AttributeModel to generate headers from
 * @param firstDocClass - The first document's class (for custom attribute lookup)
 * @param hierarchy - The hierarchy instance
 * @param language - Current language
 * @returns Array of header strings
 */
export async function generateHeaders (
  model: AttributeModel[],
  firstDocClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string[]> {
  const headers: string[] = []
  for (const attr of model) {
    let label: string
    if (typeof attr.label === 'string') {
      if (attr.label.startsWith('custom')) {
        label = await resolveCustomAttributeLabel(attr.label, firstDocClass, hierarchy, language)
      } else if (isIntlString(attr.label)) {
        label = await translate(attr.label as unknown as IntlString, {}, language)
      } else {
        label = attr.label
      }
    } else {
      label = await translate(attr.label, {}, language)
    }
    headers.push(label)
  }
  return headers
}

/**
 * Convert AttributeModel array back to config format (Array<string | BuildModelKey>)
 * Preserves custom attributes by using label as key when key is empty
 * @param model - Array of AttributeModel to convert
 * @returns Config array that can be used to rebuild the table
 */
export function modelToConfig (model: AttributeModel[]): Array<string | BuildModelKey> {
  return model.map((m) => {
    if (m.key === '' && typeof m.label === 'string' && m.label.startsWith('custom')) {
      return {
        key: m.label, // Use label (custom attribute name) as key
        label: m.label,
        displayProps: m.displayProps,
        props: m.props,
        sortingKey: m.sortingKey
      }
    }
    if (m.key !== '') {
      return m.key
    }
    if (m.castRequest !== undefined) {
      return {
        key: m.key,
        label: m.label,
        displayProps: m.displayProps,
        props: m.props,
        sortingKey: m.sortingKey
      }
    }
    return m.key
  })
}

/**
 * Format an array of values, handling reference lookups if needed
 * @param value - The array value
 * @param attrType - The attribute type
 * @param attribute - The attribute definition (for getting the name)
 * @param attrKey - The attribute key (fallback if attribute.name is not available)
 * @param card - The document
 * @param language - Current language
 * @returns Formatted string with comma-separated values
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
 * @param obj - The object to extract from
 * @param language - Current language
 * @returns The title/name string, or empty string if not found
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
 * Escape markdown link text (brackets, pipes, backslashes, newlines)
 */
export function escapeMarkdownLinkText (text: string): string {
  // Escape backslashes first, then brackets and pipes, and normalize newlines to spaces
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

/**
 * Escape markdown link URL (backslashes and closing parentheses)
 */
export function escapeMarkdownLinkUrl (url: string): string {
  // Escape backslashes and closing parentheses used to terminate the URL
  return url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)')
}

/**
 * Create a markdown link for a document
 */
export async function createMarkdownLink (hierarchy: Hierarchy, card: Doc, value: string): Promise<string> {
  try {
    const loc = await getObjectLinkFragment(hierarchy, card, {}, view.component.EditDoc)
    const relativeUrl = locationToUrl(loc)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    const fullUrl = concatLink(frontUrl, relativeUrl)
    const escapedText = escapeMarkdownLinkText(value)
    const escapedUrl = escapeMarkdownLinkUrl(fullUrl)
    return `[${escapedText}](${escapedUrl})`
  } catch {
    // If link generation fails, fall back to plain text
    return escapeMarkdownLinkText(value)
  }
}
