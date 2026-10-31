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

import type { Data, Ref } from '@hcengineering/core'
import type { TaskType } from '@hcengineering/task'
import type { Issue, IssueTemplate, IssueTemplateData, Project } from '@hcengineering/tracker'

/**
 * Build the data of a copy of an issue template for another project.
 *
 * Components and milestones belong to the source project, so they are cleared when the
 * target project differs. A task type is kept only if the target project type provides it.
 * Assignees are preserved, matching the template editor which also offers non-members.
 * This does not change membership or access. Null parent assignments can use the target
 * project's default assignee when an issue is subsequently created from the template.
 * Child templates get fresh ids, comments and attachments are not copied.
 * Template relations are one-sided references: CreateIssueTemplate writes only the template,
 * and RelatedIssueTemplates queries its relations array to find the reverse view. Keep them
 * so copies appear there too; no far-side update is needed (unlike issue-to-issue relations).
 */
export function makeIssueTemplateCopy (
  template: IssueTemplate,
  targetProject: Ref<Project>,
  targetTaskTypes: Array<Ref<TaskType>>,
  newChildId: () => Ref<Issue>
): Data<IssueTemplate> {
  const sameProject = template.space === targetProject

  function copyData<T extends IssueTemplateData> (data: T): T {
    return {
      ...data,
      labels: data.labels !== undefined ? [...data.labels] : undefined,
      component: sameProject ? data.component : null,
      milestone: sameProject ? data.milestone : null,
      kind: data.kind !== undefined && targetTaskTypes.includes(data.kind) ? data.kind : undefined
    }
  }

  return {
    ...copyData({
      title: template.title,
      description: template.description,
      priority: template.priority,
      assignee: template.assignee,
      component: template.component,
      milestone: template.milestone,
      estimation: template.estimation,
      labels: template.labels,
      kind: template.kind
    }),
    children: template.children.map((child) => ({ ...copyData(child), id: newChildId() })),
    comments: 0,
    attachments: 0,
    relations: [...(template.relations ?? [])]
  }
}
