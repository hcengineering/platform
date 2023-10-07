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

import type { Account, Class, Configuration, Doc, Mixin, Ref, Space } from '@hcengineering/core'
import type { Plugin } from '@hcengineering/platform'
import { Asset, IntlString, plugin, Resource } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { TemplateFieldCategory, TemplateField } from '@hcengineering/templates'

/**
 * @public
 */
export type Handler = Resource<(value: string) => Promise<void>>

/**
 * @public
 */
export interface IntegrationType extends Doc {
  label: IntlString
  description: IntlString
  icon: AnyComponent
  allowMultiple: boolean

  createComponent?: AnyComponent
  onDisconnect?: Handler
  reconnectComponent?: AnyComponent

  configureComponent?: AnyComponent
}

/**
 * @public
 */
export interface Integration extends Doc {
  type: Ref<IntegrationType>
  disabled: boolean
  value: string
  error?: IntlString | null
  shared?: Ref<Account>[]
}

/**
 * @public
 */
export interface Editable extends Class<Doc> {
  value: boolean // true is editable, false is not
}

/**
 * @public
 *
 * Mixin to allow delete of Custom classes.
 */
export interface UserMixin extends Class<Doc> {}

/**
 * @public
 */
export interface SettingsCategory extends Doc {
  name: string
  label: IntlString
  icon: Asset
  component: AnyComponent
  group?: string

  // If defined, will sort using order.
  order?: number
  secured: boolean
}

/**
 * @public
 */
export interface InviteSettings extends Configuration {
  expirationTime: number
  emailMask: string
  limit: number
}

/**
 * @public
 */
export const settingId = 'setting' as Plugin

export default plugin(settingId, {
  ids: {
    SettingApp: '' as Ref<Doc>,
    Profile: '' as Ref<Doc>,
    Password: '' as Ref<Doc>,
    Setting: '' as Ref<Doc>,
    Integrations: '' as Ref<Doc>,
    ManageTemplates: '' as Ref<Doc>,
    Support: '' as Ref<Doc>,
    Privacy: '' as Ref<Doc>,
    Terms: '' as Ref<Doc>,
    ClassSetting: '' as Ref<Doc>,
    Owners: '' as Ref<Doc>,
    InviteSettings: '' as Ref<Doc>
  },
  mixin: {
    Editable: '' as Ref<Mixin<Editable>>,
    UserMixin: '' as Ref<Mixin<UserMixin>>
  },
  space: {
    Setting: '' as Ref<Space>
  },
  class: {
    SettingsCategory: '' as Ref<Class<SettingsCategory>>,
    WorkspaceSettingCategory: '' as Ref<Class<SettingsCategory>>,
    Integration: '' as Ref<Class<Integration>>,
    IntegrationType: '' as Ref<Class<IntegrationType>>,
    InviteSettings: '' as Ref<Class<InviteSettings>>
  },
  component: {
    Settings: '' as AnyComponent,
    Profile: '' as AnyComponent,
    Password: '' as AnyComponent,
    WorkspaceSettings: '' as AnyComponent,
    Integrations: '' as AnyComponent,
    ManageTemplates: '' as AnyComponent,
    Support: '' as AnyComponent,
    Privacy: '' as AnyComponent,
    Terms: '' as AnyComponent,
    ClassSetting: '' as AnyComponent
  },
  string: {
    Settings: '' as IntlString,
    Setting: '' as IntlString,
    WorkspaceSetting: '' as IntlString,
    Integrations: '' as IntlString,
    ManageTemplates: '' as IntlString,
    Support: '' as IntlString,
    Privacy: '' as IntlString,
    Terms: '' as IntlString,
    Folders: '' as IntlString,
    Templates: '' as IntlString,
    Delete: '' as IntlString,
    Disconnect: '' as IntlString,
    Add: '' as IntlString,
    EditProfile: '' as IntlString,
    ChangePassword: '' as IntlString,
    CurrentPassword: '' as IntlString,
    NewPassword: '' as IntlString,
    Saving: '' as IntlString,
    Saved: '' as IntlString,
    EnterCurrentPassword: '' as IntlString,
    EnterNewPassword: '' as IntlString,
    RepeatNewPassword: '' as IntlString,
    Signout: '' as IntlString,
    InviteWorkspace: '' as IntlString,
    SelectWorkspace: '' as IntlString,
    Reconnect: '' as IntlString,
    ClassSetting: '' as IntlString,
    Owners: '' as IntlString,
    Configure: '' as IntlString
  },
  icon: {
    EditProfile: '' as Asset,
    Password: '' as Asset,
    Setting: '' as Asset,
    Integrations: '' as Asset,
    Support: '' as Asset,
    Privacy: '' as Asset,
    Terms: '' as Asset,
    Signout: '' as Asset,
    SelectWorkspace: '' as Asset,
    Clazz: '' as Asset,
    Enums: '' as Asset
  },
  templateFieldCategory: {
    Integration: '' as Ref<TemplateFieldCategory>
  },
  templateField: {
    OwnerFirstName: '' as Ref<TemplateField>,
    OwnerLastName: '' as Ref<TemplateField>,
    OwnerPosition: '' as Ref<TemplateField>,
    Value: '' as Ref<TemplateField>
  }
})
