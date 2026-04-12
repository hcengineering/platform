//
// Copyright © 2025 Hardcore Engineering Inc.
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

import {
  connect as connectWs,
  loadServerConfig,
  NodeWebSocketFactory,
  type ConnectOptions,
  type PlatformClient
} from '@hcengineering/api-client'
import core, { generateId, type Ref } from '@hcengineering/core'
import tracker, { type Issue, IssuePriority, TimeReportDayType } from '@hcengineering/tracker'

describe('rest-api-server', () => {
  const wsName = 'api-tests'

  beforeAll(async () => {
    await loadServerConfig('http://huly.local:8083')
  }, 10000)

  async function connect (): Promise<PlatformClient> {
    const options: ConnectOptions = {
      email: 'user1',
      password: '1234',
      workspace: wsName,
      socketFactory: NodeWebSocketFactory,
      connectionTimeout: 30000
    }

    return await connectWs('http://huly.local:8083', options)
  }

  it('handles many duplicate create doc attempts without breaking subsequent requests', async () => {
    const client = await connect()
    const account = await client.getAccount()

    const issueId: Ref<Issue> = generateId()

    let project = await client.findOne(tracker.class.Project, {
      identifier: 'HULY'
    })
    if (project === undefined) {
      // Create a minimal project for this test if it does not exist yet.
      const defaultStatus = await client.findOne(tracker.class.IssueStatus, {})
      if (defaultStatus === undefined) {
        throw new Error('No IssueStatus found to create project')
      }

      const projectId = generateId()
      const projectData: any = {
        name: 'HULY',
        description: '',
        private: false,
        members: [],
        owners: [],
        archived: false,
        autoJoin: false,
        identifier: 'HULY',
        sequence: 0,
        color: undefined,
        icon: undefined,
        defaultIssueStatus: defaultStatus._id,
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay
      }

      await client.createDoc(tracker.class.Project, core.space.Space, projectData, projectId as any)

      project = await client.findOne(tracker.class.Project, { _id: projectId as any })
      if (project === undefined) {
        throw new Error('Failed to create project')
      }
    }

    const incResult = await client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      project._id,
      {
        $inc: { sequence: 1 }
      },
      true
    )

    const sequence = (incResult as any).object.sequence

    const issueData = {
      title: 'Make coffee',
      status: project.defaultIssueStatus as any,
      description: null,
      number: sequence,
      kind: tracker.taskTypes.Issue,
      identifier: `${project.identifier}-${sequence}`,
      priority: IssuePriority.Urgent,
      assignee: null,
      component: null,
      estimation: 0,
      remainingTime: 0,
      reportedTime: 0,
      reports: 0,
      subIssues: 0,
      parents: [],
      childInfo: [],
      dueDate: null,
      rank: ''
    }

    // First create should succeed
    await client.addCollection(
      tracker.class.Issue,
      project._id,
      project._id,
      project._class,
      'issues',
      issueData,
      issueId
    )

    // Repeatedly try to create the same document many times.
    // These may fail with conflicts, but must not break the connection.
    for (let i = 0; i < 199; i++) {
      try {
        await client.addCollection(
          tracker.class.Issue,
          project._id,
          project._id,
          project._class,
          'issues',
          issueData,
          issueId
        )
      } catch (_err) {
        // Ignore individual failures; we're interested in connection health afterwards.
      }
      try {
        await client.updateCollection(
          tracker.class.Issue,
          project._id,
          issueId,
          project._id,
          project._class,
          'issues',
          {
            title: `Make coffee ${i}`
          }
        )
      } catch (_err) {
        // Ignore individual failures; we're interested in connection health afterwards.
      }
      const issue2: Ref<Issue> = generateId()
      await client.addCollection(
        tracker.class.Issue,
        project._id,
        project._id,
        project._class,
        'issues',
        issueData,
        issue2
      )
      await client.removeCollection(tracker.class.Issue, project._id, issue2, project._id, project._class, 'issues')
    }

    // Give the server some time to settle and close any internal resources
    // that might be cleaned up asynchronously.
    await new Promise((resolve) => setTimeout(resolve, 30000))

    // Verify that we can still perform normal operations afterwards.
    const docs = await client.findAll(tracker.class.Issue, { _id: issueId })
    expect(docs.length).toBe(1)

    const accountAfter = await client.getAccount()
    expect(accountAfter.primarySocialId).toEqual(account.primarySocialId)

    await client.close()
  }, 300000)
})
