//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { AccountRole, Class, Doc, Obj, PersonId, Ref, Space, Tx } from '@hcengineering/core'
import { DocNotifyContext, InboxNotification } from '@hcengineering/notification'
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import type { Preference } from '@hcengineering/preference'
import { AnyComponent, type AnySvelteComponent, Location, ResolvedLocation } from '@hcengineering/ui'

/** @public */
export interface LocationData {
  objectId?: Ref<Doc>
  objectClass?: Ref<Class<Doc>>
  name?: string
  nameIntl?: IntlString
  icon?: Asset
  iconComponent?: AnyComponent
  iconProps?: Record<string, any>
}

/** @public */
export interface Application extends Doc {
  label: IntlString
  alias: string
  icon: Asset
  hidden: boolean
  position?: 'top' | 'mid'

  // Also attached ApplicationNavModel will be joined after this one main.
  navigatorModel?: NavigatorModel

  locationResolver?: Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  locationDataResolver?: Resource<(loc: Location) => Promise<LocationData>>

  // Component will be displayed in case navigator model is not defined, or nothing is selected in navigator model
  component?: AnyComponent

  navHeaderComponent?: AnyComponent
  accessLevel?: AccountRole
  navFooterComponent?: AnyComponent
}

/** @public */
export enum WidgetType {
  Fixed = 'fixed', // Fixed sidebar are always visible
  Flexible = 'flexible', // Flexible sidebar are visible only in special cases (during the meeting, etc.)
  Configurable = 'configurable ' // Configurable might be fixed in sidebar by user in preferences
}

/** @public */
export interface Widget extends Doc {
  label: IntlString
  icon: Asset
  type: WidgetType

  component: AnyComponent
  tabComponent?: AnyComponent
  switcherComponent?: AnyComponent
  headerLabel?: IntlString

  closeIfNoTabs?: boolean
  onTabClose?: Resource<(tab: WidgetTab) => Promise<void>>
}

/** @public */
export interface WidgetPreference extends Preference {
  enabled: boolean
}

/** @public */
export interface WidgetTab {
  id: string
  name?: string
  label?: IntlString
  icon?: Asset | AnySvelteComponent
  iconComponent?: AnyComponent
  iconProps?: Record<string, any>
  isPinned?: boolean
  allowedPath?: string
  objectId?: Ref<Doc>
  objectClass?: Ref<Class<Doc>>
  data?: Record<string, any>
  readonly?: boolean
}

/** @public */
export enum SidebarEvent {
  OpenWidget = 'openWidget'
}

/** @public */
export interface OpenSidebarWidgetParams {
  widget: Ref<Widget>
  tab?: WidgetTab
}

/** @public */
export interface TxSidebarEvent<T extends Record<string, any> = Record<string, any>> extends Tx {
  event: SidebarEvent
  params: T
}

/** @public */
export interface WorkbenchTab extends Preference {
  attachedTo: PersonId
  location: string
  isPinned: boolean
  name?: string
}

/** @public */
export interface ApplicationNavModel extends Doc {
  extends: Ref<Application>

  spaces?: SpacesNavModel[]
  specials?: SpecialNavModel[]
}

/** @public */
export interface HiddenApplication extends Preference {
  attachedTo: Ref<Application>
}

/** @public */
export interface SpacesNavModel {
  id: string // Id could be used for extending of navigation model
  label?: IntlString
  spaceClass: Ref<Class<Space>>
  addSpaceLabel?: IntlString
  createComponent?: AnyComponent
  icon?: Asset

  // Child special items.
  specials?: SpecialNavModel[]

  visibleIf?: Resource<(space: Space) => Promise<boolean>>
}

/** @public */
export interface NavigatorModel {
  spaces: SpacesNavModel[]
  specials?: SpecialNavModel[]
}

/** @public */
export interface SpecialNavModel {
  id: string // Uniq id
  label: IntlString
  icon?: Asset
  accessLevel?: AccountRole
  component: AnyComponent
  componentProps?: Record<string, any>
  // If not top and bottom, position will be sorted alphabetically.
  position?: 'top' | 'bottom' | string // undefined == 'top
  visibleIf?: Resource<(spaces: Space[]) => Promise<boolean>>
  // If defined, will be used to find spaces for visibleIf
  spaceClass?: Ref<Class<Space>>
  checkIsDisabled?: Resource<() => Promise<boolean>>
  notificationsCountProvider?: Resource<
  (inboxNotificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>) => number
  >
  navigationModel?: ParentsNavigationModel
  queryOptions?: QueryOptions
}

/** @public */
export interface ParentsNavigationModel {
  navigationComponent: AnyComponent
  navigationComponentLabel: IntlString
  navigationComponentIcon?: Asset
  mainComponentLabel: IntlString
  mainComponentIcon?: Asset
  navigationComponentProps?: Record<string, any>
  syncWithLocationQuery?: boolean
  createComponent?: AnyComponent
  createComponentProps?: Record<string, any>
  createButton?: AnyComponent
}

/** @public */
export interface QueryOptions {
  // If specified should display only documents from the current space
  filterBySpace?: boolean
}

/** @public */
export interface ViewConfiguration {
  class: Ref<Class<Doc>> // show object of this class
  createItemDialog?: AnyComponent
  createItemLabel?: IntlString

  // If defined component will be used to render content for selected space.
  component?: AnyComponent
  componentProps?: Record<string, any>
}

/** @public */
export interface SpaceView extends Class<Obj> {
  view: ViewConfiguration
}
