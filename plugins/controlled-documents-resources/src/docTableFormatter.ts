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

import core, { type Class, type Doc, type Hierarchy, type Ref, type Space, getObjectValue } from '@hcengineering/core'
import { translate, type IntlString } from '@hcengineering/platform'
import documentsPlugin from '@hcengineering/controlled-documents'
import { type AttributeModel } from '@hcengineering/view'
import { getClient } from '@hcengineering/presentation'
import { isIntlString } from '@hcengineering/converter-resources'

/**
 * Format version number from major and minor
 */
function formatVersion (major: number | undefined, minor: number | undefined): string {
  if (major === undefined || minor === undefined) {
    return ''
  }
  return `v${major}.${minor}`
}

/**
 * Get state value from document (handles both state and controlledState)
 */
function getDocumentState (doc: Record<string, unknown>): string | undefined {
  const controlledState: unknown = doc.controlledState
  if (controlledState !== undefined && controlledState !== null) {
    return String(controlledState)
  }
  const state: unknown = doc.state
  return state !== undefined && state !== null ? String(state) : undefined
}

/**
 * Cache for space ID -> name mappings to reduce database calls
 */
const spaceCache = new Map<Ref<Space>, string>()

/**
 * Load space name from space reference with caching support
 */
async function loadSpaceName (spaceRef: Ref<Space>): Promise<string> {
  // Check cache first
  const cachedName = spaceCache.get(spaceRef)
  if (cachedName !== undefined) {
    return cachedName
  }

  try {
    const client = getClient()
    const space = await client.findOne(core.class.Space, { _id: spaceRef })
    if (space !== undefined && space !== null) {
      const name = space.name ?? String(spaceRef)
      // Store in cache
      spaceCache.set(spaceRef, name)
      return name
    }
  } catch (error) {
    console.warn('Failed to lookup space name for space:', spaceRef, error)
  }

  // Return original reference if lookup failed
  return String(spaceRef)
}

/**
 * Value formatter for controlled document fields
 * Handles special cases where empty keys use custom presenters
 */
