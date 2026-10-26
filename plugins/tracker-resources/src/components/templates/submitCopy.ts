//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { AccountUuid, Ref, TxOperations } from '@hcengineering/core'
import task from '@hcengineering/task'
import tracker, { type Issue, type IssueTemplate, type Project } from '@hcengineering/tracker'
import { makeIssueTemplateCopy } from './copy'

/** Returns false when the selected target no longer matches the picker. Read/write failures propagate to the dialog. */
export async function submitIssueTemplateCopy (
  client: Pick<TxOperations, 'findOne' | 'findAll' | 'createDoc'>,
  template: IssueTemplate,
  targetProject: Ref<Project> | undefined,
  account: AccountUuid,
  newChildId: () => Ref<Issue>
): Promise<boolean> {
  if (targetProject === undefined || targetProject === template.space) return false

  const project = await client.findOne(tracker.class.Project, {
    _id: targetProject,
    archived: false,
    members: account
  })
  if (project === undefined) return false

  const taskTypes = await client.findAll(task.class.TaskType, { parent: project.type })
  const data = makeIssueTemplateCopy(
    template,
    project._id,
    taskTypes.map((it) => it._id),
    newChildId
  )
  await client.createDoc(tracker.class.IssueTemplate, project._id, data)
  return true
}
