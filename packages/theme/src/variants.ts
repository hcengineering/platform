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

/** All values persisted in `localStorage` / passed as the app theme id. */
export const ThemeId = {
  Light: 'theme-light',
  Dark: 'theme-dark',
  DarkGray: 'theme-dark-gray',
  System: 'theme-system'
} as const

export type ThemeIdType = (typeof ThemeId)[keyof typeof ThemeId]

/** Binary appearance (native chrome, drawing, `ThemeOptions`); maps from any dark {@link ThemeId} to {@link ThemeVariant.Dark}. */
export const ThemeVariant = {
  Light: ThemeId.Light,
  Dark: ThemeId.Dark
} as const

export type ThemeVariantType = (typeof ThemeVariant)[keyof typeof ThemeVariant]

/** Stored ids that use a dark root palette (add new dark themes here only). */
export const THEME_IDS_DARK = [ThemeId.Dark, ThemeId.DarkGray] as const

/** True when `theme` is a stored id that always uses a dark root palette (not {@link ThemeId.System}). */
export function isStoredThemeDark (theme: string): boolean {
  return (THEME_IDS_DARK as readonly string[]).includes(theme)
}
