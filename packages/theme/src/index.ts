//
// Copyright © 2020 Anticrm Platform Contributors.
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

import '@hcengineering/platform-rig/profiles/ui/svelte'
import { writable } from 'svelte/store'

export { default as Theme } from './Theme.svelte'

/**
 * @public
 */
export const setDefaultLanguage = (language: string): void => {
  if (localStorage.getItem('lang') === null) {
    localStorage.setItem('lang', language)
  }
}

function isSystemThemeDark (): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getDefaultTheme (): string {
  return isSystemThemeDark() ? 'theme-dark' : 'theme-light'
}

/**
 * @public
 */
export const getCurrentTheme = (): string => localStorage.getItem('theme') ?? getDefaultTheme()
/**
 * @public
 */
export const getCurrentFontSize = (): string => localStorage.getItem('fontsize') ?? 'normal-font'
/**
 * @public
 */
export const getCurrentLanguage = (): string => localStorage.getItem('lang') ?? 'en'

export class ThemeOptions {
  constructor (readonly fontSize: number, readonly dark: boolean, readonly language: string) {}
}
export const themeStore = writable<ThemeOptions>(
  new ThemeOptions(
    getCurrentFontSize() === 'normal-font' ? 16 : 14,
    getCurrentTheme() === 'theme-dark',
    getCurrentLanguage()
  )
)
