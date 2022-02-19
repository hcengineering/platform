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

import task, { Issue } from '@anticrm/task'
import { Doc } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import workbench from '@anticrm/workbench'
import view from '@anticrm/view'

/**
 * @public
 */
export function issueHTMLPresenter (doc: Doc): string {
  const issue = doc as Issue
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbench.component.WorkbenchApp}/${task.app.Tasks}/${issue.space}/#${view.component.EditDoc}|${issue._id}|${issue._class}">Task-${issue.number}</a>`
}

/**
 * @public
 */
export function issueTextPresenter (doc: Doc): string {
  const issue = doc as Issue
  return `Task-${issue.number}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    IssueHTMLPresenter: issueHTMLPresenter,
    IssueTextPresenter: issueTextPresenter
  }
})
