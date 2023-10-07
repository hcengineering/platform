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
import { Timestamp } from '@hcengineering/core'
import type { Asset, IntlString } from '@hcengineering/platform'
import { /* Metadata, Plugin, plugin, */ Resource /*, Service */ } from '@hcengineering/platform'
import { /* getContext, */ ComponentType } from 'svelte'

/**
 * Describe a browser URI location parsed to path, query and fragment.
 */
export interface Location {
  path: string[] // A useful path value
  query?: Record<string, string | null> // a value of query parameters, no duplication are supported
  fragment?: string // a value of fragment
}

export interface ResolvedLocation {
  loc: Location
  defaultLocation: Location
}

/**
 * Returns true if locations are equal.
 */
export function areLocationsEqual (loc1: Location, loc2: Location): boolean {
  if (loc1 === loc2) {
    return true
  }
  if (loc1.fragment !== loc2.fragment) {
    return false
  }
  if (loc1.path.length !== loc2.path.length) {
    return false
  }
  if (loc1.path.findIndex((v, i) => v !== loc2.path[i]) >= 0) {
    return false
  }
  const keys1 = Object.keys(loc1.query ?? {})
  const keys2 = Object.keys(loc2.query ?? {})
  if (keys1.length !== keys2.length) {
    return false
  }
  return keys1.findIndex((k) => loc1.query?.[k] !== loc2.query?.[k]) < 0
}

export type AnySvelteComponent = ComponentType
export type Component<C extends AnySvelteComponent> = Resource<C>
export type AnyComponent = Resource<AnySvelteComponent>

/**
 * @public
 *
 * Component extension points.
 */
export type ComponentExtensionId = string & { __componentPointId: true }

/**
 * Allow to pass component with some predefined properties.
 * @public
 */
export interface AnySvelteComponentWithProps {
  component: AnySvelteComponent
  props?: Record<string, any>
}

export interface Action {
  label: IntlString
  icon?: Asset | AnySvelteComponent
  action: (props: any, ev: Event) => Promise<void>
  inline?: boolean
  link?: string

  // Submenu component
  component?: AnyComponent | AnySvelteComponent
  props?: Record<string, any>
  isSubmenuRightClicking?: boolean

  group?: string
}

export interface IPopupItem {
  _id?: number
  title?: IntlString | undefined
  component?: AnySvelteComponent | undefined
  props?: Object
  selected?: boolean
  action?: Function
}

export interface TabBase {
  label: IntlString
  icon?: Asset
}

export interface Tab extends TabBase {
  component: AnyComponent | AnySvelteComponent
  props: any
}

export type TabModel = Tab[]

export interface TabItem {
  id: string
  label?: string
  labelIntl?: IntlString
  labelParams?: Record<string, any>
  icon?: Asset | AnySvelteComponent
  color?: string
  tooltip?: IntlString
  action?: () => void
}

export interface RadioItem {
  id?: string
  label?: string
  labelIntl?: IntlString
  labelParams?: Record<string, any>
  value: any
  disabled?: boolean
  action?: () => void
}

export type ButtonKind =
  | 'accented'
  | 'brand'
  | 'positive'
  | 'negative'
  | 'regular'
  | 'ghost'
  | 'no-border'
  | 'link'
  | 'link-bordered'
  | 'dangerous'
  | 'list'
  | 'list-header'
  | 'contrast'
  | 'stepper'
export type ButtonSize = 'inline' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large'
export type ButtonShape =
  | 'rectangle'
  | 'rectangle-left'
  | 'rectangle-right'
  | 'circle'
  | 'round-sm'
  | 'round'
  | 'round2'
  | 'filter'
  | undefined
export type EditStyle =
  | 'editbox'
  | 'large-style'
  | 'small-style'
  | 'search-style'
  | 'underline'
  | 'default'
  | 'ghost'
  | 'default-large'
  | 'ghost-large'
export interface PopupPositionElement {
  getBoundingClientRect: () => DOMRect
  position?: {
    v: VerticalAlignment
    h: HorizontalAlignment
  }
  kind?: 'submenu'
}

export type PopupPosAlignment =
  | 'right'
  | 'top'
  | 'float'
  | 'logo'
  | 'logo-mini'
  | 'logo-portrait'
  | 'account'
  | 'account-portrait'
  | 'account-mobile'
  | 'notify'
  | 'notify-mobile'
  | 'full'
  | 'content'
  | 'middle'
  | 'help-center'
  | 'centered'
  | 'center'

export function isPopupPosAlignment (x: any): x is PopupPosAlignment {
  return (
    typeof x === 'string' &&
    (x === 'right' ||
      x === 'top' ||
      x === 'float' ||
      x === 'logo' ||
      x === 'logo-mini' ||
      x === 'logo-portrait' ||
      x === 'account' ||
      x === 'full' ||
      x === 'content' ||
      x === 'middle' ||
      x === 'help-center' ||
      x === 'centered' ||
      x === 'center')
  )
}

export type PopupAlignment = PopupPosAlignment | PopupPositionElement | null

export type TooltipAlignment = 'top' | 'bottom' | 'left' | 'right'
export type VerticalAlignment = 'top' | 'bottom'
export type HorizontalAlignment = 'left' | 'right'

// Be aware to update front getResizeID() to properly store resized images.
export type IconSize =
  | 'inline'
  | 'tiny'
  | 'card'
  | 'x-small'
  | 'smaller'
  | 'small'
  | 'medium'
  | 'large'
  | 'x-large'
  | '2x-large'
  | 'full'
