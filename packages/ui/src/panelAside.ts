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

const panelAsideHiddenKey = 'panel.aside.hidden'
const HIDDEN = 'true'

/**
 * @public
 */
export function isPanelAsideHidden (): boolean {
  try {
    return localStorage.getItem(panelAsideHiddenKey) === HIDDEN
  } catch {
    return false
  }
}

/**
 * @public
 */
export function setPanelAsideHidden (hidden: boolean): void {
  try {
    hidden ? localStorage.setItem(panelAsideHiddenKey, HIDDEN) : localStorage.removeItem(panelAsideHiddenKey)
  } catch {}
}

/**
 * Resolve the initial aside state of a panel, taking the remembered user choice into account.
 * Custom asides (tabs) and explicitly requested states (false or a tab id) are kept as is.
 * @public
 */
export function getInitialPanelAside (
  selectedAside: string | boolean,
  hasCustomAside: boolean,
  hidden: boolean
): string | boolean {
  if (hasCustomAside || selectedAside === false || typeof selectedAside === 'string') return selectedAside
  return hidden ? false : selectedAside
}
