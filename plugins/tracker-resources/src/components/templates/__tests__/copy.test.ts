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

import type { IssueTemplate } from '@hcengineering/tracker'
import { makeIssueTemplateCopy } from '../copy'

function template (): IssueTemplate {
  return {
    _id: 'tmpl-1' as any,
    _class: 'tracker:class:IssueTemplate' as any,
    space: 'project-1' as any,
    modifiedOn: 0,
    modifiedBy: 'user' as any,
    title: 'Release',
    description: '<p>Steps</p>',
    priority: 2,
    assignee: 'person-1' as any,
    component: 'component-1' as any,
    milestone: 'milestone-1' as any,
    estimation: 3,
    labels: ['label-1' as any],
    kind: 'kind-shared' as any,
    comments: 5,
    attachments: 2,
    relations: [{ _id: 'doc-1' as any, _class: 'cls' as any }],
    children: [
      {
        id: 'child-1' as any,
        title: 'Child',
        description: '',
        priority: 1,
        assignee: null,
        component: 'component-2' as any,
        milestone: 'milestone-2' as any,
        estimation: 1,
        labels: ['label-2' as any],
        kind: 'kind-other' as any
      }
    ]
  }
}

describe('makeIssueTemplateCopy', () => {
  let counter = 0
  const newId = (): any => `new-${++counter}`

  beforeEach(() => {
    counter = 0
  })

  it('clears project specific references when copying to another project', () => {
    const source = template()
    const data = makeIssueTemplateCopy(source, 'project-2' as any, ['kind-shared' as any], newId)

    expect(data).toMatchObject({
      title: 'Release',
      description: '<p>Steps</p>',
      priority: 2,
      assignee: 'person-1',
      component: null,
      milestone: null,
      estimation: 3,
      labels: ['label-1'],
      kind: 'kind-shared',
      comments: 0,
      attachments: 0,
      relations: [{ _id: 'doc-1', _class: 'cls' }]
    })
    expect(data.children).toEqual([
      {
        id: 'new-1',
        title: 'Child',
        description: '',
        priority: 1,
        assignee: null,
        component: null,
        milestone: null,
        estimation: 1,
        labels: ['label-2'],
        kind: undefined
      }
    ])
    expect((data as any)._id).toBeUndefined()
    expect((data as any).space).toBeUndefined()
  })

  it('keeps component and milestone within the same project', () => {
    const data = makeIssueTemplateCopy(template(), 'project-1' as any, [], newId)
    expect(data.component).toBe('component-1')
    expect(data.milestone).toBe('milestone-1')
    expect(data.children[0].component).toBe('component-2')
    expect(data.kind).toBeUndefined()
    expect(data.children[0].id).toBe('new-1')
  })

  it('does not share arrays with the source template', () => {
    const source = template()
    const data = makeIssueTemplateCopy(source, 'project-2' as any, [], newId)
    expect(data.labels).not.toBe(source.labels)
    expect(data.children[0].labels).not.toBe(source.children[0].labels)
    expect(data.relations).not.toBe(source.relations)
  })
})
