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

import { type IntlString, translate } from '@hcengineering/platform'
import { type ThemeOptions } from '@hcengineering/theme'
import { type PlaceholderOptions, Placeholder } from '@tiptap/extension-placeholder'
import { type Readable, get } from 'svelte/store'

export interface I18nPlaceholderOptions extends PlaceholderOptions {
  placeholderIntl: IntlString
  placeholderIntlParams?: Record<string, any>
  themeStore: Readable<ThemeOptions>
}

export interface I18nPlaceholderStorage {
  placeholder: string
  unsubscribe?: () => void
}

export const I18nPlaceholderExtension = Placeholder.extend<I18nPlaceholderOptions, I18nPlaceholderStorage>({
  name: 'i18n-placeholder',

  addOptions () {
    return {
      ...this.parent?.(),
      placeholderIntl: '' as IntlString,
      placeholderIntlParams: {},
      themeStore: undefined as any
    }
  },

  addStorage () {
    return {
      placeholder: '',
      unsubscribe: undefined
    }
  },

  onCreate () {
    const options = this.options
    const storage = this.storage

    const placeholderIntl = options.placeholderIntl
    const placeholderIntlParams = options.placeholderIntlParams

    // Set the placeholder function before any rendering happens
    this.options.placeholder = (): string => storage.placeholder

    // Get initial translation
    const theme = get(options.themeStore)
    if (placeholderIntl !== undefined) {
      void translate(placeholderIntl, placeholderIntlParams, theme?.language ?? 'en').then((translated) => {
        storage.placeholder = translated
        // Force initial update
        if (this.editor !== undefined && this.editor !== null) {
          this.editor.view.dispatch(this.editor.state.tr)
        }
      })
    }

    // Subscribe to theme store changes
    if (options.themeStore !== undefined && options.themeStore !== null) {
      storage.unsubscribe = options.themeStore.subscribe((theme) => {
        if (placeholderIntl !== undefined) {
          void translate(placeholderIntl, placeholderIntlParams, theme.language).then((translated) => {
            storage.placeholder = translated
            // Force editor update to show new translation
            if (this.editor !== undefined && this.editor !== null) {
              this.editor.view.dispatch(this.editor.state.tr)
            }
          })
        }
      })
    }
  },

  onDestroy () {
    this.storage.unsubscribe?.()
  }
})
