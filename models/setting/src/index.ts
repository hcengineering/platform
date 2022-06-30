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

import { Builder, Mixin, Model } from '@anticrm/model'
import { Ref, Domain, DOMAIN_MODEL } from '@anticrm/core'
import core, { TClass, TDoc } from '@anticrm/model-core'
import setting from './plugin'
import { Editable, Integration, IntegrationType, Handler, SettingsCategory, settingId } from '@anticrm/setting'
import type { Asset, IntlString } from '@anticrm/platform'
import task from '@anticrm/task'
import activity from '@anticrm/activity'
import view from '@anticrm/view'

import workbench from '@anticrm/model-workbench'
import { AnyComponent } from '@anticrm/ui'

export const DOMAIN_SETTING = 'setting' as Domain

@Model(setting.class.Integration, core.class.Doc, DOMAIN_SETTING)
export class TIntegration extends TDoc implements Integration {
  type!: Ref<IntegrationType>
  disabled!: boolean
  value!: string
}
@Model(setting.class.SettingsCategory, core.class.Doc, DOMAIN_MODEL)
export class TSettingsCategory extends TDoc implements SettingsCategory {
  name!: string
  label!: IntlString
  icon!: Asset
  component!: AnyComponent
}

@Model(setting.class.WorkspaceSettingCategory, core.class.Doc, DOMAIN_MODEL)
export class TWorkspaceSettingCategory extends TDoc implements SettingsCategory {
  name!: string
  label!: IntlString
  icon!: Asset
  component!: AnyComponent
}

@Model(setting.class.IntegrationType, core.class.Doc, DOMAIN_MODEL)
export class TIntegrationType extends TDoc implements IntegrationType {
  label!: IntlString
  description!: IntlString
  icon!: AnyComponent
  createComponent!: AnyComponent
  reconnectComponent?: AnyComponent
  onDisconnect!: Handler
}

@Mixin(setting.mixin.Editable, core.class.Class)
export class TEditable extends TClass implements Editable {}

export function createModel (builder: Builder): void {
  builder.createModel(TIntegration, TIntegrationType, TSettingsCategory, TWorkspaceSettingCategory, TEditable)

  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'profile',
      label: setting.string.EditProfile,
      icon: setting.icon.EditProfile,
      component: setting.component.Profile,
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
      order: 1000
    },
    setting.ids.Password
  )
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'setting',
      label: setting.string.Setting,
      icon: setting.icon.Setting,
      component: setting.component.WorkspaceSettings,
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
      order: 3000
    },
    setting.ids.Integrations
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'statuses',
      label: setting.string.ManageStatuses,
      icon: task.icon.ManageStatuses,
      component: setting.component.ManageStatuses,
      order: 4000
    },
    setting.ids.ManageStatuses
  )
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'classes',
      label: setting.string.ClassSetting,
      icon: setting.icon.Setting,
      component: setting.component.ClassSetting,
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
      icon: setting.icon.Setting,
      component: setting.component.EnumSetting,
      order: 4600
    },
    setting.ids.EnumSetting
  )
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'support',
      label: setting.string.Support,
      icon: setting.icon.Support,
      component: setting.component.Support,
      order: 5000
    },
    setting.ids.Support
  )
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'privacy',
      label: setting.string.Privacy,
      icon: setting.icon.Privacy,
      component: setting.component.Privacy,
      order: 6000
    },
    setting.ids.Privacy
  )
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'terms',
      label: setting.string.Terms,
      icon: setting.icon.Terms,
      component: setting.component.Terms,
      order: 10000
    },
    setting.ids.Terms
  )

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
      component: setting.activity.TxIntegrationDisableReconnect,
      display: 'emphasized',
      editable: false,
      hideOnRemove: true
    },
    setting.ids.TxIntegrationDisable
  )

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.ObjectEditor, {
    editor: setting.component.StringTypeEditor
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
}

export { settingOperation } from './migration'
