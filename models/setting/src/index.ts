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
import { Account, Domain, DOMAIN_MODEL, Ref } from '@hcengineering/core'
import { Builder, Mixin, Model } from '@hcengineering/model'
import core, { TClass, TConfiguration, TDoc } from '@hcengineering/model-core'
import view, { createAction } from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import type { Asset, IntlString } from '@hcengineering/platform'
import {
  Editable,
  Handler,
  Integration,
  IntegrationType,
  InviteSettings,
  settingId,
  SettingsCategory,
  UserMixin
} from '@hcengineering/setting'
import task from '@hcengineering/task'
import templates from '@hcengineering/templates'
import setting from './plugin'

import workbench from '@hcengineering/model-workbench'
import { AnyComponent } from '@hcengineering/ui'

export { settingId } from '@hcengineering/setting'
export { default } from './plugin'
export { settingOperation } from './migration'

export const DOMAIN_SETTING = 'setting' as Domain

@Model(setting.class.Integration, core.class.Doc, DOMAIN_SETTING)
export class TIntegration extends TDoc implements Integration {
  type!: Ref<IntegrationType>
  disabled!: boolean
  value!: string
  shared!: Ref<Account>[]
  error?: IntlString | null
}
@Model(setting.class.SettingsCategory, core.class.Doc, DOMAIN_MODEL)
export class TSettingsCategory extends TDoc implements SettingsCategory {
  name!: string
  label!: IntlString
  icon!: Asset
  component!: AnyComponent
  secured!: boolean
}

@Model(setting.class.WorkspaceSettingCategory, core.class.Doc, DOMAIN_MODEL)
export class TWorkspaceSettingCategory extends TDoc implements SettingsCategory {
  name!: string
  label!: IntlString
  icon!: Asset
  component!: AnyComponent
  secured!: boolean
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
export class TInviteSettings extends TConfiguration implements InviteSettings {
  expirationTime!: number
  emailMask!: string
  limit!: number
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TIntegration,
    TIntegrationType,
    TSettingsCategory,
    TWorkspaceSettingCategory,
    TEditable,
    TUserMixin,
    TInviteSettings
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
      label: setting.string.EditProfile,
      icon: setting.icon.EditProfile,
      component: setting.component.Profile,
      group: 'settings-account',
      secured: false,
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
      secured: false,
      order: 1000
    },
    setting.ids.Password
  )
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'setting',
      label: setting.string.WorkspaceSetting,
      icon: setting.icon.Setting,
      component: setting.component.WorkspaceSettings,
      group: 'settings',
      secured: false,
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
      group: 'settings',
      secured: false,
      order: 3000
    },
    setting.ids.Integrations
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'owners',
      label: setting.string.Owners,
      icon: setting.icon.Password,
      component: setting.component.Owners,
      order: 1000,
      secured: true
    },
    setting.ids.Owners
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'configuration',
      label: setting.string.Configure,
      icon: setting.icon.Setting,
      component: setting.component.Configure,
      order: 1001,
      secured: true
    },
    setting.ids.Configure
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'statuses',
      label: setting.string.ManageTemplates,
      icon: task.icon.ManageTemplates,
      component: setting.component.ManageTemplates,
      group: 'settings-editor',
      secured: false,
      order: 4000
    },
    setting.ids.ManageTemplates
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'classes',
      label: setting.string.ClassSetting,
      icon: setting.icon.Clazz,
      component: setting.component.ClassSetting,
      group: 'settings-editor',
      secured: false,
      order: 4500
    },
    setting.ids.ClassSetting
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
      secured: false,
      order: 4600
    },
    setting.ids.EnumSetting
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'invites',
      label: setting.string.InviteSettings,
      icon: setting.icon.Setting,
      component: setting.component.InviteSetting,
      group: 'settings-editor',
      secured: true,
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
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: setting.class.Integration,
      icon: setting.icon.Integrations,
      txClass: core.class.TxUpdateDoc,
      label: setting.string.IntegrationWith,
      labelComponent: setting.activity.TxIntegrationDisable,
      display: 'inline',
      editable: false,
      hideOnRemove: true
    },
    setting.ids.TxIntegrationDisable
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

  createAction(builder, {
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
  })

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
    icon: view.icon.Setting,
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
    icon: view.icon.Setting,
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
      providers: {
        [notification.providers.PlatformNotification]: true,
        [notification.providers.EmailNotification]: true
      }
    },
    setting.ids.IntegrationDisabledNotification
  )
}
