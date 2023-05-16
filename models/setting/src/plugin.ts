//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type { TxViewlet } from '@hcengineering/activity'
import { Doc, Ref } from '@hcengineering/core'
import { IntlString, mergeIds, Resource } from '@hcengineering/platform'
import { settingId } from '@hcengineering/setting'
import setting from '@hcengineering/setting-resources/src/plugin'
import { AnyComponent } from '@hcengineering/ui'
import { Action, ActionCategory, ViewAction } from '@hcengineering/view'
import { TemplateFieldFunc } from '@hcengineering/templates'
import { NotificationGroup, NotificationType } from '@hcengineering/notification'

export default mergeIds(settingId, setting, {
  activity: {
    TxIntegrationDisable: '' as AnyComponent
  },
  ids: {
    TxIntegrationDisable: '' as Ref<TxViewlet>,
    EnumSetting: '' as Ref<Doc>,
    Configure: '' as Ref<Doc>,
    SettingNotificationGroup: '' as Ref<NotificationGroup>,
    IntegrationDisabledNotification: '' as Ref<NotificationType>
  },
  component: {
    EnumSetting: '' as AnyComponent,
    StringTypeEditor: '' as AnyComponent,
    HyperlinkTypeEditor: '' as AnyComponent,
    BooleanTypeEditor: '' as AnyComponent,
    NumberTypeEditor: '' as AnyComponent,
    DateTypeEditor: '' as AnyComponent,
    RefEditor: '' as AnyComponent,
    EnumTypeEditor: '' as AnyComponent,
    Owners: '' as AnyComponent,
    CreateMixin: '' as AnyComponent,
    InviteSetting: '' as AnyComponent,
    ArrayEditor: '' as AnyComponent,
    IntegrationPanel: '' as AnyComponent,
    Configure: '' as AnyComponent
  },
  category: {
    Settings: '' as Ref<ActionCategory>
  },
  action: {
    DeleteMixin: '' as Ref<Action>
  },
  actionImpl: {
    DeleteMixin: '' as ViewAction<Record<string, any>>
  },
  string: {
    Value: '' as IntlString
  },
  function: {
    GetValue: '' as Resource<TemplateFieldFunc>,
    GetOwnerFirstName: '' as Resource<TemplateFieldFunc>,
    GetOwnerLastName: '' as Resource<TemplateFieldFunc>,
    GetOwnerPosition: '' as Resource<TemplateFieldFunc>
  }
})
