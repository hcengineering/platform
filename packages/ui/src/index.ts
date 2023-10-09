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

import { addLocation } from '@hcengineering/platform'
import { SvelteComponent } from 'svelte'
import { readable, writable } from 'svelte/store'
import Root from './components/internal/Root.svelte'
import { uiId, uis } from './plugin'
import type { DeviceOptions } from './types'

export type {
  AnyComponent,
  AnySvelteComponent,
  Action,
  LabelAndProps,
  ListItem,
  TooltipAlignment,
  AnySvelteComponentWithProps,
  Location,
  PopupAlignment,
  PopupPositionElement,
  ButtonKind,
  ButtonSize,
  IconSize,
  TabItem,
  DeviceOptions,
  TSeparatedItem,
  SeparatedItem,
  DefSeparators,
  SeparatedElement
} from './types'

export { themeStore } from '@hcengineering/theme'
// export { applicationShortcutKey } from './utils'
export { getCurrentLocation, locationToUrl, navigate, location, setLocationStorageKey } from './location'

export { default as EditBox } from './components/EditBox.svelte'
export { default as Label } from './components/Label.svelte'
export { default as Button } from './components/Button.svelte'
export { default as Status } from './components/Status.svelte'
export { default as Component } from './components/Component.svelte'
export { default as Icon } from './components/Icon.svelte'
export { default as ActionIcon } from './components/ActionIcon.svelte'
export { default as Toggle } from './components/Toggle.svelte'
export { default as RadioButton } from './components/RadioButton.svelte'
export { default as RadioGroup } from './components/RadioGroup.svelte'
export { default as Dialog } from './components/Dialog.svelte'
export { default as ToggleWithLabel } from './components/ToggleWithLabel.svelte'
export { default as MiniToggle } from './components/MiniToggle.svelte'
export { default as TooltipInstance } from './components/TooltipInstance.svelte'
export { default as CheckBox } from './components/CheckBox.svelte'
export { default as Progress } from './components/Progress.svelte'
export { default as ProgressCircle } from './components/ProgressCircle.svelte'
export { default as Tabs } from './components/Tabs.svelte'
export { default as TabsControl } from './components/TabsControl.svelte'
export { default as ScrollBox } from './components/ScrollBox.svelte'
export { default as PopupMenu } from './components/PopupMenu.svelte'
export { default as SelectPopup } from './components/SelectPopup.svelte'
export { default as ColorPopup } from './components/ColorPopup.svelte'
export { default as TextArea } from './components/TextArea.svelte'
export { default as TextAreaEditor } from './components/TextAreaEditor.svelte'
export { default as Section } from './components/Section.svelte'
export { default as DatePicker } from './components/calendar/DatePicker.svelte'
export { default as DateRangePicker } from './components/calendar/DateRangePicker.svelte'
export { default as DatePopup } from './components/calendar/DatePopup.svelte'
export { default as SimpleDatePopup } from './components/calendar/SimpleDatePopup.svelte'
export { default as RangeDatePopup } from './components/calendar/RangeDatePopup.svelte'
export { default as DateRangePopup } from './components/calendar/DateRangePopup.svelte'
export { default as TimePopup } from './components/calendar/TimePopup.svelte'
export { default as DateRangePresenter } from './components/calendar/DateRangePresenter.svelte'
export { default as DateTimeRangePresenter } from './components/calendar/DateTimeRangePresenter.svelte'
export { default as DatePresenter } from './components/calendar/DatePresenter.svelte'
export { default as DueDatePresenter } from './components/calendar/DueDatePresenter.svelte'
export { default as DateTimePresenter } from './components/calendar/DateTimePresenter.svelte'
export { default as TimeInputBox } from './components/calendar/TimeInputBox.svelte'
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
export { default as LinkWrapper } from './components/LinkWrapper.svelte'
export { default as Like } from './components/Like.svelte'
export { default as TimeSince } from './components/TimeSince.svelte'
export { default as Dropdown } from './components/Dropdown.svelte'
export { default as DropdownPopup } from './components/DropdownPopup.svelte'
export { default as DropdownLabels } from './components/DropdownLabels.svelte'
export { default as DropdownLabelsPopup } from './components/DropdownLabelsPopup.svelte'
export { default as DropdownLabelsIntl } from './components/DropdownLabelsIntl.svelte'
export { default as DropdownLabelsPopupIntl } from './components/DropdownLabelsPopupIntl.svelte'
export { default as DropdownRecord } from './components/DropdownRecord.svelte'
export { default as ShowMore } from './components/ShowMore.svelte'
export { default as Menu } from './components/Menu.svelte'
export { default as Submenu } from './components/Submenu.svelte'
export { default as TimeShiftPicker } from './components/TimeShiftPicker.svelte'
export { default as ErrorPresenter } from './components/ErrorPresenter.svelte'
export { default as Scroller } from './components/Scroller.svelte'
export { default as ScrollerBar } from './components/ScrollerBar.svelte'
export { default as TabList } from './components/TabList.svelte'
export { default as Chevron } from './components/Chevron.svelte'
export { default as Timeline } from './components/Timeline.svelte'
export { default as TimeShiftPresenter } from './components/TimeShiftPresenter.svelte'
export { default as Separator } from './components/Separator.svelte'

