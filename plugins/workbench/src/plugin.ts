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

import type { Class, Doc, Mixin, Ref, Space } from '@hcengineering/core'
import type { Asset, IntlString, Metadata, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'
import { ViewAction } from '@hcengineering/view'

import type {
  Application,
  ApplicationNavModel,
  HiddenApplication,
  SpaceView,
  Widget,
  WidgetPreference,
  WidgetTab,
  WorkbenchTab
} from './types'

/** @public */
export const workbenchId = 'workbench' as Plugin

/** @public */
export const workbenchPlugin = plugin(workbenchId, {
  class: {
    Application: '' as Ref<Class<Application>>,
    ApplicationNavModel: '' as Ref<Class<ApplicationNavModel>>,
    HiddenApplication: '' as Ref<Class<HiddenApplication>>,
    Widget: '' as Ref<Class<Widget>>,
    WidgetPreference: '' as Ref<Class<WidgetPreference>>,
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
    ConfigureWidgets: '' as IntlString,
    WorkspaceIsArchived: '' as IntlString,
    WorkspaceIsMigrating: '' as IntlString
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
    CloseWidgetTab: '' as Resource<(widget: Widget, tab: string) => Promise<void>>,
    CloseWidget: '' as Resource<(widget: Ref<Widget>) => Promise<void>>,
    GetSidebarObject: '' as Resource<() => Partial<Pick<Doc, '_id' | '_class'>>>,
    LogIn: '' as Resource<(loginInfo: { account: string, token?: string }) => Promise<void>>,
    LogOut: '' as Resource<() => Promise<void>>
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
