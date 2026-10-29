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

export interface IssueTemplateCopyFailure {
  template: IssueTemplate
  error: unknown
}

export interface IssueTemplateCopyResult {
  copied: IssueTemplate[]
  failed: IssueTemplateCopyFailure[]
}

/** Revalidate once for the whole selection. Undefined means the target is no longer eligible. */
export async function submitIssueTemplateCopy (
  client: Pick<TxOperations, 'findOne' | 'findAll' | 'createDoc'>,
  templates: IssueTemplate[],
  targetProject: Ref<Project> | undefined,
  account: AccountUuid,
  newChildId: () => Ref<Issue>
): Promise<IssueTemplateCopyResult | undefined> {
  if (templates.length === 0 || targetProject === undefined || templates.some((it) => it.space === targetProject)) {
    return undefined
  }

  const project = await client.findOne(tracker.class.Project, {
    _id: targetProject,
    archived: false,
    members: account
  })
  if (project === undefined) return undefined

  const taskTypes = await client.findAll(task.class.TaskType, { parent: project.type })
  const targetTaskTypes = taskTypes.map((it) => it._id)
  const result: IssueTemplateCopyResult = { copied: [], failed: [] }
  for (const template of templates) {
    try {
      const data = makeIssueTemplateCopy(template, project._id, targetTaskTypes, newChildId)
      await client.createDoc(tracker.class.IssueTemplate, project._id, data)
      result.copied.push(template)
    } catch (error: unknown) {
      result.failed.push({ template, error })
    }
  }
  return result
}