export { default as IconAdd } from './components/icons/Add.svelte'
export { default as IconCircleAdd } from './components/icons/CircleAdd.svelte'
export { default as IconCopy } from './components/icons/Copy.svelte'
export { default as IconStart } from './components/icons/Start.svelte'
export { default as IconStop } from './components/icons/Stop.svelte'
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
export { default as IconUpOutline } from './components/icons/UpOutline.svelte'
export { default as IconDownOutline } from './components/icons/DownOutline.svelte'
export { default as IconDropdown } from './components/icons/Dropdown.svelte'
export { default as IconShare } from './components/icons/Share.svelte'
export { default as IconDelete } from './components/icons/Delete.svelte'
export { default as IconActivityEdit } from './components/icons/ActivityEdit.svelte'
export { default as IconEdit } from './components/icons/Edit.svelte'
export { default as IconFilter } from './components/icons/Filter.svelte'
export { default as IconInfo } from './components/icons/Info.svelte'
export { default as IconBlueCheck } from './components/icons/BlueCheck.svelte'
export { default as IconCheck } from './components/icons/Check.svelte'
export { default as IconCheckAll } from './components/icons/CheckAll.svelte'
export { default as IconChevronDown } from './components/icons/ChevronDown.svelte'
export { default as IconArrowLeft } from './components/icons/ArrowLeft.svelte'
export { default as IconArrowRight } from './components/icons/ArrowRight.svelte'
export { default as IconNavPrev } from './components/icons/NavPrev.svelte'
export { default as IconNavNext } from './components/icons/NavNext.svelte'
export { default as IconDPCalendar } from './components/calendar/icons/DPCalendar.svelte'
export { default as IconDPCalendarOver } from './components/calendar/icons/DPCalendarOver.svelte'
export { default as IconOptions } from './components/icons/Options.svelte'
export { default as IconDetails } from './components/icons/Details.svelte'
export { default as IconDetailsFilled } from './components/icons/DetailsFilled.svelte'
export { default as IconScale } from './components/icons/Scale.svelte'
export { default as IconScaleFull } from './components/icons/ScaleFull.svelte'
export { default as IconOpen } from './components/icons/Open.svelte'
export { default as IconCheckCircle } from './components/icons/CheckCircle.svelte'
export { default as IconColStar } from './components/icons/ColStar.svelte'
export { default as IconMinWidth } from './components/icons/MinWidth.svelte'
export { default as IconMaxWidth } from './components/icons/MaxWidth.svelte'
export { default as IconMixin } from './components/icons/Mixin.svelte'
export { default as IconCircles } from './components/icons/Circles.svelte'
export { default as IconLike } from './components/icons/Like.svelte'
export { default as IconCollapseArrow } from './components/icons/CollapseArrow.svelte'
export { default as IconEmoji } from './components/icons/Emoji.svelte'
export { default as IconObjects } from './components/icons/Objects.svelte'

export { default as PanelInstance } from './components/PanelInstance.svelte'
export { default as Panel } from './components/Panel.svelte'

export { default as MonthCalendar } from './components/calendar/MonthCalendar.svelte'
export { default as YearCalendar } from './components/calendar/YearCalendar.svelte'
export { default as WeekCalendar } from './components/calendar/WeekCalendar.svelte'

export { default as FocusHandler } from './components/FocusHandler.svelte'
export { default as ListView } from './components/ListView.svelte'
export { default as ToggleButton } from './components/ToggleButton.svelte'
export { default as ExpandCollapse } from './components/ExpandCollapse.svelte'
export { default as BooleanIcon } from './components/BooleanIcon.svelte'
export { default as Expandable } from './components/Expandable.svelte'
export { default as BarDashboard } from './components/BarDashboard.svelte'
export { default as Notifications } from './components/notifications/Notifications.svelte'
export { default as notificationsStore } from './components/notifications/store'
export { NotificationPosition } from './components/notifications/NotificationPosition'
export { NotificationSeverity } from './components/notifications/NotificationSeverity'
export { Notification } from './components/notifications/Notification'
export { default as Wizard } from './components/wizard/Wizard.svelte'
export { default as StepsDialog } from './components/StepsDialog.svelte'
export { default as EmojiPopup } from './components/EmojiPopup.svelte'
export { default as IconWithEmoji } from './components/IconWithEmoji.svelte'
export { default as ModeSelector } from './components/ModeSelector.svelte'
export { default as SimpleTimePopup } from './components/calendar/SimpleTimePopup.svelte'
export { default as NumberInput } from './components/NumberInput.svelte'
export { default as Lazy } from './components/Lazy.svelte'

export * from './types'
export * from './location'
export * from './utils'
export * from './popups'
export * from './tooltips'
export * from './panelup'
export * from './components/calendar/internal/DateUtils'
export * from './colors'
export * from './focus'
export * from './resize'
export * from './lazy'

export function createApp (target: HTMLElement): SvelteComponent {
  return new Root({ target })
}

export const ticker = readable(Date.now(), (set) => {
  setInterval(() => {
    set(Date.now())
  }, 10000)
})

addLocation(uiId, async () => ({ default: async () => ({}) }))

export const deviceOptionsStore = writable<DeviceOptions>({
  docWidth: 0,
  docHeight: 0,
  isPortrait: false,
  isMobile: false,
  fontSize: 0,
  size: null,
  sizes: { xs: false, sm: false, md: false, lg: false, xl: false, xxl: false },
  minWidth: false,
  twoRows: false
})

export default uis
