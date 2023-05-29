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

import core, {
  Class,
  DOMAIN_STATUS,
  DOMAIN_TX,
  Doc,
  DocumentUpdate,
  Ref,
  SortingOrder,
  TxCreateDoc,
  TxOperations,
  TxResult,
  TxUpdateDoc,
  generateId
} from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient, createOrUpdate } from '@hcengineering/model'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import tags from '@hcengineering/tags'
import {
  Issue,
  IssueStatus,
  IssueTemplate,
  IssueTemplateChild,
  Milestone,
  MilestoneStatus,
  Project,
  TimeReportDayType,
  calcRank,
  createStatuses,
  genRanks
} from '@hcengineering/tracker'
import { DOMAIN_TRACKER } from '.'
import tracker from './plugin'

enum DeprecatedIssueStatus {
  Backlog,
  Todo,
  InProgress,
  Done,
  Canceled
}

const categoryByDeprecatedIssueStatus = {
  [DeprecatedIssueStatus.Backlog]: tracker.issueStatusCategory.Backlog,
  [DeprecatedIssueStatus.Todo]: tracker.issueStatusCategory.Unstarted,
  [DeprecatedIssueStatus.InProgress]: tracker.issueStatusCategory.Started,
  [DeprecatedIssueStatus.Done]: tracker.issueStatusCategory.Completed,
  [DeprecatedIssueStatus.Canceled]: tracker.issueStatusCategory.Canceled
} as const

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
    const defaultStatusId: Ref<IssueStatus> = generateId()

    await tx.createDoc<Project>(
      tracker.class.Project,
      core.space.Space,
      {
        name: 'Default',
        description: 'Default project',
        private: false,
        members: [],
        archived: false,
        identifier: 'TSK',
        sequence: 0,
        issueStatuses: 0,
        defaultIssueStatus: defaultStatusId,
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
        defaultAssignee: undefined
      },
      tracker.project.DefaultProject
    )
    await createStatuses(
      tx,
      tracker.project.DefaultProject,
      tracker.class.IssueStatus,
      tracker.attribute.IssueStatus,
      defaultStatusId
    )
  }
}

async function fixProjectIssueStatusesOrder (tx: TxOperations, project: Project): Promise<TxResult> {
  const statuses = await tx.findAll(
    tracker.class.IssueStatus,
    { attachedTo: project._id },
    { lookup: { category: core.class.StatusCategory } }
  )
  statuses.sort((a, b) => (a.$lookup?.category?.order ?? 0) - (b.$lookup?.category?.order ?? 0))
  const issueStatusRanks = genRanks(statuses.length)
  return statuses.map((status) => {
    const rank = issueStatusRanks.next().value
    if (rank === undefined || status.rank === rank) return undefined
    return tx.update(status, { rank })
  })
}

async function fixProjectsIssueStatusesOrder (tx: TxOperations): Promise<void> {
  const projects = await tx.findAll(tracker.class.Project, {})
  await Promise.all(projects.map((project) => fixProjectIssueStatusesOrder(tx, project)))
}

async function upgradeProjectSettings (tx: TxOperations): Promise<void> {
  const projects = await tx.findAll(tracker.class.Project, {
    defaultTimeReportDay: { $exists: false }
  })
  await Promise.all(
    projects.map((project) =>
      tx.update(project, {
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay
      })
    )
  )
}

async function upgradeProjectIssueStatuses (tx: TxOperations): Promise<void> {
  const projects = await tx.findAll(tracker.class.Project, { issueStatuses: undefined })

  if (projects.length > 0) {
    for (const project of projects) {
      const defaultStatusId: Ref<IssueStatus> = generateId()

      await tx.update(project, { issueStatuses: 0, defaultIssueStatus: defaultStatusId })
      await createStatuses(tx, project._id, tracker.class.IssueStatus, tracker.attribute.IssueStatus, defaultStatusId)
    }
  }
}