export async function formatControlledDocumentValue (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined
): Promise<string | undefined> {
  // Check if this is a document class
  const isDocumentClass = hierarchy.isDerived(_class, documentsPlugin.class.Document)
  if (!isDocumentClass) {
    return undefined
  }

  const doc = card as unknown as Record<string, unknown>

  // Handle labels field - check props.key or sortingKey when key is empty
  if (attr.key === '' && (attr.props?.key === 'labels' || attr.sortingKey === 'labels')) {
    // TODO: request labels and display them
    return ''
  }

  // Handle empty key with specific presenters (for ID, Title, Status, Version)
  if (attr.key === '') {
    // Translate label to determine which field to extract
    let labelText = ''
    if (typeof attr.label === 'string') {
      labelText = isIntlString(attr.label)
        ? await translate(attr.label as unknown as IntlString, {}, language)
        : attr.label
    } else {
      labelText = await translate(attr.label, {}, language)
    }

    // Determine field based on label (case-insensitive)
    const labelLower = labelText.toLowerCase()
    if (labelLower.includes('id') || labelLower === 'id') {
      // For ID/DocumentPresenter: extract code
      const codeValue: unknown = doc.code
      if (typeof codeValue === 'string') {
        return codeValue
      }
    } else if (labelLower.includes('title')) {
      // For TitlePresenter: extract title
      const titleValue: unknown = doc.title
      if (typeof titleValue === 'string') {
        if (isIntlString(titleValue)) {
          return await translate(titleValue as unknown as IntlString, {}, language)
        }
        return titleValue
      }
    } else if (labelLower.includes('status') || labelLower.includes('state')) {
      // For StatePresenter: extract state or controlledState
      const state = getDocumentState(doc)
      if (state !== undefined && state !== null) {
        // State values are typically IntlStrings, try to translate
        if (typeof state === 'string' && isIntlString(state)) {
          return await translate(state as unknown as IntlString, {}, language)
        }
        return state
      }
    } else if (labelLower.includes('version')) {
      // For DocumentVersionPresenter: format version
      const majorValue: unknown = doc.major
      const minorValue: unknown = doc.minor
      if (typeof majorValue === 'number' && typeof minorValue === 'number') {
        return formatVersion(majorValue, minorValue)
      }
    }
    // Fallback: try all fields in order if label doesn't match
    const codeValue: unknown = doc.code
    if (typeof codeValue === 'string') {
      return codeValue
    }
    const titleValue: unknown = doc.title
    if (typeof titleValue === 'string') {
      if (isIntlString(titleValue)) {
        return await translate(titleValue as unknown as IntlString, {}, language)
      }
      return titleValue
    }
    const state = getDocumentState(doc)
    if (state !== undefined && state !== null) {
      if (typeof state === 'string' && isIntlString(state)) {
        return await translate(state as unknown as IntlString, {}, language)
      }
      return state
    }
    const majorValue: unknown = doc.major
    const minorValue: unknown = doc.minor
    if (typeof majorValue === 'number' && typeof minorValue === 'number') {
      return formatVersion(majorValue, minorValue)
    }
  }

  // Handle labels field - return empty string for collection size (labels are displayed via presenter, not as raw data)
  if (attr.key === 'labels') {
    return ''
  }

  // Handle space field - format space ID to space name
  if (attr.key === 'space') {
    const spaceValue: unknown = doc.space
    if (spaceValue !== undefined && spaceValue !== null) {
      // Check if space is in lookup
      const docWithLookup = doc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupSpace: unknown = docWithLookup.$lookup?.space
      if (lookupSpace !== undefined && lookupSpace !== null) {
        const spaceObj = lookupSpace as Record<string, unknown>
        const spaceName: unknown = spaceObj.name
        if (typeof spaceName === 'string') {
          return spaceName
        }
      }
      // If not in lookup, fetch it
      if (typeof spaceValue === 'string') {
        return await loadSpaceName(spaceValue as Ref<Space>)
      }
    }
    return ''
  }

  // Handle lookup keys for template
  if (attr.key.startsWith('$lookup.')) {
    const lookupKey = attr.key.replace('$lookup.', '')
    const lookupParts = lookupKey.split('.')
    const docWithLookup = doc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
    const lookupObj: unknown = docWithLookup.$lookup?.[lookupParts[0]]

    if (lookupObj !== undefined && lookupObj !== null) {
      // Translate label to determine which field to extract for template
      let labelText = ''
      if (typeof attr.label === 'string') {
        labelText = isIntlString(attr.label)
          ? await translate(attr.label as unknown as IntlString, {}, language)
          : attr.label
      } else {
        labelText = await translate(attr.label, {}, language)
      }

      const labelLower = labelText.toLowerCase()

      // For nested lookup (e.g., $lookup.category.title)
      if (lookupParts.length > 1) {
        const nestedValue: unknown = getObjectValue(lookupParts.slice(1).join('.'), lookupObj as unknown as Doc)
        if (nestedValue !== undefined && nestedValue !== null) {
          if (typeof nestedValue === 'string') {
            if (isIntlString(nestedValue)) {
              return await translate(nestedValue as unknown as IntlString, {}, language)
            }
            return nestedValue
          }
          return String(nestedValue)
        }
      }
      // For template: check label to determine if it's code or version
      if (lookupParts.length === 1) {
        const lookupObjRecord = lookupObj as Record<string, unknown>
        if (labelLower.includes('version')) {
          // For TemplateVersion: format version
          const majorValue: unknown = lookupObjRecord.major
          const minorValue: unknown = lookupObjRecord.minor
          if (typeof majorValue === 'number' && typeof minorValue === 'number') {
            return formatVersion(majorValue, minorValue)
          }
        } else {
          // For Template/DocumentPresenter: extract code
          const codeValue: unknown = lookupObjRecord.code
          if (typeof codeValue === 'string') {
            return codeValue
          }
        }
      }
    }
  }

  return undefined
}
