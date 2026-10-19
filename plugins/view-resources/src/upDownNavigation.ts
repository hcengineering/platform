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
 * Key bindings (in action key binding format) used to move to the previous / next document
 * of the list the opened document belongs to.
 */
export const previousDocumentKeys = ['Alt + ArrowUp']
export const nextDocumentKeys = ['Alt + ArrowDown']

type NavigationKeyEvent = Pick<
KeyboardEvent,
'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'defaultPrevented'
>

interface EditableTarget {
  tagName?: string
  isContentEditable?: boolean
}

function isEditableTarget (target: EditableTarget | null | undefined): boolean {
  if (target == null) return false
  if (target.isContentEditable === true) return true
  const tag = target.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

/**
 * Return the list offset requested by a keyboard event: -1 for previous, 1 for next,
 * undefined if the event is not a previous / next shortcut or happens while editing text.
 */
export function getUpDownNavigationOffset (evt: NavigationKeyEvent, target?: EditableTarget | null): 1 | -1 | undefined {
  if (evt.defaultPrevented) return undefined
  if (!evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey) return undefined
  if (isEditableTarget(target)) return undefined
  if (evt.key === 'ArrowUp') return -1
  if (evt.key === 'ArrowDown') return 1
  return undefined
}
