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
  Doc,
  DocumentUpdate,
  DOMAIN_TX,
  generateId,
  Ref,
  SortingOrder,
  TxCollectionCUD,
  TxCreateDoc,
  TxOperations,
  TxResult,
  TxUpdateDoc
} from '@hcengineering/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import tags from '@hcengineering/tags'
import {
  calcRank,
  genRanks,
  Issue,
  IssueStatus,
  IssueStatusCategory,
  IssueTemplate,
  IssueTemplateChild,
  Project,
  TimeReportDayType,
  WorkDayLength
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

interface CreateProjectIssueStatusesArgs {
  tx: TxOperations
  projectId: Ref<Project>
  categories: IssueStatusCategory[]
  defaultStatusId?: Ref<IssueStatus>
  defaultCategoryId?: Ref<IssueStatusCategory>
}

const categoryByDeprecatedIssueStatus = {
  [DeprecatedIssueStatus.Backlog]: tracker.issueStatusCategory.Backlog,
  [DeprecatedIssueStatus.Todo]: tracker.issueStatusCategory.Unstarted,
  [DeprecatedIssueStatus.InProgress]: tracker.issueStatusCategory.Started,
  [DeprecatedIssueStatus.Done]: tracker.issueStatusCategory.Completed,
  [DeprecatedIssueStatus.Canceled]: tracker.issueStatusCategory.Canceled
} as const

async function createProjectIssueStatuses ({
  tx,
  projectId: attachedTo,
  categories,
  defaultStatusId,
  defaultCategoryId = tracker.issueStatusCategory.Backlog
}: CreateProjectIssueStatusesArgs): Promise<void> {
  const issueStatusRanks = [...genRanks(categories.length)]

  for (const [i, statusCategory] of categories.entries()) {
    const { _id: category, defaultStatusName } = statusCategory
    const rank = issueStatusRanks[i]

    await tx.addCollection(
      tracker.class.IssueStatus,
      attachedTo,
      attachedTo,
      tracker.class.Project,
      'issueStatuses',
      { name: defaultStatusName, category, rank },
      category === defaultCategoryId ? defaultStatusId : undefined
    )
  }
}

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
    const categories = await tx.findAll(
      tracker.class.IssueStatusCategory,
      {},
      { sort: { order: SortingOrder.Ascending } }
    )

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
        defaultAssignee: undefined,
        workDayLength: WorkDayLength.EIGHT_HOURS
      },
      tracker.project.DefaultProject
    )
    await createProjectIssueStatuses({ tx, projectId: tracker.project.DefaultProject, categories, defaultStatusId })
  }
}

async function fixProjectIssueStatusesOrder (tx: TxOperations, project: Project): Promise<TxResult> {
  const statuses = await tx.findAll(
    tracker.class.IssueStatus,
    { attachedTo: project._id },
    { lookup: { category: tracker.class.IssueStatusCategory } }
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
    defaultTimeReportDay: { $exists: false },
    workDayLength: { $exists: false }
  })
  await Promise.all(
    projects.map((project) =>
      tx.update(project, {
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
        workDayLength: WorkDayLength.EIGHT_HOURS
      })
    )
  )
}

async function upgradeProjectIssueStatuses (tx: TxOperations): Promise<void> {
  const projects = await tx.findAll(tracker.class.Project, { issueStatuses: undefined })

  if (projects.length > 0) {
    const categories = await tx.findAll(
      tracker.class.IssueStatusCategory,
      {},
      { sort: { order: SortingOrder.Ascending } }
    )

    for (const project of projects) {
      const defaultStatusId: Ref<IssueStatus> = generateId()

      await tx.update(project, { issueStatuses: 0, defaultIssueStatus: defaultStatusId })
      await createProjectIssueStatuses({ tx, projectId: project._id, categories, defaultStatusId })
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

async function upgradeComponentIcons (tx: TxOperations): Promise<void> {
  const components = await tx.findAll(tracker.class.Component, {})

  if (components.length === 0) {
    return
  }

  for (const component of components) {
    const icon = component.icon as unknown

    if (icon !== undefined) {
      continue
    }

    await tx.update(component, { icon: tracker.icon.Components })
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

async function upgradeComponents (tx: TxOperations): Promise<void> {
  await upgradeComponentIcons(tx)
}

async function renameProject (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TRACKER,
    {
      _class: { $in: [tracker.class.Issue, tracker.class.Sprint] },
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
      objectClass: tracker.class.Sprint,
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
      objectClass: { $in: [tracker.class.Issue, tracker.class.Sprint] },
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

async function setCreate (client: MigrationClient): Promise<void> {
  while (true) {
    const docs = await client.find<Issue>(
      DOMAIN_TRACKER,
      {
        _class: tracker.class.Issue,
        createOn: { $exists: false }
      },
      { limit: 500 }
    )
    if (docs.length === 0) {
      break
    }
    const creates = await client.find<TxCollectionCUD<Issue, Issue>>(DOMAIN_TX, {
      'tx.objectId': { $in: docs.map((it) => it._id) },
      'tx._class': core.class.TxCreateDoc
    })
    for (const doc of docs) {
      const tx = creates.find((it) => it.tx.objectId === doc._id)
      if (tx !== undefined) {
        await client.update(
          DOMAIN_TRACKER,
          {
            _id: doc._id
          },
          {
            createOn: tx.modifiedOn
          }
        )
        await client.update(
          DOMAIN_TX,
          {
            _id: tx._id
          },
          {
            'tx.attributes.createOn': tx.modifiedOn
          }
        )
      } else {
        await client.update(
          DOMAIN_TRACKER,
          {
            _id: doc._id
          },
          {
            createOn: doc.modifiedOn
          }
        )
      }
    }
  }
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
    await renameProject(client)
    await setCreate(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
    await upgradeProjects(tx)
    await upgradeIssues(tx)
    await upgradeComponents(tx)
  }
}
