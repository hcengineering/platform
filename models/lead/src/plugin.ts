//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Ref } from '@hcengineering/core'
import { Funnel, leadId } from '@hcengineering/lead'
import lead from '@hcengineering/lead-resources/src/plugin'
import { NotificationGroup, NotificationType } from '@hcengineering/notification'
import type { IntlString } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import { KanbanTemplate } from '@hcengineering/task'
import type { AnyComponent } from '@hcengineering/ui'
import { Action, ActionCategory, Viewlet } from '@hcengineering/view'

export default mergeIds(leadId, lead, {
  string: {
    Funnel: '' as IntlString,
    Funnels: '' as IntlString,
    LeadApplication: '' as IntlString,
    Title: '' as IntlString,
    ManageFunnelStatuses: '' as IntlString,
    GotoLeadApplication: '' as IntlString,
    ConfigDescription: '' as IntlString,
    EditFunnel: '' as IntlString
  },
  component: {
    CreateLead: '' as AnyComponent,
    EditLead: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    LeadPresenter: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    Leads: '' as AnyComponent,
    NewItemsHeader: '' as AnyComponent
  },
  space: {
    DefaultFunnel: '' as Ref<Funnel>
  },
  template: {
    DefaultFunnel: '' as Ref<KanbanTemplate>
  },
  viewlet: {
    TableCustomer: '' as Ref<Viewlet>,
    TableLead: '' as Ref<Viewlet>,
    ListLead: '' as Ref<Viewlet>,
    DashboardLead: '' as Ref<Viewlet>,
    KanbanLead: '' as Ref<Viewlet>
  },
  category: {
    Lead: '' as Ref<ActionCategory>
  },
  action: {
    EditStatuses: '' as Ref<Action>,
    CreateGlobalLead: '' as Ref<Action>
  },
  ids: {
    LeadNotificationGroup: '' as Ref<NotificationGroup>,
    CustomerNotificationGroup: '' as Ref<NotificationGroup>,
    FunnelNotificationGroup: '' as Ref<NotificationGroup>,
    LeadCreateNotification: '' as Ref<NotificationType>,
    AssigneeNotification: '' as Ref<NotificationType>
  }
})
