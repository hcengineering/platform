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

import { Doc } from '@anticrm/core'
import { leadId, Lead } from '@anticrm/lead'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import view from '@anticrm/view'
import { workbenchId } from '@anticrm/workbench'

/**
 * @public
 */
export function leadHTMLPresenter (doc: Doc): string {
  const lead = doc as Lead
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${leadId}/${lead.space}/#${view.component.EditDoc}|${lead._id}|${lead._class}">${lead.title}</a>`
}

/**
 * @public
 */
export function leadTextPresenter (doc: Doc): string {
  const lead = doc as Lead
  return `${lead.title}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    LeadHTMLPresenter: leadHTMLPresenter,
    LeadTextPresenter: leadTextPresenter
  }
})