export interface IconProps {
  icon?: number
  size?: IconSize
  fill?: string
}

export function getIconSize2x (size: IconSize): IconSize {
  switch (size) {
    case 'inline':
    case 'tiny':
    case 'x-small':
    case 'small':
    case 'card':
    case 'smaller':
    case 'medium':
      return 'large'
    case 'large':
      return 'x-large'
    case 'x-large':
      return '2x-large'
    case '2x-large':
    case 'full':
      return 'full'
  }
}

export interface DateOrShift {
  date?: number
  shift?: number
}

export interface LabelAndProps {
  label?: IntlString
  element?: HTMLElement
  direction?: TooltipAlignment
  component?: AnySvelteComponent | AnyComponent
  props?: any
  anchor?: HTMLElement
  onUpdate?: (result: any) => void
  kind?: 'tooltip' | 'submenu' | 'popup'
  keys?: string[]
}

export interface ListItem {
  _id: string
  label: string
  icon?: Asset
  iconProps?: any
  image?: string
  isSelectable?: boolean
  fontWeight?: 'normal' | 'medium' | 'semi-bold'
  paddingLeft?: number
}

export interface DropdownTextItem {
  id: string
  label: string
}

export interface DropdownIntlItem {
  id: string | number
  label: IntlString
  params?: Record<string, any>
}

export interface PopupOptions {
  props: Record<string, string | number>
  showOverlay: boolean
  direction: string
  fullSize?: boolean
}

export interface DashboardItem {
  _id: string
  label: string
  values: DashboardGroup[]
  tooltip?: LabelAndProps
}

export interface DashboardGroup {
  value: number
  color: number
}

interface Sides<T> {
  top?: T
  bottom?: T
  left?: T
  right?: T
}
export interface FadeOptions {
  multipler?: Sides<number>
}
export const defaultSP: FadeOptions = { multipler: { top: 0, bottom: 0 } }
export const tableSP: FadeOptions = { multipler: { top: 3, bottom: 2.5 } }
export const topSP: FadeOptions = { multipler: { top: 2.5, bottom: 0 } }
export const tableHRscheduleY: FadeOptions = { multipler: { top: 5, bottom: 0 } }
export const issueSP: FadeOptions = { multipler: { top: 2.75, bottom: 0 } }
export const emojiSP: FadeOptions = { multipler: { top: 1.5, bottom: 0 } }

export type WidthType = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
export const deviceSizes: WidthType[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
export const deviceWidths = [480, 680, 760, 1024, 1208, -1]

export interface DeviceOptions {
  docWidth: number
  docHeight: number
  isPortrait: boolean
  isMobile: boolean
  fontSize: number
  size: WidthType | null
  sizes: Record<WidthType, boolean>
  minWidth: boolean
  twoRows: boolean
  theme?: any
}

export interface TimelineItem {
  icon?: Asset | AnySvelteComponent
  iconSize?: IconSize
  iconProps?: Record<string, any>
  presenter?: AnySvelteComponent
  props?: Record<string, any>
  label?: string

  startDate: Timestamp
  targetDate: Timestamp | undefined
}
export interface TimelineRow {
  items: TimelineItem[] | undefined
}
export interface TimelinePoint {
  date: Date
  x: number
  label?: string
}
export interface TimelineMinMax {
  min: TimelinePoint
  max: TimelinePoint
}
export type TTimelineRow = TimelineMinMax | null
export interface TimelineState {
  todayMarker: TimelinePoint
  cursorMarker?: TimelinePoint
  offsetView: number
  renderedRange: {
    left: TimelinePoint
    right: TimelinePoint
    firstDays: number[]
  }
  rows: TTimelineRow[] | undefined
  months: TimelinePoint[]
  days: TimelinePoint[]
  timelineBox: DOMRect
  viewBox: DOMRect
}

export interface WizardModel {
  label: IntlString
  component: AnyComponent | AnySvelteComponent
  props?: any
}
export type WizardItemPosition = 'start' | 'middle' | 'end'
export type WizardItemPositionState = 'current' | 'prev' | 'next'

/**
 * @public
 */
export interface DialogStep {
  readonly name: IntlString
  readonly description?: IntlString
  readonly additionalInfo?: string
  readonly component: AnyComponent | AnySvelteComponent
  props?: Record<string, any>
}

/**
 * @public
 */
export interface CalendarItem {
  _id: string
  allDay: boolean
  date: Timestamp
  dueDate: Timestamp
  day: number
  access: 'freeBusyReader' | 'reader' | 'writer' | 'owner'
}

export const SECOND = 1000
export const MINUTE = SECOND * 60
export const HOUR = MINUTE * 60
export const DAY = HOUR * 24
export const MONTH = DAY * 30
export const YEAR = MONTH * 12

export type TSeparatedItem = number | 'auto'
export interface SeparatedItem {
  size: TSeparatedItem
  minSize: TSeparatedItem
  maxSize: TSeparatedItem
  float?: string | undefined
}
export type DefSeparators = Array<SeparatedItem | null>
export interface SeparatedElement {
  id: number
  element: Element
  styles: Map<string, string> | null
  minSize: number
  size: number
  maxSize: number
  begin: boolean
  resize: boolean
  float?: string | undefined
}
