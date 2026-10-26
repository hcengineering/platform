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

import type { Person } from '@hcengineering/contact'
import type { PersonId, Ref } from '@hcengineering/core'
import type { Issue, IssueTemplate, Project } from '@hcengineering/tracker'
import { makeIssueTemplateCopy } from '../components/templates/copy'

function template (): IssueTemplate {
  return {
    _id: 'template' as Ref<IssueTemplate>,
    _class: 'tracker:class:IssueTemplate' as IssueTemplate['_class'],
    space: 'source-project' as Ref<Project>,
    modifiedOn: 0,
    modifiedBy: 'author' as PersonId,
    title: 'Parent',
    description: '',
    priority: 0,
    assignee: 'parent-assignee' as Ref<Person>,
    component: null,
    estimation: 0,
    comments: 0,
    children: [
      {
        id: 'child' as Ref<Issue>,
        title: 'Child',
        description: '',
        priority: 0,
        assignee: 'child-assignee' as Ref<Person>,
        component: null,
        estimation: 0
      }
    ]
  }
}

describe('issue template copy assignees', () => {
  const targetProject = 'target-project' as Ref<Project>
  const newChildId = (): Ref<Issue> => 'copied-child' as Ref<Issue>

  it('preserves parent and child assignees when copying to another project', () => {
    const source = template()
    const data = makeIssueTemplateCopy(source, targetProject, [], newChildId)

    expect(data.assignee).toBe('parent-assignee')
    expect(data.children[0].assignee).toBe('child-assignee')
    expect(data.children[0].id).toBe('copied-child')

    data.assignee = null
    data.children[0].assignee = null
    expect(source.assignee).toBe('parent-assignee')
    expect(source.children[0].assignee).toBe('child-assignee')
    expect(source.children[0].id).toBe('child')
  })

  it('keeps unassigned templates and children unassigned', () => {
    const source = template()
    source.assignee = null
    source.children[0].assignee = null

    const data = makeIssueTemplateCopy(source, targetProject, [], newChildId)

    expect(data.assignee).toBeNull()
    expect(data.children[0].assignee).toBeNull()
  })
})
