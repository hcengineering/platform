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

import type { PersonId, AccountRole, Blob, Class, Configuration, Doc, Mixin, Ref, AccountUuid } from '@hcengineering/core'
import type { Metadata, Plugin } from '@hcengineering/platform'
import { Asset, IntlString, Resource, plugin } from '@hcengineering/platform'
import { TemplateField, TemplateFieldCategory } from '@hcengineering/templates'
import { AnyComponent } from '@hcengineering/ui'

import { SpaceTypeCreator, SpaceTypeEditor } from './spaceTypeEditor'

export * from './spaceTypeEditor'
export * from './utils'
export * from './analytics'

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
  descriptionComponent?: AnyComponent
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
  shared?: AccountUuid[]
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
  props?: Record<string, any>

  // If defined, will pass kind with key to component
  extraComponents?: Record<string, AnyComponent>

  group?: string

  // If defined, will sort using order.
  order?: number
  role: AccountRole

  expandable?: boolean
  adminOnly?: boolean
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
export interface WorkspaceSetting extends Doc {
  icon?: Ref<Blob> | null
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
    Relations: '' as Ref<Doc>,
    Support: '' as Ref<Doc>,
    Privacy: '' as Ref<Doc>,
    Terms: '' as Ref<Doc>,
    ClassSetting: '' as Ref<Doc>,
    General: '' as Ref<Doc>,
    Owners: '' as Ref<Doc>,
    InviteSettings: '' as Ref<Doc>,
    WorkspaceSetting: '' as Ref<Doc>,
    ManageSpaces: '' as Ref<Doc>,
    Spaces: '' as Ref<Doc>,
    Backup: '' as Ref<Doc>
  },
  mixin: {
    Editable: '' as Ref<Mixin<Editable>>,
    UserMixin: '' as Ref<Mixin<UserMixin>>,
    SpaceTypeEditor: '' as Ref<Mixin<SpaceTypeEditor>>,
    SpaceTypeCreator: '' as Ref<Mixin<SpaceTypeCreator>>
  },
  class: {
    SettingsCategory: '' as Ref<Class<SettingsCategory>>,
    WorkspaceSettingCategory: '' as Ref<Class<SettingsCategory>>,
    Integration: '' as Ref<Class<Integration>>,
    IntegrationType: '' as Ref<Class<IntegrationType>>,
    InviteSettings: '' as Ref<Class<InviteSettings>>,
    WorkspaceSetting: '' as Ref<Class<WorkspaceSetting>>
  },
  component: {
    Settings: '' as AnyComponent,
    Profile: '' as AnyComponent,
    Password: '' as AnyComponent,
    WorkspaceSettings: '' as AnyComponent,
    Integrations: '' as AnyComponent,
    Support: '' as AnyComponent,
    Privacy: '' as AnyComponent,
    Terms: '' as AnyComponent,
    ClassSetting: '' as AnyComponent,
    PermissionPresenter: '' as AnyComponent,
    SpaceTypeDescriptorPresenter: '' as AnyComponent,
    SpaceTypeGeneralSectionEditor: '' as AnyComponent,
    SpaceTypePropertiesSectionEditor: '' as AnyComponent,
    SpaceTypeRolesSectionEditor: '' as AnyComponent,
    RoleEditor: '' as AnyComponent,
    RoleAssignmentEditor: '' as AnyComponent,
    RelationSetting: '' as AnyComponent,
    Backup: '' as AnyComponent,
    CreateAttributePopup: '' as AnyComponent,
    CreateRelation: '' as AnyComponent,
    EditRelation: '' as AnyComponent
  },
  string: {
    Settings: '' as IntlString,
    Setting: '' as IntlString,
    Spaces: '' as IntlString,
    WorkspaceSettings: '' as IntlString,
    Integrations: '' as IntlString,
    Support: '' as IntlString,
    Privacy: '' as IntlString,
    Terms: '' as IntlString,
    Categories: '' as IntlString,
    Delete: '' as IntlString,
    Disconnect: '' as IntlString,
    Add: '' as IntlString,
    AccountSettings: '' as IntlString,
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
    Classes: '' as IntlString,
    Owners: '' as IntlString,
    Configure: '' as IntlString,
    InviteSettings: '' as IntlString,
    General: '' as IntlString,
    Properties: '' as IntlString,
    TaskTypes: '' as IntlString,
    Automations: '' as IntlString,
    Collections: '' as IntlString,
    SpaceTypes: '' as IntlString,
    Roles: '' as IntlString,
    OwnerOrMaintainerRequired: '' as IntlString,
    Backup: '' as IntlString,
    BackupLast: '' as IntlString,
    BackupTotalSnapshots: '' as IntlString,
    BackupTotalFiles: '' as IntlString,
    BackupSize: '' as IntlString,
    BackupLinkInfo: '' as IntlString,
    BackupBearerTokenInfo: '' as IntlString,
    BackupSnapshots: '' as IntlString,
    BackupFileDownload: '' as IntlString,
    BackupFiles: '' as IntlString,
    BackupNoBackup: '' as IntlString,
    AddAttribute: '' as IntlString
  },
  icon: {
    AccountSettings: '' as Asset,
    Owners: '' as Asset,
    Password: '' as Asset,
    Setting: '' as Asset,
    Integrations: '' as Asset,
    Support: '' as Asset,
    Privacy: '' as Asset,
    Terms: '' as Asset,
    Signout: '' as Asset,
    SelectWorkspace: '' as Asset,
    Clazz: '' as Asset,
    Enums: '' as Asset,
    InviteSettings: '' as Asset,
    InviteWorkspace: '' as Asset,
    Views: '' as Asset,
    Relations: '' as Asset
  },
  templateFieldCategory: {
    Integration: '' as Ref<TemplateFieldCategory>
  },
  templateField: {
    OwnerFirstName: '' as Ref<TemplateField>,
    OwnerLastName: '' as Ref<TemplateField>,
    OwnerPosition: '' as Ref<TemplateField>,
    Value: '' as Ref<TemplateField>
  },
  metadata: {
    BackupUrl: '' as Metadata<string>
  }
})
