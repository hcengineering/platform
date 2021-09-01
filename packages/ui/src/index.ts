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

import { SvelteComponent } from 'svelte'

import Root from './components/internal/Root.svelte'

export type { AnyComponent, AnySvelteComponent, Action } from './types'
// export { applicationShortcutKey } from './utils'
export { getCurrentLocation, navigate, location } from './location'

export { default as EditBox } from './components/EditBox.svelte'
export { default as Label } from './components/Label.svelte'
export { default as Button } from './components/Button.svelte'
export { default as StatusControl } from './components/StatusControl.svelte'
export { default as Component } from './components/Component.svelte'
export { default as Icon } from './components/Icon.svelte'
export { default as ActionIcon } from './components/ActionIcon.svelte'
export { default as Toggle } from './components/Toggle.svelte'
export { default as Dialog } from './components/Dialog.svelte'
export { default as ToggleWithLabel } from './components/ToggleWithLabel.svelte'
export { default as Tooltip } from './components/Tooltip.svelte'
export { default as CheckBox } from './components/CheckBox.svelte'
export { default as Progress } from './components/Progress.svelte'
export { default as Tabs } from './components/Tabs.svelte'
export { default as ScrollBox } from './components/ScrollBox.svelte'
export { default as PopupMenu } from './components/PopupMenu.svelte'
export { default as PopupItem } from './components/PopupItem.svelte'
export { default as SelectItem } from './components/SelectItem.svelte'
export { default as TextArea } from './components/TextArea.svelte'
export { default as Section } from './components/Section.svelte'
export { default as DatePicker } from './components/DatePicker.svelte'
export { default as StylishEdit } from './components/StylishEdit.svelte'
export { default as Grid } from './components/Grid.svelte'
export { default as Row } from './components/Row.svelte'
export { default as CheckBoxWithLabel } from './components/CheckBoxWithLabel.svelte'
export { default as CheckBoxList } from './components/CheckBoxList.svelte'
export { default as EditWithIcon } from './components/EditWithIcon.svelte'
export { default as Loading } from './components/Loading.svelte'
export { default as Popup } from './components/Popup.svelte'
export { default as CircleButton } from './components/CircleButton.svelte'
export { default as Link } from './components/Link.svelte'

export { default as IconAdd } from './components/icons/Add.svelte'
export { default as IconClose } from './components/icons/Close.svelte'
export { default as IconSearch } from './components/icons/Search.svelte'
export { default as IconToDo } from './components/icons/ToDo.svelte'
export { default as IconComments } from './components/icons/Comments.svelte'

export * from './utils'

import type { AnySvelteComponent, AnyComponent, PopupAlignment } from './types'
import { writable } from 'svelte/store'

export function createApp (target: HTMLElement): SvelteComponent {
  return new Root({ target })
}

interface CompAndProps {
  is: AnySvelteComponent | AnyComponent | undefined
  props: any
  element?: PopupAlignment
  onClose?: (result: any) => void
}

export const store = writable<CompAndProps>({
  is: undefined,
  props: {},
})

export const popupstore = writable<CompAndProps[]>([])

export function showPopup (component: AnySvelteComponent | AnyComponent, props: any, element?: PopupAlignment, onClose?: (result: any) => void): void {
  popupstore.update(popups => {
    popups.push({ is: component, props, element, onClose })
    return popups
  })
}

export function closePopup (): void {
  popupstore.update(popups => {
    popups.pop()
    return popups
  })
}
