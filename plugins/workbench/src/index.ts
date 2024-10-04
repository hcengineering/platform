//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { AccountRole, Class, Doc, Mixin, Obj, Ref, Space, Tx } from '@hcengineering/core'
import { DocNotifyContext, InboxNotification } from '@hcengineering/notification'
import type { Asset, IntlString, Metadata, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { Preference } from '@hcengineering/preference'
import {
  AnyComponent,
  type AnySvelteComponent,
  ComponentExtensionId,
  Location,
  ResolvedLocation
} from '@hcengineering/ui'
import { ViewAction } from '@hcengineering/view'

/**
 * @public
 */

export interface LocationData {
  name?: string
  nameIntl?: IntlString
  icon?: Asset
  iconComponent?: AnyComponent
  iconProps?: Record<string, any>
}

export interface Application extends Doc {
  label: IntlString
  alias: string
  icon: Asset
  hidden: boolean
  position?: 'top' | 'mid'

  // Also attached ApplicationNavModel will be joined after this one main.
  navigatorModel?: NavigatorModel
  aside?: AnyComponent

  locationResolver?: Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  locationDataResolver?: Resource<(loc: Location) => Promise<LocationData>>

  // Component will be displayed in case navigator model is not defined, or nothing is selected in navigator model
  component?: AnyComponent

  navHeaderComponent?: AnyComponent
  accessLevel?: AccountRole
  navFooterComponent?: AnyComponent
}

export enum WidgetType {
  Fixed = 'fixed', // Fixed sidebar are always visible
  Flexible = 'flexible', // Flexible sidebar are visible only in special cases (during the meeting, etc.)
  Configurable = 'configurable ' // Configurable might be fixed in sidebar by user in preferences
}

export interface Widget extends Doc {
  label: IntlString
  icon: Asset
  type: WidgetType

  component: AnyComponent
  tabComponent?: AnyComponent
  headerLabel?: IntlString

  closeIfNoTabs?: boolean
  onTabClose?: Resource<(tab: WidgetTab) => Promise<void>>
}

export interface WidgetPreference extends Preference {
  enabled: boolean
}

export interface WidgetTab {
  id: string
  name?: string
  nameIntl?: IntlString
  icon?: Asset | AnySvelteComponent
  iconComponent?: AnyComponent
  iconProps?: Record<string, any>
  widget?: Ref<Widget>
  isPinned?: boolean
  allowedPath?: string
  data?: Record<string, any>
}

export enum SidebarEvent {
  OpenWidget = 'openWidget'
}

export interface OpenSidebarWidgetParams {
  widget: Ref<Widget>
  tab?: WidgetTab
}

export interface TxSidebarEvent<T extends Record<string, any> = Record<string, any>> extends Tx {
  event: SidebarEvent
  params: T
}

export interface WorkbenchTab extends Preference {
  location: string
  isPinned: boolean
}

/**
 * @public
 */
export interface ApplicationNavModel extends Doc {
  extends: Ref<Application>

  spaces?: SpacesNavModel[]
  specials?: SpecialNavModel[]
  aside?: AnyComponent
}

/**
 * @public
 */
export interface HiddenApplication extends Preference {
  attachedTo: Ref<Application>
}

/**
 * @public
 */
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

/**
 * @public
 */
export interface NavigatorModel {
  spaces: SpacesNavModel[]
  specials?: SpecialNavModel[]
  aside?: AnyComponent
}

/**
 * @public
 */
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
}

/**
 * @public
 */
export interface ViewConfiguration {
  class: Ref<Class<Doc>> // show object of this class
  createItemDialog?: AnyComponent
  createItemLabel?: IntlString

  // If defined component will be used to render content for selected space.
  component?: AnyComponent
  componentProps?: Record<string, any>
}

/**
 * @public
 */
export interface SpaceView extends Class<Obj> {
  view: ViewConfiguration
}

/**
 * @public
 */
export const workbenchId = 'workbench' as Plugin

export * from './analytics'

export default plugin(workbenchId, {
  class: {
    Application: '' as Ref<Class<Application>>,
    ApplicationNavModel: '' as Ref<Class<ApplicationNavModel>>,
    HiddenApplication: '' as Ref<Class<HiddenApplication>>,
    Widget: '' as Ref<Class<Widget>>,
    WidgetPreference: '' as Ref<Class<WidgetPreference>>,
    TxSidebarEvent: '' as Ref<Class<TxSidebarEvent<Record<string, any>>>>,
    WorkbenchTab: '' as Ref<Class<WorkbenchTab>>
  },
  mixin: {
    SpaceView: '' as Ref<Mixin<SpaceView>>
  },
  component: {
    WorkbenchApp: '' as AnyComponent,
    InviteLink: '' as AnyComponent,
    Archive: '' as AnyComponent,
    SpecialView: '' as AnyComponent
  },
  string: {
    Archive: '' as IntlString,
    View: '' as IntlString,
    ServerUnderMaintenance: '' as IntlString,
    UpgradeDownloadProgress: '' as IntlString,
    OpenInSidebar: '' as IntlString,
    OpenInSidebarNewTab: '' as IntlString,
    ConfigureWidgets: '' as IntlString
  },
  icon: {
    Search: '' as Asset
  },
  event: {
    NotifyConnection: '' as Metadata<string>,
    NotifyTitle: '' as Metadata<string>
  },
  metadata: {
    PlatformTitle: '' as Metadata<string>,
    ExcludedApplications: '' as Metadata<Ref<Application>[]>,
    DefaultApplication: '' as Metadata<string>,
    DefaultSpace: '' as Metadata<Ref<Space>>,
    DefaultSpecial: '' as Metadata<string>,
    // Default for navigation expanded state
    NavigationExpandedDefault: '' as Metadata<boolean>
  },
  extensions: {
    WorkbenchExtensions: '' as ComponentExtensionId,
    WorkbenchTabExtensions: '' as ComponentExtensionId
  },
  function: {
    CreateWidgetTab: '' as Resource<(widget: Widget, tab: WidgetTab, newTab: boolean) => Promise<void>>,
    CloseWidgetTab: '' as Resource<(widget: Widget, tab: string) => Promise<void>>
  },
  actionImpl: {
    Navigate: '' as ViewAction<{
      mode: 'app' | 'special' | 'space'
      application?: string
      special?: string
      space?: Ref<Space>
      // If no space is selected, select first space from list
      spaceClass?: Ref<Class<Space>>
      spaceSpecial?: string
    }>
  }
})
