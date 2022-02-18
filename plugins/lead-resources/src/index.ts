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

import { getMetadata, Resources } from '@anticrm/platform'
import CreateFunnel from './components/CreateFunnel.svelte'
import CreateLead from './components/CreateLead.svelte'
import Customers from './components/Customers.svelte'
import EditLead from './components/EditLead.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import LeadPresenter from './components/LeadPresenter.svelte'
import LeadsPresenter from './components/LeadsPresenter.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import Leads from './components/Leads.svelte'
import { Lead } from '@anticrm/lead'
import { Doc } from '@anticrm/core'
import login from '@anticrm/login'
import workbench from '@anticrm/workbench'
import view from '@anticrm/view'
import leadP from './plugin'

function leadHTMLPresenter (doc: Doc): string {
  const lead = doc as Lead
  return `<a href="${getMetadata(login.metadata.FrontUrl)}/${workbench.component.WorkbenchApp}/${leadP.app.Lead}/${lead.space}/#${view.component.EditDoc}|${lead._id}|${lead._class}">${lead.title}</a>`
}

function leadTextPresenter (doc: Doc): string {
  const lead = doc as Lead
  return `${lead.title}`
}

export default async (): Promise<Resources> => ({
  function: {
    LeadHTMLPresenter: leadHTMLPresenter,
    LeadTextPresenter: leadTextPresenter
  },
  component: {
    CreateFunnel,
    CreateLead,
    EditLead,
    KanbanCard,
    LeadPresenter,
    TemplatesIcon,
    Customers,
    LeadsPresenter,
    Leads
  }
})
