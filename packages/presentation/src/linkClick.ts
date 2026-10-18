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

/**
 * Checks whether a mouse click on a link is the usual "open in a new tab" gesture:
 * Ctrl/Cmd + left click or a middle click.
 *
 * Clicks with Shift or Alt are not treated as such, so the browser keeps handling them
 * (e.g. Ctrl+Shift+click still opens a real browser tab).
 *
 * @public
 */
export function isNewTabClick (e: Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): boolean {
  if (e.shiftKey || e.altKey) return false
  if (e.button === 1) return true
  return e.button === 0 && (e.ctrlKey || e.metaKey)
}
