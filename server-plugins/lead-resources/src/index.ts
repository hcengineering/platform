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

import { AccountRole, concatLink, Doc, systemAccountUuid, Tx } from '@hcengineering/core'
import lead, { Lead, leadId } from '@hcengineering/lead'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function leadHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const lead = doc as Lead
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.url}/${leadId}/${lead.space}/#${view.component.EditDoc}|${lead._id}|${lead._class}|content`
  const link = concatLink(front, path)
  return `<a href="${link}">${lead.title}</a>`
}

export async function OnEmployeeCreate (_txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  // Fill owner of default space with the very first owner account creating a social identity
  const account = control.ctx.contextData.account
  if (account.role !== AccountRole.Owner) return []

  const defaultSpace = (await control.findAll(control.ctx, lead.class.Funnel, { _id: lead.space.DefaultFunnel }))[0]

  if (defaultSpace === undefined) return []

  const owners = defaultSpace.owners ?? []

  if (owners.length === 0 || (owners.length === 1 && owners[0] === systemAccountUuid)) {
    const setOwnerTx = control.txFactory.createTxUpdateDoc(defaultSpace._class, defaultSpace.space, defaultSpace._id, {
      owners: [account.uuid]
    })

    return [setOwnerTx]
  }

  return []
}

/**
 * @public
 */
export async function leadTextPresenter (doc: Doc): Promise<string> {
  const lead = doc as Lead
  return `LEAD-${lead.number}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    LeadHTMLPresenter: leadHTMLPresenter,
    LeadTextPresenter: leadTextPresenter
  },
  trigger: {
    OnEmployeeCreate
  }
})