async function upgradeIssueStatuses (tx: TxOperations): Promise<void> {
  const deprecatedStatuses = [
    DeprecatedIssueStatus.Backlog,
    DeprecatedIssueStatus.Canceled,
    DeprecatedIssueStatus.Done,
    DeprecatedIssueStatus.InProgress,
    DeprecatedIssueStatus.Todo
  ]
  const issues = await tx.findAll(tracker.class.Issue, { status: { $in: deprecatedStatuses as any } })

  if (issues.length > 0) {
    const statusByDeprecatedStatus = new Map<DeprecatedIssueStatus, Ref<IssueStatus>>()

    for (const issue of issues) {
      const deprecatedStatus = issue.status as unknown as DeprecatedIssueStatus

      if (!statusByDeprecatedStatus.has(deprecatedStatus)) {
        const category = categoryByDeprecatedIssueStatus[deprecatedStatus]
        const issueStatus = await tx.findOne(tracker.class.IssueStatus, { category })

        if (issueStatus === undefined) {
          throw new Error(`Could not find a new status for "${DeprecatedIssueStatus[deprecatedStatus]}"`)
        }

        statusByDeprecatedStatus.set(deprecatedStatus, issueStatus._id)
      }

      await tx.update(issue, { status: statusByDeprecatedStatus.get(deprecatedStatus) })
    }
  }
}

async function migrateParentIssues (client: MigrationClient): Promise<void> {
  let { updated } = await client.update(
    DOMAIN_TRACKER,
    { _class: tracker.class.Issue, attachedToClass: { $exists: false } },
    {
      subIssues: 0,
      collection: 'subIssues',
      attachedToClass: tracker.class.Issue
    }
  )
  updated += (
    await client.update(
      DOMAIN_TRACKER,
      { _class: tracker.class.Issue, parentIssue: { $exists: true } },
      { $rename: { parentIssue: 'attachedTo' } }
    )
  ).updated
  updated += (
    await client.update(
      DOMAIN_TRACKER,
      { _class: tracker.class.Issue, attachedTo: { $in: [null, undefined] } },
      { attachedTo: tracker.ids.NoParent }
    )
  ).updated

  if (updated === 0) {
    return
  }

  const childrenCountById = new Map<Ref<Doc>, number>()
  const parentIssueIds = (
    await client.find<Issue>(DOMAIN_TRACKER, {
      _class: tracker.class.Issue,
      attachedTo: { $nin: [tracker.ids.NoParent] }
    })
  ).map((issue) => issue.attachedTo)

  for (const issueId of parentIssueIds) {
    const count = childrenCountById.get(issueId) ?? 0
    childrenCountById.set(issueId, count + 1)
  }

  for (const [_id, childrenCount] of childrenCountById) {
    await client.update(DOMAIN_TRACKER, { _id }, { subIssues: childrenCount })
  }
}

async function updateIssueParentInfo (client: MigrationClient, parentIssue: Issue | null): Promise<void> {
  const parents =
    parentIssue === null ? [] : [{ parentId: parentIssue._id, parentTitle: parentIssue.title }, ...parentIssue.parents]
  const migrationResult = await client.update<Issue>(
    DOMAIN_TRACKER,
    {
      _class: tracker.class.Issue,
      attachedTo: parentIssue?._id ?? tracker.ids.NoParent,
      parents: { $exists: false }
    },
    { parents }
  )

  if (migrationResult.matched > 0) {
    const subIssues = await client.find<Issue>(DOMAIN_TRACKER, {
      _class: tracker.class.Issue,
      attachedTo: parentIssue?._id ?? tracker.ids.NoParent,
      subIssues: { $gt: 0 }
    })

    for (const issue of subIssues) {
      await updateIssueParentInfo(client, issue)
    }
  }
}

async function migrateIssueParentInfo (client: MigrationClient): Promise<void> {
  await updateIssueParentInfo(client, null)
}

async function migrateIssueComponents (client: MigrationClient): Promise<void> {
  const issues = await client.find(DOMAIN_TRACKER, { _class: tracker.class.Issue, component: { $exists: false } })

  if (issues.length === 0) {
    return
  }

  for (const issue of issues) {
    await client.update(DOMAIN_TRACKER, { _id: issue._id }, { component: null })
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultProject(tx)
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    tags.space.Tags,
    {
      icon: tags.icon.Tags,
      label: 'Other',
      targetClass: tracker.class.Issue,
      tags: [],
      default: true
    },
    tracker.category.Other
  )
}

async function fillRank (client: MigrationClient): Promise<void> {
  const docs = await client.find<Issue>(DOMAIN_TRACKER, {
    _class: tracker.class.Issue,
    rank: ''
  })
  let last = (
    await client.find<Issue>(
      DOMAIN_TRACKER,
      {
        _class: tracker.class.Issue,
        rank: { $ne: '' }
      },
      {
        sort: { rank: SortingOrder.Descending },
        limit: 1
      }
    )
  )[0]
  for (const doc of docs) {
    const rank = calcRank(last)
    await client.update(
      DOMAIN_TRACKER,
      {
        _id: doc._id
      },
      {
        rank
      }
    )
    await client.update(
      DOMAIN_TX,
      { 'tx.objectId': doc._id, 'tx._class': core.class.TxCreateDoc },
      { 'tx.attributes.rank': rank }
    )
    doc.rank = rank
    last = doc
  }
}

