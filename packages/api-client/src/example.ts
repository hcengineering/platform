//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type Class, type Doc, type Ref, type Space } from '@hcengineering/core'
import { connect } from './client'
import { NodeWebSocketFactory } from './socket'

async function sample (): Promise<void> {
  const email = 'user1'
  const password = '1234'
  const workspace = 'ws1'

  console.log('connecting...')
  const client = await connect('http://localhost:8087', {
    email,
    password,
    workspace,
    socketFactory: NodeWebSocketFactory
  })

  try {
    const project = await client.findOne('tracker:class:Project' as Ref<Class<Space>>, { name: 'Default' })
    if (project === undefined) {
      throw new Error('Project not found')
    }

    console.log('found project:', (project as any).identifier, (project as any).description)

    const issues = await client.findAll('tracker:class:Issue' as Ref<Class<Doc>>, { space: project._id }, { limit: 20 })
    console.log('found issues:', issues.length)
    for (const issue of issues) {
      console.log('-', (issue as any).identifier, (issue as any).title)
    }

    // await client.createDoc(
    //   'tracker:class:Issue' as Ref<Class<Doc>>,
    //   project._id,
    //   {
    //     title: 'Sample issue',
    //     description: 'Sample issue',

    //     // Task

    //     // OK
    //     kind: (project as any).kind
    //     // assignee: Ref<Person> | null
    //     // dueDate: Timestamp | null

    //     // TODO
    //     // status: Ref<Status>
    //     // number: number
    //     // identifier: string
    //     // rank: Rank

    //     // Not needed
    //     // isDone?: boolean
    //     // comments?: number
    //     // attachments?: number
    //     // labels?: number

    //     // Issue

    //     // OK
    //     // title: string
    //     // description: CollaborativeDoc
    //     // priority: IssuePriority
    //     // component: Ref<Component> | null
    //     // blockedBy?: RelatedDocument[]
    //     // relations?: RelatedDocument[]
    //     // milestone?: Ref<Milestone> | null
    //     // estimation: number
    //     // remainingTime: number

    //     // TODO
    //     // status: Ref<IssueStatus>
    //     // template?: {
    //     //   // A template issue is based on
    //     //   template: Ref<IssueTemplate>
    //     //   // Child id in template
    //     //   childId?: string
    //     // }
    //     // parents: IssueParentInfo[]

    //     // Not needed
    //     // subIssues: CollectionSize<Issue>
    //     // reportedTime: number
    //     // reports: CollectionSize<TimeSpendReport>
    //     // childInfo: IssueChildInfo[]
    //     // todos?: CollectionSize<ToDo>

    //   }
    // )
  } finally {
    await client.close()
  }
}

void sample()
  .then(() => {
    console.log('done')
  })
  .catch((err) => {
    console.error(err)
  })
