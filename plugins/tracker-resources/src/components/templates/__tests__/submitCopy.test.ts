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

import type { AccountUuid, PersonId, Ref, TxOperations } from '@hcengineering/core'
import task, { type ProjectType, type TaskType } from '@hcengineering/task'
import tracker, { TimeReportDayType, type Issue, type IssueTemplate, type Project } from '@hcengineering/tracker'
import { submitIssueTemplateCopy } from '../submitCopy'

const account = 'copying-account' as AccountUuid
const targetId = 'target-project' as Ref<Project>
const taskType = 'shared-kind' as Ref<TaskType>

function template (): IssueTemplate {
  return {
    _id: 'template' as Ref<IssueTemplate>,
    _class: tracker.class.IssueTemplate,
    space: 'source-project' as Ref<Project>,
    modifiedOn: 0,
    modifiedBy: 'author' as PersonId,
    title: 'Release',
    description: '',
    priority: 0,
    assignee: null,
    component: null,
    estimation: 0,
    comments: 0,
    kind: taskType,
    children: ['First child', 'Second child'].map((title, index) => ({
      id: `child-${index}` as Ref<Issue>,
      title,
      description: '',
      priority: 0,
      assignee: null,
      component: null,
      estimation: 0
    }))
  }
}

function setup (): {
  source: IssueTemplate
  client: Pick<TxOperations, 'findOne' | 'findAll' | 'createDoc'>
  findOne: jest.Mock
  findAll: jest.Mock
  createDoc: jest.Mock
  newChildId: jest.Mock<Ref<Issue>, []>
} {
  const project: Project = {
    _id: targetId,
    _class: tracker.class.Project,
    space: 'projects' as Project['space'],
    modifiedOn: 0,
    modifiedBy: 'author' as PersonId,
    name: 'Target',
    description: '',
    private: false,
    members: [account],
    archived: false,
    type: 'target-project-type' as Ref<ProjectType>,
    identifier: 'TGT',
    sequence: 0,
    defaultTimeReportDay: TimeReportDayType.CurrentWorkDay
  }
  const findOne = jest.fn().mockResolvedValue(project)
  // Synthetic query result: the submission only consumes the model task type's ID.
  const findAll = jest.fn().mockResolvedValue([{ _id: taskType }])
  const createDoc = jest.fn().mockResolvedValue('copied-template' as Ref<IssueTemplate>)
  let nextChild = 0
  const newChildId = jest.fn<Ref<Issue>, []>(() => `copied-child-${++nextChild}` as Ref<Issue>)
  const client: Pick<TxOperations, 'findOne' | 'findAll' | 'createDoc'> = { findOne, findAll, createDoc }
  return { source: template(), client, findOne, findAll, createDoc, newChildId }
}

describe('submitIssueTemplateCopy', () => {
  it('revalidates the selected project and creates one template with all children', async () => {
    const { source, client, findOne, findAll, createDoc, newChildId } = setup()

    await expect(submitIssueTemplateCopy(client, source, targetId, account, newChildId)).resolves.toBe(true)

    expect(findOne).toHaveBeenCalledTimes(1)
    expect(findOne).toHaveBeenCalledWith(tracker.class.Project, {
      _id: targetId,
      archived: false,
      members: account
    })
    expect(findAll).toHaveBeenCalledTimes(1)
    expect(findAll).toHaveBeenCalledWith(task.class.TaskType, { parent: 'target-project-type' })
    expect(createDoc).toHaveBeenCalledTimes(1)
    expect(createDoc).toHaveBeenCalledWith(
      tracker.class.IssueTemplate,
      targetId,
      expect.objectContaining({
        title: source.title,
        kind: taskType,
        children: [
          expect.objectContaining({ title: 'First child', id: 'copied-child-1' }),
          expect.objectContaining({ title: 'Second child', id: 'copied-child-2' })
        ]
      })
    )
  })

  it('does not create when the target eligibility query returns no project', async () => {
    const { source, client, findOne, findAll, createDoc, newChildId } = setup()
    // Archiving, deletion or membership loss makes the eligibility query return no matching project.
    findOne.mockResolvedValue(undefined)

    await expect(submitIssueTemplateCopy(client, source, targetId, account, newChildId)).resolves.toBe(false)

    expect(findAll).not.toHaveBeenCalled()
    expect(createDoc).not.toHaveBeenCalled()
    expect(newChildId).not.toHaveBeenCalled()
  })

  it('permits retry after a project becomes available again', async () => {
    const { source, client, findOne, createDoc, newChildId } = setup()
    findOne.mockResolvedValueOnce(undefined)

    await expect(submitIssueTemplateCopy(client, source, targetId, account, newChildId)).resolves.toBe(false)
    await expect(submitIssueTemplateCopy(client, source, targetId, account, newChildId)).resolves.toBe(true)
    expect(createDoc).toHaveBeenCalledTimes(1)
  })

  it.each(['missing', 'source'])('rejects a %s selection before reading or writing', async (selection) => {
    const { source, client, findOne, findAll, createDoc, newChildId } = setup()
    const target = selection === 'missing' ? undefined : source.space

    await expect(submitIssueTemplateCopy(client, source, target, account, newChildId)).resolves.toBe(false)

    expect(findOne).not.toHaveBeenCalled()
    expect(findAll).not.toHaveBeenCalled()
    expect(createDoc).not.toHaveBeenCalled()
  })

  it.each(['project lookup', 'task type lookup', 'create'])(
    'propagates a failed %s and permits retry',
    async (stage) => {
      const { source, client, findOne, findAll, createDoc, newChildId } = setup()
      const failure = new Error(`${stage} failed`)
      const operation = stage === 'project lookup' ? findOne : stage === 'task type lookup' ? findAll : createDoc
      operation.mockRejectedValueOnce(failure)

      await expect(submitIssueTemplateCopy(client, source, targetId, account, newChildId)).rejects.toBe(failure)
      expect(createDoc).toHaveBeenCalledTimes(stage === 'create' ? 1 : 0)

      await expect(submitIssueTemplateCopy(client, source, targetId, account, newChildId)).resolves.toBe(true)
      expect(createDoc).toHaveBeenCalledTimes(stage === 'create' ? 2 : 1)
    }
  )
})
