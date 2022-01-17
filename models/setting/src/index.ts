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

import { Builder, Model } from '@anticrm/model'
import { Ref, Domain, DOMAIN_MODEL } from '@anticrm/core'
import core, { TDoc } from '@anticrm/model-core'
import setting from '@anticrm/setting'
import type { Integration, IntegrationType, Handler } from '@anticrm/setting'
import type { IntlString } from '@anticrm/platform'
import task from '@anticrm/task'

import workbench from '@anticrm/model-workbench'
import { AnyComponent } from '@anticrm/ui'

export const DOMAIN_SETTING = 'setting' as Domain

@Model(setting.class.Integration, core.class.Doc, DOMAIN_SETTING)
export class TIntegration extends TDoc implements Integration {
  type!: Ref<IntegrationType>
  value!: string
}

@Model(setting.class.IntegrationType, core.class.Doc, DOMAIN_MODEL)
export class TIntegrationType extends TDoc implements IntegrationType {
  label!: IntlString
  description!: IntlString
  icon!: AnyComponent
  createComponent!: AnyComponent
  onDisconnect!: Handler
}

export function createModel (builder: Builder): void {
  builder.createModel(TIntegration, TIntegrationType)

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: setting.string.Setting,
      icon: setting.icon.Setting,
      hidden: true,
      navigatorModel: {
        specials: [
          {
            id: 'profile',
            label: setting.string.EditProfile,
            icon: setting.icon.EditProfile,
            component: setting.component.Profile
          },
          {
            id: 'password',
            label: setting.string.ChangePassword,
            icon: setting.icon.Password,
            component: setting.component.Password
          },
          {
            id: 'setting',
            label: setting.string.Setting,
            icon: setting.icon.Setting,
            component: setting.component.Setting
          },
          {
            id: 'integrations',
            label: setting.string.Integrations,
            icon: setting.icon.Integrations,
            component: setting.component.Integrations
          },
          {
            id: 'statuses',
            label: setting.string.ManageStatuses,
            icon: task.icon.ManageStatuses,
            component: setting.component.ManageStatuses
          },
          {
            id: 'support',
            label: setting.string.Support,
            icon: setting.icon.Support,
            component: setting.component.Support
          },
          {
            id: 'privacy',
            label: setting.string.Privacy,
            icon: setting.icon.Privacy,
            component: setting.component.Privacy
          },
          {
            id: 'terms',
            label: setting.string.Terms,
            icon: setting.icon.Terms,
            component: setting.component.Terms
          }
        ],
        spaces: []
      }
    },
    setting.ids.SettingApp
  )
}
