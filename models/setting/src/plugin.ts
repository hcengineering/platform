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

import type { DocUpdateMessageViewlet } from '@hcengineering/activity'
import { type Doc, type Ref } from '@hcengineering/core'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { settingId } from '@hcengineering/setting'
import setting from '@hcengineering/setting-resources/src/plugin'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type Action, type ActionCategory, type ViewAction } from '@hcengineering/view'
import { type TemplateFieldFunc } from '@hcengineering/templates'
import { type NotificationGroup, type NotificationType } from '@hcengineering/notification'

export default mergeIds(settingId, setting, {
  ids: {
    EnumSetting: '' as Ref<Doc>,
    Configure: '' as Ref<Doc>,
    SettingNotificationGroup: '' as Ref<NotificationGroup>,
    IntegrationDisabledNotification: '' as Ref<NotificationType>,
    UpdateIntegrationActivityViewlet: '' as Ref<DocUpdateMessageViewlet>
  },
  component: {
    EnumSetting: '' as AnyComponent,
    StringTypeEditor: '' as AnyComponent,
    HyperlinkTypeEditor: '' as AnyComponent,
    BooleanTypeEditor: '' as AnyComponent,
    NumberTypeEditor: '' as AnyComponent,
    DateTypeEditor: '' as AnyComponent,
    RefEditor: '' as AnyComponent,
    AssociationEditor: '' as AnyComponent,
    EnumTypeEditor: '' as AnyComponent,
    General: '' as AnyComponent,
    Owners: '' as AnyComponent,
    CreateMixin: '' as AnyComponent,
    InviteSetting: '' as AnyComponent,
    ArrayEditor: '' as AnyComponent,
    IntegrationPanel: '' as AnyComponent,
    Configure: '' as AnyComponent,
    SettingsWidget: '' as AnyComponent
  },
  category: {
    Settings: '' as Ref<ActionCategory>
  },
  action: {
    CreateMixin: '' as Ref<Action<Doc, any>>,
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
