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

import activity from '@hcengineering/activity'
import contact from '@hcengineering/contact'
import { AccountRole, DOMAIN_MODEL, type Blob, type Domain, type Ref, type AccountUuid } from '@hcengineering/core'
import { Mixin, Model, type Builder, UX } from '@hcengineering/model'
import core, { TClass, TConfiguration, TDoc } from '@hcengineering/model-core'
import view, { createAction } from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import type { Asset, IntlString } from '@hcengineering/platform'
import {
  settingId,
  type Editable,
  type Handler,
  type Integration,
  type IntegrationType,
  type InviteSettings,
  type SettingsCategory,
  type SpaceTypeCreator,
  type SpaceTypeEditor,
  type SpaceTypeEditorSection,
  type UserMixin,
  type WorkspaceSetting
} from '@hcengineering/setting'
import templates from '@hcengineering/templates'
import setting from './plugin'

import workbench, { WidgetType } from '@hcengineering/model-workbench'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export { settingId } from '@hcengineering/setting'
export { settingOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_SETTING = 'setting' as Domain

@Model(setting.class.Integration, core.class.Doc, DOMAIN_SETTING)
@UX(setting.string.Integrations)
export class TIntegration extends TDoc implements Integration {
  type!: Ref<IntegrationType>
  disabled!: boolean
  value!: string
  shared!: AccountUuid[]
  error?: IntlString | null
}
@Model(setting.class.SettingsCategory, core.class.Doc, DOMAIN_MODEL)
export class TSettingsCategory extends TDoc implements SettingsCategory {
  name!: string
  label!: IntlString
  icon!: Asset
  component!: AnyComponent
  role!: AccountRole
  adminOnly?: boolean
}

@Model(setting.class.WorkspaceSettingCategory, core.class.Doc, DOMAIN_MODEL)
export class TWorkspaceSettingCategory extends TDoc implements SettingsCategory {
  name!: string
  label!: IntlString
  icon!: Asset
  component!: AnyComponent
  role!: AccountRole
}

@Model(setting.class.IntegrationType, core.class.Doc, DOMAIN_MODEL)
export class TIntegrationType extends TDoc implements IntegrationType {
  label!: IntlString
  description!: IntlString
  icon!: AnyComponent
  allowMultiple!: boolean
  createComponent!: AnyComponent
  reconnectComponent?: AnyComponent
  onDisconnect!: Handler
  configureComponent?: AnyComponent
}

@Mixin(setting.mixin.Editable, core.class.Class)
export class TEditable extends TClass implements Editable {
  value!: boolean
}

@Mixin(setting.mixin.UserMixin, core.class.Class)
export class TUserMixin extends TClass implements UserMixin {}

@Model(setting.class.InviteSettings, core.class.Configuration, DOMAIN_SETTING)
@UX(setting.string.InviteSettings)
export class TInviteSettings extends TConfiguration implements InviteSettings {
  expirationTime!: number
  emailMask!: string
  limit!: number
}

@Model(setting.class.WorkspaceSetting, core.class.Doc, DOMAIN_SETTING)
export class TWorkspaceSetting extends TDoc implements WorkspaceSetting {
  icon?: Ref<Blob>
}

@Mixin(setting.mixin.SpaceTypeEditor, core.class.Class)
export class TSpaceTypeEditor extends TClass implements SpaceTypeEditor {
  sections!: SpaceTypeEditorSection[]
  subEditors?: Record<string, AnyComponent>
}

@Mixin(setting.mixin.SpaceTypeCreator, core.class.Class)
export class TSpaceTypeCreator extends TClass implements SpaceTypeCreator {
  extraComponent!: AnyComponent
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TIntegration,
    TIntegrationType,
    TSettingsCategory,
    TWorkspaceSettingCategory,
    TEditable,
    TUserMixin,
    TInviteSettings,
    TWorkspaceSetting,
    TSpaceTypeEditor,
    TSpaceTypeCreator
  )

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: setting.string.Settings,
      type: WidgetType.Flexible,
      icon: setting.icon.Setting,
      component: setting.component.SettingsWidget
    },
    setting.ids.SettingsWidget
  )

  builder.mixin(setting.class.Integration, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['modifiedBy']
  })

  builder.mixin(setting.class.Integration, core.class.Class, view.mixin.ObjectPanel, {
    component: setting.component.IntegrationPanel
  })

  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'profile',
      label: setting.string.AccountSettings,
      icon: setting.icon.AccountSettings,
      component: setting.component.Profile,
      group: 'settings-account',
      role: AccountRole.Guest,
      order: 0
    },
    setting.ids.Profile
  )

  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'password',
      label: setting.string.ChangePassword,
      icon: setting.icon.Password,
      component: setting.component.Password,
      group: 'settings-account',
      role: AccountRole.Guest,
      order: 1000
    },
    setting.ids.Password
  )
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'setting',
      label: setting.string.WorkspaceSettings,
      icon: setting.icon.Setting,
      component: setting.component.WorkspaceSettings,
      extraComponents: {
        navigation: setting.component.WorkspaceSettings
      },
      group: 'settings',
      role: AccountRole.User,
      order: 2000
    },
    setting.ids.Setting
  )
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'integrations',
      label: setting.string.Integrations,
      icon: setting.icon.Integrations,
      component: setting.component.Integrations,
      group: 'settings-account',
      role: AccountRole.User,
      order: 1500
    },
    setting.ids.Integrations
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'general',
      label: setting.string.General,
      icon: setting.icon.Setting,
      component: setting.component.General,
      order: 900,
      role: AccountRole.Owner
    },
    setting.ids.General
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'backup',
      label: setting.string.Backup,
      icon: setting.icon.Setting,
      component: setting.component.Backup,
      order: 950,
      role: AccountRole.Owner
    },
    setting.ids.Backup
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'owners',
      label: setting.string.Owners,
      icon: setting.icon.Owners,
      component: setting.component.Owners,
      order: 1000,
      role: AccountRole.Maintainer
    },
    setting.ids.Owners
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'allSpaces',
      label: setting.string.Spaces,
      icon: setting.icon.Views,
      component: setting.component.Spaces,
      order: 1100,
      role: AccountRole.Maintainer
    },
    setting.ids.Spaces
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'configuration',
      label: setting.string.Configure,
      icon: setting.icon.Setting,
      component: setting.component.Configure,
      order: 1200,
      role: AccountRole.Owner,
      adminOnly: true
    },
    setting.ids.Configure
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'classes',
      label: setting.string.Classes,
      icon: setting.icon.Clazz,
      component: setting.component.ClassSetting,
      group: 'settings-editor',
      role: AccountRole.Maintainer,
      order: 4500
    },
    setting.ids.ClassSetting
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'relation',
      label: core.string.Relations,
      icon: setting.icon.Relations,
      component: setting.component.RelationSetting,
      group: 'settings-editor',
      role: AccountRole.Maintainer,
      order: 4501
    },
    setting.ids.Relations
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'enums',
      label: setting.string.Enums,
      icon: setting.icon.Enums,
      component: setting.component.EnumSetting,
      group: 'settings-editor',
      role: AccountRole.User,
      order: 4600,
      expandable: true
    },
    setting.ids.EnumSetting
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'invites',
      label: setting.string.InviteSettings,
      icon: setting.icon.InviteSettings,
      component: setting.component.InviteSetting,
      group: 'settings-editor',
      role: AccountRole.Maintainer,
      order: 4700
    },
    setting.ids.InviteSettings
  )
  // Currently remove Support item from settings
  // builder.createDoc(
  //   setting.class.SettingsCategory,
  //   core.space.Model,
  //   {
  //     name: 'support',
  //     label: setting.string.Support,
  //     icon: setting.icon.Support,
  //     component: setting.component.Support,
  //     group: 'main',
  //     secured: false,
  //     order: 5000
  //   },
  //   setting.ids.Support
  // )
  // builder.createDoc(
  //   setting.class.SettingsCategory,
  //   core.space.Model,
  //   {
  //     name: 'privacy',
  //     label: setting.string.Privacy,
  //     icon: setting.icon.Privacy,
  //     component: setting.component.Privacy,
  //     group: 'main',
  //     secured: false,
  //     order: 6000
  //   },
  //   setting.ids.Privacy
  // )
  // builder.createDoc(
  //   setting.class.SettingsCategory,
  //   core.space.Model,
  //   {
  //     name: 'terms',
  //     label: setting.string.Terms,
  //     icon: setting.icon.Terms,
  //     component: setting.component.Terms,
  //     group: 'main',
  //     secured: false,
  //     order: 10000
  //   },
  //   setting.ids.Terms
  // )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: setting.string.Setting,
      icon: setting.icon.Setting,
      alias: settingId,
      hidden: true,
      component: setting.component.Settings
    },
    setting.ids.SettingApp
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: setting.class.Integration,
      icon: setting.icon.Integrations,
      label: setting.string.IntegrationWith,
      action: 'update',
      hideIfRemoved: true
    },
    setting.ids.UpdateIntegrationActivityViewlet
  )

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.StringTypeEditor
  })

  builder.mixin(core.class.TypeHyperlink, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.HyperlinkTypeEditor
  })

  builder.mixin(core.class.TypeBoolean, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.BooleanTypeEditor
  })

  builder.mixin(core.class.TypeDate, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.DateTypeEditor
  })

  builder.mixin(core.class.TypeNumber, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.NumberTypeEditor
  })

  builder.mixin(core.class.RefTo, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.RefEditor
  })

  builder.mixin(core.class.EnumOf, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.EnumTypeEditor
  })

  builder.mixin(core.class.ArrOf, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.ArrayEditor
  })

  builder.mixin(core.class.Class, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, view.action.Open]
  })
  builder.mixin(core.class.Attribute, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: setting.component.CreateMixin,
        fillProps: {
          _object: 'value'
        }
      },
      label: setting.string.CreateMixin,
      input: 'focus',
      icon: view.icon.Pin,
      category: setting.category.Settings,
      target: core.class.Class,
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    setting.action.CreateMixin
  )

  createAction(
    builder,
    {
      action: setting.actionImpl.DeleteMixin,
      label: view.string.Delete,
      icon: view.icon.Delete,
      keyBinding: ['Meta + Backspace'],
      category: view.category.General,
      input: 'any',
      target: setting.mixin.UserMixin,
      context: { mode: ['context', 'browser'], group: 'remove' }
    },
    setting.action.DeleteMixin
  )

  // builder.mixin(core.class.Space, core.class.Class, setting.mixin.Editable, {})

  createAction(builder, {
    action: view.actionImpl.UpdateDocument,
    actionProps: {
      key: 'hidden',
      value: true
    },
    query: {
      hidden: { $in: [false, undefined, null] }
    },
    label: setting.string.HideAttribute,
    input: 'any',
    icon: view.icon.EyeCrossed,
    category: setting.category.Settings,
    target: core.class.Attribute,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  createAction(builder, {
    action: view.actionImpl.UpdateDocument,
    actionProps: {
      key: 'hidden',
      value: false
    },
    query: {
      hidden: true
    },
    label: setting.string.ShowAttribute,
    input: 'any',
    icon: view.icon.Eye,
    category: setting.category.Settings,
    target: core.class.Attribute,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  builder.createDoc(
    templates.class.TemplateFieldCategory,
    core.space.Model,
    {
      label: setting.string.Integrations
    },
    setting.templateFieldCategory.Integration
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: setting.string.Value,
      category: setting.templateFieldCategory.Integration,
      func: setting.function.GetValue
    },
    setting.templateField.Value
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: setting.string.OwnerFirstName,
      category: setting.templateFieldCategory.Integration,
      func: setting.function.GetOwnerFirstName
    },
    setting.templateField.OwnerFirstName
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: setting.string.OwnerLastName,
      category: setting.templateFieldCategory.Integration,
      func: setting.function.GetOwnerLastName
    },
    setting.templateField.OwnerLastName
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: contact.string.Position,
      category: setting.templateFieldCategory.Integration,
      func: setting.function.GetOwnerPosition
    },
    setting.templateField.OwnerPosition
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: setting.string.Setting,
      icon: setting.icon.Setting
    },
    setting.ids.SettingNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: setting.string.IntegrationDisabledSetting,
      group: setting.ids.SettingNotificationGroup,
      field: 'disabled',
      txClasses: [core.class.TxUpdateDoc],
      txMatch: {
        'operations.disabled': true
      },
      objectClass: setting.class.Integration,
      allowedForAuthor: true,
      templates: {
        textTemplate: 'Integration with {doc} was disabled',
        htmlTemplate: '<p>Integration with {doc} was disabled</p>',
        subjectTemplate: 'Integration with {doc} was disabled'
      },
      defaultEnabled: true
    },
    setting.ids.IntegrationDisabledNotification
  )

  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'spaceTypes',
      label: setting.string.SpaceTypes,
      icon: setting.icon.Privacy, // TODO: update icon. Where is it displayed?
      component: setting.component.ManageSpaceTypeContent,
      extraComponents: {
        navigation: setting.component.ManageSpaceTypes,
        tools: setting.component.ManageSpaceTypesTools
      },
      group: 'settings-editor',
      role: AccountRole.User,
      order: 6000,
      expandable: true
    },
    setting.ids.ManageSpaces
  )

  builder.mixin(core.class.SpaceType, core.class.Class, setting.mixin.SpaceTypeEditor, {
    sections: [
      {
        id: 'general',
        label: setting.string.General,
        component: setting.component.SpaceTypeGeneralSectionEditor,
        withoutContainer: true
      },
      {
        id: 'properties',
        label: setting.string.Properties,
        component: setting.component.SpaceTypePropertiesSectionEditor,
        withoutContainer: true
      },
      {
        id: 'roles',
        label: setting.string.Roles,
        component: setting.component.SpaceTypeRolesSectionEditor
      }
    ],
    subEditors: {
      roles: setting.component.RoleEditor
    }
  })

  builder.mixin(core.class.SpaceTypeDescriptor, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: setting.component.SpaceTypeDescriptorPresenter
  })

  builder.mixin(core.class.Permission, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: setting.component.PermissionPresenter
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_SETTING,
    disabled: [{ modifiedOn: 1 }, { modifiedBy: 1 }, { createdOn: 1 }, { space: 1 }]
  })
}
