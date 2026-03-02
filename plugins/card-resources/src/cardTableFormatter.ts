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

import { type Class, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import { translate, type IntlString } from '@hcengineering/platform'
import cardPlugin, { type Card, type CardSpace } from '@hcengineering/card'
import { type AttributeModel } from '@hcengineering/view'
import { getClient } from '@hcengineering/presentation'
import { isIntlString } from '@hcengineering/converter-resources'
import { getCardIds, getCardVersion } from './cardUtils'
import { formatCardTagsForMarkdown, isTagsColumn } from './tagFormatter'

/**
 * Cache for MasterTag ID -> label mappings to reduce database calls
 */
const masterTagCache = new Map<Ref<Class<Doc>>, string>()

/**
 * Load MasterTag label from MasterTag reference with caching support
 */
async function loadMasterTagLabel (
  masterTagRef: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  // Check cache first
  const cachedLabel = masterTagCache.get(masterTagRef)
  if (cachedLabel !== undefined) {
    return cachedLabel
  }

  try {
    // MasterTag is a Class, so we can get it from hierarchy
    const masterTagClass = hierarchy.getClass(masterTagRef)
    if (masterTagClass !== undefined && masterTagClass !== null) {
      const label = masterTagClass.label
      if (label !== undefined) {
        const labelStr = await translate(label, {}, language)
        // Store in cache
        masterTagCache.set(masterTagRef, labelStr)
        return labelStr
      }
    }
  } catch (error) {
    console.warn('Failed to lookup MasterTag label for:', masterTagRef, error)
  }

  // Return original reference if lookup failed
  return String(masterTagRef)
}

/**
 * Cache for CardSpace ID -> name mappings to reduce database calls
 */
const cardSpaceCache = new Map<Ref<CardSpace>, string>()

/**
 * Load CardSpace name from space reference with caching support
 */
async function loadCardSpaceName (spaceRef: Ref<CardSpace>): Promise<string> {
  // Check cache first
  const cachedName = cardSpaceCache.get(spaceRef)
  if (cachedName !== undefined) {
    return cachedName
  }

  try {
    const client = getClient()
    const space = await client.findOne(cardPlugin.class.CardSpace, { _id: spaceRef })
    if (space !== undefined && space !== null) {
      const name = space.name ?? String(spaceRef)
      // Store in cache
      cardSpaceCache.set(spaceRef, name)
      return name
    }
  } catch (error) {
    console.warn('Failed to lookup CardSpace name for space:', spaceRef, error)
  }

  // Return original reference if lookup failed
  return String(spaceRef)
}

/**
 * Value formatter for card fields
 * Handles special cases for type (MasterTag) and space (CardSpace) fields
 */
export async function formatCardValue (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined
): Promise<string | undefined> {
  // Check if this is a Card class
  const isCardClass = hierarchy.isDerived(_class, cardPlugin.class.Card)
  if (!isCardClass) {
    return undefined
  }

  const cardDoc = card as unknown as Record<string, unknown>

  // Handle tags column - format as comma-separated tag labels (same as CardTagsColored)
  if (isTagsColumn(attr)) {
    return await formatCardTagsForMarkdown(card as Card, hierarchy, language)
  }

  if (attr.key === '') {
    const labelStr = typeof attr.label === 'string' ? attr.label : ''
    if (labelStr.startsWith('custom')) {
      return undefined
    }
    const cardObj = card as unknown as Card
    const ids = getCardIds(cardObj, hierarchy)
    const version = getCardVersion(cardObj, hierarchy)
    const parts = [ids, cardObj.title, version].filter(Boolean)
    return parts.join(' ')
  }

  // Handle _class field (MasterTag/Type) - format MasterTag ID to label
  // Key can be '_class' or '$lookup.attachedTo._class' (e.g. in relationship tables); doc is already displayDoc
  const isClassAttr = attr.key === '_class' || attr.key === '$lookup.attachedTo._class' || attr.key.endsWith('._class')
  if (isClassAttr) {
    const classValue: unknown = cardDoc._class
    if (classValue !== undefined && classValue !== null) {
      // Check if MasterTag is in lookup
      const cardWithLookup = cardDoc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupClass: unknown = cardWithLookup.$lookup?._class
      if (lookupClass !== undefined && lookupClass !== null) {
        const classObj = lookupClass as Record<string, unknown>
        const label: unknown = classObj.label
        if (typeof label === 'string') {
          if (isIntlString(label)) {
            return await translate(label as unknown as IntlString, {}, language)
          }
          return label
        }
      }
      // If not in lookup, get from hierarchy
      if (typeof classValue === 'string') {
        return await loadMasterTagLabel(classValue as Ref<Class<Doc>>, hierarchy, language)
      }
    }
    return ''
  }

  // Handle space field - format CardSpace ID to name
  if (attr.key === 'space') {
    const spaceValue: unknown = cardDoc.space
    if (spaceValue !== undefined && spaceValue !== null) {
      // Check if space is in lookup
      const cardWithLookup = cardDoc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupSpace: unknown = cardWithLookup.$lookup?.space
      if (lookupSpace !== undefined && lookupSpace !== null) {
        const spaceObj = lookupSpace as Record<string, unknown>
        const spaceName: unknown = spaceObj.name
        if (typeof spaceName === 'string') {
          return spaceName
        }
      }
      // If not in lookup, fetch it
      if (typeof spaceValue === 'string') {
        return await loadCardSpaceName(spaceValue as Ref<CardSpace>)
      }
    }
    return ''
  }

  return undefined
}