async function upgradeProjects (tx: TxOperations): Promise<void> {
  await upgradeProjectIssueStatuses(tx)
  await fixProjectsIssueStatusesOrder(tx)
  await upgradeProjectSettings(tx)
}

async function upgradeIssues (tx: TxOperations): Promise<void> {
  await upgradeIssueStatuses(tx)

  const issues = await tx.findAll(tracker.class.Issue, {
    $or: [{ blockedBy: { $exists: true } }, { relatedIssue: { $exists: true } }]
  })

  for (const i of issues) {
    const rel = (i as any).relatedIssue as Ref<Issue>[]
    const upd: DocumentUpdate<Issue> = {}
    if (rel != null) {
      ;(upd as any).relatedIssue = null
      upd.relations = rel.map((it) => ({ _id: it, _class: tracker.class.Issue }))
    }
    if (i.blockedBy !== undefined) {
      if ((i.blockedBy as any[]).find((it) => typeof it === 'string') !== undefined) {
        upd.blockedBy = (i.blockedBy as unknown as Ref<Issue>[]).map((it) => ({ _id: it, _class: tracker.class.Issue }))
      }
    }
    if (Object.keys(upd).length > 0) {
      await tx.update(i, upd)
    }
  }
}

async function renameSprintToMilestone (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TRACKER,
    {
      _class: tracker.class.Issue,
      sprint: { $exists: true }
    },
    {
      $rename: { sprint: 'milestone' }
    }
  )
  await client.update(
    DOMAIN_TRACKER,
    {
      _class: 'tracker:class:Sprint' as Ref<Class<Doc>>
    },
    {
      _class: tracker.class.Milestone
    }
  )
  const milestones = await client.find(DOMAIN_TRACKER, { _class: tracker.class.Milestone })
  for (const milestone of milestones) {
    await client.update(
      DOMAIN_TX,
      {
        objectId: milestone._id,
        objectClass: 'tracker:class:Sprint' as Ref<Class<Doc>>
      },
      {
        objectClass: tracker.class.Milestone
      }
    )
  }

  await client.update(
    DOMAIN_TX,
    {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxCreateDoc,
      'tx.objectClass': tracker.class.Issue,
      'tx.attributes.sprint': { $exists: true }
    },
    {
      $rename: { 'tx.attributes.sprint': 'tx.attributes.milestone' }
    }
  )
  await client.update(
    DOMAIN_TX,
    {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxUpdateDoc,
      'tx.objectClass': tracker.class.Issue,
      'tx.operations.sprint': { $exists: true }
    },
    {
      $rename: { 'tx.operations.sprint': 'tx.operations.milestone' }
    }
  )
  await client.update(
    DOMAIN_TX,
    {
      objectClass: tracker.class.Issue,
      _class: core.class.TxUpdateDoc,
      'operations.sprint': { $exists: true }
    },
    {
      $rename: { 'operations.sprint': 'operations.milestone' }
    }
  )

  const templates = await client.find<IssueTemplate>(DOMAIN_TRACKER, {
    _class: tracker.class.IssueTemplate,
    sprint: { $exists: true }
  })
  for (const template of templates) {
    const children: IssueTemplateChild[] = template.children.map((p) => {
      const res = {
        ...p,
        milestone: p.milestone
      }
      delete (res as any).sprint
      return res
    })
    await client.update<IssueTemplate>(
      DOMAIN_TRACKER,
      {
        _id: template._id
      },
      {
        children
      }
    )
    await client.update(
      DOMAIN_TRACKER,
      {
        _id: template._id
      },
      {
        $rename: { sprint: 'milestone' }
      }
    )
    const createTxes = await client.find<TxCreateDoc<IssueTemplate>>(DOMAIN_TX, {
      objectId: template._id,
      _class: core.class.TxCreateDoc
    })
    for (const createTx of createTxes) {
      const children: IssueTemplateChild[] = createTx.attributes.children.map((p) => {
        const res = {
          ...p,
          milestone: p.milestone
        }
        delete (res as any).sprint
        return res
      })
      await client.update<TxCreateDoc<IssueTemplate>>(
        DOMAIN_TX,
        {
          _id: createTx._id
        },
        {
          children
        }
      )
      await client.update(
        DOMAIN_TX,
        {
          _id: createTx._id
        },
        {
          $rename: { 'attributes.sprint': 'attributes.milestone' }
        }
      )
    }
    const updateTxes = await client.find<TxUpdateDoc<IssueTemplate>>(DOMAIN_TX, {
      objectId: template._id,
      _class: core.class.TxUpdateDoc
    })
    for (const updateTx of updateTxes) {
      if ((updateTx.operations as any).sprint !== undefined) {
        await client.update(
          DOMAIN_TX,
          {
            _id: updateTx._id
          },
          {
            $rename: { 'operations.sprint': 'operations.milestone' }
          }
        )
      }
      if (updateTx.operations.children !== undefined) {
        const children: IssueTemplateChild[] = updateTx.operations.children.map((p) => {
          const res = {
            ...p,
            milestone: p.milestone
          }
          delete (res as any).sprint
          return res
        })
        await client.update(
          DOMAIN_TX,
          {
            _id: updateTx._id
          },
          {
            children
          }
        )
      }
    }
  }
}

