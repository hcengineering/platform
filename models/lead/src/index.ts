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

// To help typescript locate view plugin properly
import type {} from '@anticrm/view'

import type { Contact } from '@anticrm/contact'
import type { Doc, Domain, FindOptions, Ref } from '@anticrm/core'
import { Builder, Model, Prop, TypeRef, TypeString, UX } from '@anticrm/model'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
import core, { TDocWithState, TSpaceWithStates } from '@anticrm/model-core'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type { IntlString } from '@anticrm/platform'
import type { Funnel, Lead } from '@anticrm/lead'
import { createKanban } from '@anticrm/lead'
import lead from './plugin'
import attachment from '@anticrm/model-attachment'

export const DOMAIN_LEAD = 'lead' as Domain

@Model(lead.class.Funnel, core.class.SpaceWithStates)
@UX(lead.string.Funnel, lead.icon.Funnel)
export class TFunnel extends TSpaceWithStates implements Funnel {}

@Model(lead.class.Lead, core.class.Doc, DOMAIN_LEAD, [core.interface.DocWithState])
@UX('Lead' as IntlString)
export class TLead extends TDocWithState implements Lead {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  @Prop(TypeRef(contact.class.Contact), lead.string.Customer)
  customer!: Ref<Contact>

  @Prop(TypeString(), 'Comments' as IntlString)
  comments?: number

  @Prop(TypeString(), 'Attachments' as IntlString)
  attachments?: number
}

export function createModel (builder: Builder): void {
  builder.createModel(TFunnel, TLead)

  builder.mixin(lead.class.Funnel, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: lead.class.Lead,
      createItemDialog: lead.component.CreateLead
    }
  })

  builder.createDoc(workbench.class.Application, core.space.Model, {
    label: lead.string.LeadApplication,
    icon: lead.icon.LeadApplication,
    hidden: false,
    navigatorModel: {
      spaces: [
        {
          label: lead.string.Funnels,
          spaceClass: lead.class.Funnel,
          addSpaceLabel: lead.string.CreateFunnel,
          createComponent: lead.component.CreateFunnel
        }
      ]
    }
  })
  builder.createDoc(lead.class.Funnel, core.space.Model, {
    name: 'Funnel',
    description: 'Default funnel',
    private: false,
    members: []
  }, lead.space.DefaultFunnel)

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.class.Lead,
    descriptor: view.viewlet.Table,
    open: lead.component.EditLead,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        customer: contact.class.Contact,
        state: core.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      '$lookup.customer',
      '$lookup.state',
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments' },
      'modifiedOn',
      '$lookup.customer.channels']
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.class.Lead,
    descriptor: view.viewlet.Kanban,
    open: lead.component.EditLead,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        customer: contact.class.Contact,
        state: core.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: ['$lookup.customer', '$lookup.state']
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.KanbanCard, {
    card: lead.component.KanbanCard
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ObjectEditor, {
    editor: lead.component.EditLead
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.AttributePresenter, {
    presenter: lead.component.LeadPresenter
  })

  builder.createDoc(view.class.Sequence, view.space.Sequence, {
    attachedTo: lead.class.Lead,
    sequence: 0
  })

  builder.createDoc(view.class.KanbanTemplateSpace, core.space.Model, {
    name: 'Funnels',
    description: 'Manage funnel statuses',
    members: [],
    private: false,
    icon: lead.component.TemplatesIcon
  }, lead.space.FunnelTemplates)

  createKanban(lead.space.DefaultFunnel, async (_class, space, data, id) => {
    builder.createDoc(_class, space, data, id)
    return await Promise.resolve()
  }).catch((err) => console.error(err))
}

export { default } from './plugin'
export { leadOperation } from './migration'
