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

import { /* Metadata, Plugin, plugin, */ Resource /*, Service */ } from '@anticrm/platform'
import { /* getContext, */ SvelteComponent } from 'svelte'
import type { Asset, IntlString } from '@anticrm/platform'

/**
 * Describe a browser URI location parsed to path, query and fragment.
 */
export interface Location {
  path: string[] // A useful path value
  query?: Record<string, string | null> // a value of query parameters, no duplication are supported
  fragment?: string // a value of fragment
}

export type AnySvelteComponent = typeof SvelteComponent
export type Component<C extends AnySvelteComponent> = Resource<C>
export type AnyComponent = Resource<AnySvelteComponent>

export interface Action {
  label: IntlString
  icon: Asset | AnySvelteComponent
  action: (props: any, ev?: Event) => Promise<void>
}

export interface IPopupItem {
  _id?: number
  title?: IntlString | undefined
  component?: AnySvelteComponent | undefined
  props?: Object
  selected?: boolean
  action?: Function
}

export interface Tab {
  label: IntlString
  icon?: Asset
  component: AnyComponent
  props: any
}

export type TabModel = Tab[]

export type PopupAlignment = HTMLElement | 'right' | 'float' | 'full'

export type TooltipAligment = 'top' | 'bottom' | 'left' | 'right'

export interface LabelAndProps {
  label: IntlString | undefined
  element: HTMLElement | undefined
  direction?: TooltipAligment
  component?: AnySvelteComponent | AnyComponent
  props?: any
}