async function renameProject (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TRACKER,
    {
      _class: { $in: [tracker.class.Issue, tracker.class.Milestone] },
      project: { $exists: true }
    },
    {
      $rename: { project: 'component' }
    }
  )
  await client.update(
    DOMAIN_TRACKER,
    {
      _class: tracker.class.Project
    },
    {
      _class: tracker.class.Component
    }
  )
  const components = await client.find(DOMAIN_TRACKER, { _class: tracker.class.Component })
  for (const component of components) {
    await client.update(
      DOMAIN_TX,
      {
        objectId: component._id,
        objectClass: tracker.class.Project
      },
      {
        objectClass: tracker.class.Component
      }
    )
  }

  await client.update(
    DOMAIN_TX,
    {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxCreateDoc,
      'tx.objectClass': tracker.class.Issue,
      'tx.attributes.project': { $exists: true }
    },
    {
      $rename: { 'tx.attributes.project': 'tx.attributes.component' }
    }
  )
  await client.update(
    DOMAIN_TX,
    {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxUpdateDoc,
      'tx.objectClass': tracker.class.Issue,
      'tx.operations.project': { $exists: true }
    },
    {
      $rename: { 'tx.operations.project': 'tx.operations.component' }
    }
  )
  await client.update(
    DOMAIN_TX,
    {
      objectClass: tracker.class.Milestone,
      _class: core.class.TxCreateDoc,
      'attributes.project': { $exists: true }
    },
    {
      $rename: { 'attributes.project': 'attributes.component' }
    }
  )
  await client.update(
    DOMAIN_TX,
    {
      objectClass: { $in: [tracker.class.Issue, tracker.class.Milestone] },
      _class: core.class.TxUpdateDoc,
      'operations.project': { $exists: true }
    },
    {
      $rename: { 'operations.project': 'operations.component' }
    }
  )

  const templates = await client.find<IssueTemplate>(DOMAIN_TRACKER, {
    _class: tracker.class.IssueTemplate,
    project: { $exists: true }
  })
  for (const template of templates) {
    const children: IssueTemplateChild[] = template.children.map((p) => {
      const res = {
        ...p,
        component: p.component
      }
      delete (res as any).project
      return res
    })
    await client.update<IssueTemplate>(
      DOMAIN_TRACKER,
      {
        _id: template._id
      },
      {
        children
      }
    )
    await client.update(
      DOMAIN_TRACKER,
      {
        _id: template._id
      },
      {
        $rename: { project: 'component' }
      }
    )
    const createTxes = await client.find<TxCreateDoc<IssueTemplate>>(DOMAIN_TX, {
      objectId: template._id,
      _class: core.class.TxCreateDoc
    })
    for (const createTx of createTxes) {
      const children: IssueTemplateChild[] = createTx.attributes.children.map((p) => {
        const res = {
          ...p,
          component: p.component
        }
        delete (res as any).project
        return res
      })
      await client.update<TxCreateDoc<IssueTemplate>>(
        DOMAIN_TX,
        {
          _id: createTx._id
        },
        {
          children
        }
      )
      await client.update(
        DOMAIN_TX,
        {
          _id: createTx._id
        },
        {
          $rename: { 'attributes.project': 'attributes.component' }
        }
      )
    }
    const updateTxes = await client.find<TxUpdateDoc<IssueTemplate>>(DOMAIN_TX, {
      objectId: template._id,
      _class: core.class.TxUpdateDoc
    })
    for (const updateTx of updateTxes) {
      if ((updateTx.operations as any).project !== undefined) {
        await client.update(
          DOMAIN_TX,
          {
            _id: updateTx._id
          },
          {
            $rename: { 'operations.project': 'operations.component' }
          }
        )
      }
      if (updateTx.operations.children !== undefined) {
        const children: IssueTemplateChild[] = updateTx.operations.children.map((p) => {
          const res = {
            ...p,
            component: p.component
          }
          delete (res as any).project
          return res
        })
        await client.update(
          DOMAIN_TX,
          {
            _id: updateTx._id
          },
          {
            children
          }
        )
      }
    }
  }

  const defaultSpace = (
    await client.find<Project>(DOMAIN_SPACE, {
      _id: 'tracker:team:DefaultTeam' as Ref<Project>
    })
  )[0]
  if (defaultSpace !== undefined) {
    await client.delete(DOMAIN_SPACE, tracker.project.DefaultProject)
    await client.create(DOMAIN_SPACE, {
      ...defaultSpace,
      _id: tracker.project.DefaultProject,
      _class: tracker.class.Project,
      description: defaultSpace.description === 'Default team' ? 'Default project' : defaultSpace.description
    })
    await client.delete(DOMAIN_SPACE, defaultSpace._id)
  }

  await client.update(
    DOMAIN_SPACE,
    {
      _id: 'tracker:team:DefaultTeam' as Ref<Project>,
      _class: 'tracker:class:Team' as Ref<Class<Doc>>
    },
    {
      _id: tracker.project.DefaultProject,
      _class: tracker.class.Project,
      description: 'Default project'
    }
  )

  await client.update(
    DOMAIN_TRACKER,
    {
      attachedTo: 'tracker:team:DefaultTeam' as Ref<Doc>
    },
    {
      attachedTo: tracker.project.DefaultProject
    }
  )

  await client.update(
    DOMAIN_TRACKER,
    {
      space: 'tracker:team:DefaultTeam' as Ref<Project>
    },
    {
      space: tracker.project.DefaultProject
    }
  )

  await client.update(
    DOMAIN_TRACKER,
    {
      attachedToClass: 'tracker:class:Team' as Ref<Class<Doc>>
    },
    {
      attachedToClass: tracker.class.Project
    }
  )

  await client.update(
    DOMAIN_TX,
    {
      objectId: 'tracker:team:DefaultTeam' as Ref<Project>
    },
    {
      objectId: tracker.project.DefaultProject
    }
  )

  await client.update(
    DOMAIN_TX,
    {
      objectClass: 'tracker:class:Team' as Ref<Class<Doc>>
    },
    {
      objectClass: tracker.class.Project
    }
  )

  await client.update(
    DOMAIN_TX,
    {
      'tx.objectClass': 'tracker:class:Team' as Ref<Class<Doc>>
    },
    {
      'tx.objectClass': tracker.class.Project
    }
  )

  await client.update(
    DOMAIN_TX,
    {
      objectSpace: 'tracker:team:DefaultTeam' as Ref<Project>
    },
    {
      objectSpace: tracker.project.DefaultProject
    }
  )

  await client.update(
    DOMAIN_TX,
    {
      'tx.objectSpace': 'tracker:team:DefaultTeam' as Ref<Project>
    },
    {
      'tx.objectSpace': tracker.project.DefaultProject
    }
  )
}

async function fixMilestoneEmptyStatuses (client: MigrationClient): Promise<void> {
  await client.update<Milestone>(
    DOMAIN_TRACKER,
    { _class: tracker.class.Milestone, $or: [{ status: null }, { status: undefined }] },
    { status: MilestoneStatus.Planned }
  )
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await client.update(
      DOMAIN_TRACKER,
      { _class: tracker.class.Issue, reports: { $exists: false } },
      {
        reports: 0,
        estimation: 0,
        reportedTime: 0
      }
    )
    await Promise.all([migrateIssueComponents(client), migrateParentIssues(client)])
    await migrateIssueParentInfo(client)
    await fillRank(client)
    await renameSprintToMilestone(client)
    await renameProject(client)

    // Move all status objects into status domain
    await client.move(
      DOMAIN_TRACKER,
      {
        _class: tracker.class.IssueStatus
      },
      DOMAIN_STATUS
    )
    await client.update(
      DOMAIN_STATUS,
      { _class: tracker.class.IssueStatus, ofAttribute: { $exists: false } },
      {
        ofAttribute: tracker.attribute.IssueStatus
      }
    )

    await fixMilestoneEmptyStatuses(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
    await upgradeProjects(tx)
    await upgradeIssues(tx)
  }
}
