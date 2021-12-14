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

import { Asset, IntlString, plugin, Resource } from '@anticrm/platform'
import type { Plugin } from '@anticrm/platform'
import { AnyComponent } from '@anticrm/ui'
import type { Class, Doc, Ref } from '@anticrm/core'

/**
 * @public
 */
export type Handler = Resource<() => Promise<void>>

/**
 * @public
 */
export interface IntegrationType extends Doc {
  label: string | IntlString
  description: IntlString
  icon: AnyComponent
  createComponent: AnyComponent
  onDisconnect: Handler
}

/**
 * @public
 */
export interface Integration extends Doc {
  type: Ref<IntegrationType>
  value: string
}

/**
 * @public
 */
export const settingId = 'setting' as Plugin

export default plugin(settingId, {
  ids: {
    SettingApp: '' as Ref<Doc>
  },
  class: {
    Integration: '' as Ref<Class<Integration>>,
    IntegrationType: '' as Ref<Class<IntegrationType>>
  },
  component: {
    Setting: '' as AnyComponent,
    Integrations: '' as AnyComponent,
    ManageStatuses: '' as AnyComponent,
    Support: '' as AnyComponent,
    Privacy: '' as AnyComponent,
    Terms: '' as AnyComponent,
    ConnectEmail: '' as AnyComponent,
    IconGmail: '' as AnyComponent
  },
  handler: {
    EmailDisconnectHandler: '' as Handler
  },
  string: {
    Setting: '' as IntlString,
    Integrations: '' as IntlString,
    ManageStatuses: '' as IntlString,
    Support: '' as IntlString,
    Privacy: '' as IntlString,
    Terms: '' as IntlString,
    Folders: '' as IntlString,
    Templates: '' as IntlString,
    Delete: '' as IntlString
  },
  icon: {
    Setting: '' as Asset,
    Integrations: '' as Asset,
    Statuses: '' as Asset,
    Support: '' as Asset,
    Privacy: '' as Asset,
    Terms: '' as Asset
  }
})
