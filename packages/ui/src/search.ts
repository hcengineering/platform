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
import { get } from 'svelte/store'

import type { IntlString } from '@hcengineering/platform'
import { translate } from '@hcengineering/platform'
import { themeStore } from '@hcengineering/theme'

import type { DropdownIntlItem } from './types'

/**
 * LocalizedSearch class for handling search functionality with internationalization support
 */
export class LocalizedSearch {
  private readonly translatedLabels = new Map<IntlString, string>()

  /**
   * Filter items based on search term with lazy translation loading
   */
  async filter (
    items: Array<[DropdownIntlItem, DropdownIntlItem[]]>,
    searchTerm: string
  ): Promise<Array<[DropdownIntlItem, DropdownIntlItem[]]>> {
    if (searchTerm.trim() === '') {
      return items
    }

    const term = searchTerm.toLowerCase()
    const filtered: Array<[DropdownIntlItem, DropdownIntlItem[]]> = []

    for (const [parent, children] of items) {
      const parentLabel = parent.label ?? ''
      const parentTranslated = await this.getTranslatedLabel(parentLabel)
      const parentMatches = parentTranslated.includes(term)

      const matchingChildren: DropdownIntlItem[] = []
      for (const child of children) {
        const childLabel = child.label ?? ''
        const childTranslated = await this.getTranslatedLabel(childLabel)
        if (childTranslated.includes(term)) {
          matchingChildren.push(child)
        }
      }

      if (parentMatches || matchingChildren.length > 0) {
        filtered.push([parent, parentMatches ? children : matchingChildren])
      }
    }

    return filtered
  }

  /**
   * Get translated label, using cache or translating and caching if not found
   */
  private async getTranslatedLabel (label: IntlString): Promise<string> {
    if (this.translatedLabels.has(label)) {
      return this.translatedLabels.get(label) ?? label.toLowerCase()
    }

    try {
      const currentLanguage = get(themeStore).language
      const translated = await translate(label, {}, currentLanguage)
      const lowerCased = translated.toLowerCase()
      this.translatedLabels.set(label, lowerCased)
      return lowerCased
    } catch {
      const fallback = label.toLowerCase()
      this.translatedLabels.set(label, fallback)
      return fallback
    }
  }
}
