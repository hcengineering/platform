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
import type { AnySvelteComponent, AnyComponent, PopupAlignment, LabelAndProps, TooltipAligment } from './types'
import { getResource, IntlString, addStringsLoader } from '@anticrm/platform'
import { uiId } from './plugin'
import { writable, readable } from 'svelte/store'

import Root from './components/internal/Root.svelte'

export type { AnyComponent, AnySvelteComponent, Action, LabelAndProps, TooltipAligment } from './types'
// export { applicationShortcutKey } from './utils'
export { getCurrentLocation, locationToUrl, navigate, location } from './location'

export { default as EditBox } from './components/EditBox.svelte'
export { default as Label } from './components/Label.svelte'
export { default as Button } from './components/Button.svelte'
export { default as Status } from './components/Status.svelte'
export { default as Component } from './components/Component.svelte'
export { default as Icon } from './components/Icon.svelte'
export { default as ActionIcon } from './components/ActionIcon.svelte'
export { default as Toggle } from './components/Toggle.svelte'
export { default as Dialog } from './components/Dialog.svelte'
export { default as ToggleWithLabel } from './components/ToggleWithLabel.svelte'
export { default as Tooltip } from './components/Tooltip.svelte'
export { default as TooltipInstance } from './components/TooltipInstance.svelte'
export { default as CheckBox } from './components/CheckBox.svelte'
export { default as Progress } from './components/Progress.svelte'
export { default as Tabs } from './components/Tabs.svelte'
export { default as ScrollBox } from './components/ScrollBox.svelte'
export { default as PopupMenu } from './components/PopupMenu.svelte'
// export { default as PopupItem } from './components/PopupItem.svelte'
export { default as TextArea } from './components/TextArea.svelte'
export { default as Section } from './components/Section.svelte'
export { default as DatePicker } from './components/DatePicker.svelte'
export { default as DatePopup } from './components/DatePopup.svelte'
export { default as StylishEdit } from './components/StylishEdit.svelte'
export { default as Grid } from './components/Grid.svelte'
export { default as Row } from './components/Row.svelte'
// export { default as CheckBoxWithLabel } from './components/CheckBoxWithLabel.svelte'
// export { default as CheckBoxList } from './components/CheckBoxList.svelte.txt'
export { default as EditWithIcon } from './components/EditWithIcon.svelte'
export { default as SearchEdit } from './components/SearchEdit.svelte'
export { default as Loading } from './components/Loading.svelte'
export { default as Spinner } from './components/Spinner.svelte'
export { default as Popup } from './components/Popup.svelte'
export { default as CircleButton } from './components/CircleButton.svelte'
export { default as Link } from './components/Link.svelte'
export { default as TimeSince } from './components/TimeSince.svelte'
export { default as Dropdown } from './components/Dropdown.svelte'
export { default as DropdownLabels } from './components/DropdownLabels.svelte'
export { default as ShowMore } from './components/ShowMore.svelte'
export { default as Menu } from './components/Menu.svelte'
export { default as ErrorPresenter } from './components/ErrorPresenter.svelte'
export { default as Scroller } from './components/Scroller.svelte'

export { default as IconAdd } from './components/icons/Add.svelte'
export { default as IconBack } from './components/icons/Back.svelte'
export { default as IconForward } from './components/icons/Forward.svelte'
export { default as IconClose } from './components/icons/Close.svelte'
export { default as IconSearch } from './components/icons/Search.svelte'
export { default as IconCalendar } from './components/icons/Calendar.svelte'
export { default as IconFolder } from './components/icons/Folder.svelte'
export { default as IconMoreH } from './components/icons/MoreH.svelte'
export { default as IconMoreV } from './components/icons/MoreV.svelte'
export { default as IconFile } from './components/icons/File.svelte'
export { default as IconAttachment } from './components/icons/Attachment.svelte'
export { default as IconThread } from './components/icons/Thread.svelte'
export { default as IconExpand } from './components/icons/Expand.svelte'
export { default as IconActivity } from './components/icons/Activity.svelte'
export { default as IconUp } from './components/icons/Up.svelte'
export { default as IconDown } from './components/icons/Down.svelte'
export { default as IconShare } from './components/icons/Share.svelte'
export { default as IconDelete } from './components/icons/Delete.svelte'
export { default as IconEdit } from './components/icons/Edit.svelte'
export { default as IconInfo } from './components/icons/Info.svelte'
export { default as IconBlueCheck } from './components/icons/BlueCheck.svelte'
export { default as IconArrowLeft } from './components/icons/ArrowLeft.svelte'

export * from './utils'

export function createApp (target: HTMLElement): SvelteComponent {
  return new Root({ target })
}

interface CompAndProps {
  is: AnySvelteComponent
  props: any
  element?: PopupAlignment
  onClose?: (result: any) => void
}

// export const store = writable<CompAndProps>({
//   is: undefined,
//   props: {},
// })

export const popupstore = writable<CompAndProps[]>([])

export function showPopup (
  component: AnySvelteComponent | AnyComponent,
  props: any,
  element?: PopupAlignment,
  onClose?: (result: any) => void
): void {
  if (typeof component === 'string') {
    getResource(component)
      .then((resolved) => {
        popupstore.update((popups) => {
          popups.push({ is: resolved, props, element, onClose })
          return popups
        })
      })
      .catch((err) => console.log(err))
  } else {
    popupstore.update((popups) => {
      popups.push({ is: component, props, element, onClose })
      return popups
    })
  }
}

export function closePopup (): void {
  popupstore.update((popups) => {
    popups.pop()
    return popups
  })
}

export const tooltipstore = writable<LabelAndProps>({
  label: undefined,
  element: undefined,
  direction: undefined,
  component: undefined,
  props: undefined,
  anchor: undefined
})

export function showTooltip (
  label: IntlString | undefined,
  element: HTMLElement,
  direction?: TooltipAligment,
  component?: AnySvelteComponent | AnyComponent,
  props?: any,
  anchor?: HTMLElement
): void {
  tooltipstore.set({
    label: label,
    element: element,
    direction: direction,
    component: component,
    props: props,
    anchor: anchor
  })
}

export function closeTooltip (): void {
  tooltipstore.set({
    label: undefined,
    element: undefined,
    direction: undefined,
    component: undefined,
    props: undefined,
    anchor: undefined
  })
}

export const ticker = readable(Date.now(), (set) => {
  setInterval(() => {
    set(Date.now())
  }, 10000)
})

addStringsLoader(uiId, async (lang: string) => {
  return await import(`../lang/${lang}.json`)
})

export { default } from './plugin'
export * from './colors'
