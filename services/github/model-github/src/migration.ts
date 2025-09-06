//
// Copyright © 2023 Hardcore Engineering Inc.
//

import core, { DOMAIN_TX, toIdMap, type AnyAttribute, type Ref, type Status } from '@hcengineering/core'
import {
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationIterator,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import chunter from '@hcengineering/model-chunter'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_TASK } from '@hcengineering/model-task'
import task from '@hcengineering/task'
import { htmlToMarkup } from '@hcengineering/text'
import tracker, { type Component, type Issue, type Project } from '@hcengineering/tracker'
import {
  GithubPullRequestState,
  githubId,
  type DocSyncInfo,
  type GithubIntegration,
  type GithubIntegrationRepository,
  type GithubPullRequest
} from '@hcengineering/github'
import github from './plugin'

import { DOMAIN_TIME } from '@hcengineering/model-time'
import { DOMAIN_TRACKER } from '@hcengineering/model-tracker'
import time from '@hcengineering/time'
import { DOMAIN_GITHUB, DOMAIN_GITHUB_SYNC, DOMAIN_GITHUB_USER } from '.'

export async function guessStatus (status: Status, statuses: Status[]): Promise<Status> {
  const active = (): Status => statuses.find((it) => it.category === task.statusCategory.Active) as Status

  const lost = (): Status => statuses.find((it) => it.category === task.statusCategory.Lost) as Status
  const won = (): Status => statuses.find((it) => it.category === task.statusCategory.Won) as Status

  if (status.category === task.statusCategory.Won) {
    return won()
  }
  if (status.category === task.statusCategory.Lost) {
    return lost()
  }
  return active()
}
async function migratePullRequests (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TASK,
    { _class: github.class.GithubPullRequest, patch: { $exists: true } },
    { $unset: { patch: 1 } }
  )
  await client.update(
    DOMAIN_GITHUB,
    { _class: github.class.GithubPullRequest, 'external.patch': { $ne: true } },
    { $set: { patch: false } }
  )

  const integrations = await client.find<GithubIntegration>(DOMAIN_GITHUB, { _class: github.class.GithubIntegration })
  for (const i of integrations) {
    if (typeof i.installationId === 'string') {
      // We need to resync all integration
      await client.update(DOMAIN_GITHUB, { _id: i._id }, { installationId: parseInt(i.installationId) })
    }
  }
  await client.update(
    DOMAIN_GITHUB,
    { _class: github.class.DocSyncInfo, lastModified: { $exists: false } },
    { $set: { needUpdate: true } }
  )
}

async function migrateMissingStates (client: MigrationClient): Promise<void> {
  const prTaskTypes = toIdMap(
    client.model.findAllSync(task.class.TaskType, { descriptor: github.descriptors.PullRequest })
  )

  const allActiveStatuses = client.model.findAllSync(core.class.Status, { category: task.statusCategory.Active })

  const wonStatuses = client.model.findAllSync(core.class.Status, { category: task.statusCategory.Won })

  // We need to migrate Pull requests with merged to have a proper merged status, and not closed.
  const merged = await client.find<GithubPullRequest>(DOMAIN_TASK, {
    _class: github.class.GithubPullRequest,
    state: GithubPullRequestState.merged
  })
  for (const m of merged) {
    const tt = prTaskTypes.get(m.kind)
    if (tt === undefined) {
      return
    }
    const merged = wonStatuses.find((it) => tt.statuses.includes(it._id))

    if (merged !== undefined && m.status !== merged._id) {
      await client.update(DOMAIN_TASK, { _id: m._id }, { status: merged._id })
    }
  }

  const activePRs = await client.find<GithubPullRequest>(DOMAIN_TASK, {
    _class: github.class.GithubPullRequest,
    state: GithubPullRequestState.open
  })
  for (const m of activePRs) {
    const tt = prTaskTypes.get(m.kind)
    if (tt === undefined) {
      return
    }
    const active = allActiveStatuses.find((it) => tt.statuses.includes(it._id))

    if (active !== undefined && m.status !== active._id) {
      await client.update(DOMAIN_TASK, { _id: m._id }, { status: active._id })
    }
  }
  //
}

async function migrateDocSyncInfo (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_GITHUB,
    { _class: github.class.DocSyncInfo, objectClass: 'chunter:class:Comment' },
    { objectClass: chunter.class.ChatMessage }
  )
}

export const githubOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, githubId, [
      {
        state: 'pull-requests',
        mode: 'upgrade',
        func: migratePullRequests
      },
      {
        state: 'update-doc-sync-info',
        mode: 'upgrade',
        func: migrateDocSyncInfo
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, githubId, [])
  }
}

async function migrateTodoSpaces (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TIME,
    { _class: time.class.ToDo, [github.mixin.GithubTodo]: { $exists: true } },
    { $set: { space: time.space.ToDos } }
  )
}

async function migrateFixMissingDocSyncInfo (client: MigrationClient): Promise<void> {
  const projects = await client.find(DOMAIN_SPACE, {
    _class: tracker.class.Project,
    [github.mixin.GithubProject]: { $exists: true }
  })
  for (const p of projects) {
    const issuesIterator = await client.traverse<Issue>(
      DOMAIN_TASK,
      {
        _class: tracker.class.Issue,
        space: p._id as Ref<Project>
      },
      {
        projection: {
          _class: 1,
          space: 1,
          _id: 1,
          attachedTo: 1,
          modifiedBy: 1,
          modifiedOn: 1
        }
      }
    )
    let counter = 0
    try {
      while (true) {
        const docs = await issuesIterator.next(1000)
        if (docs === null || docs.length === 0) {
          break
        }
        const infos = await client.find(
          DOMAIN_GITHUB,
          {
            _class: github.class.DocSyncInfo,
            _id: { $in: docs.map((it) => it._id as unknown as Ref<DocSyncInfo>) }
          },
          {
            projection: {
              _id: 1
            }
          }
        )
        const infoIds = toIdMap(infos)
        let repository: Ref<GithubIntegrationRepository> | null = null
        for (const issue of docs) {
          if (!infoIds.has(issue._id)) {
            if (client.hierarchy.hasMixin(issue, github.mixin.GithubIssue)) {
              repository = client.hierarchy.as(issue, github.mixin.GithubIssue).repository
            }
            counter++
            // Missing
            await client.create<DocSyncInfo>(DOMAIN_GITHUB, {
              _class: github.class.DocSyncInfo,
              _id: issue._id as any,
              url: '',
              githubNumber: 0,
              repository,
              objectClass: issue._class,
              externalVersion: '#', // We need to put this one to handle new documents.
              needSync: '',
              derivedVersion: '',
              attachedTo: issue.attachedTo ?? tracker.ids.NoParent,
              space: issue.space,
              modifiedBy: issue.modifiedBy,
              modifiedOn: issue.modifiedOn
            })
          }
        }
      }
    } finally {
      await issuesIterator.close()
      if (counter > 0) {
        console.log('Created', counter, 'DocSyncInfos')
      }
    }
  }
}

async function migrateRemoveGithubComponents (client: MigrationClient): Promise<void> {
  const githubComponents = await client.find<Component>(DOMAIN_TRACKER, {
    _class: tracker.class.Component,
    [github.mixin.GithubComponent]: { $exists: true }
  })
  await client.update<Issue>(
    DOMAIN_TASK,
    {
      _class: { $in: [tracker.class.Issue, github.class.GithubPullRequest] },
      component: { $in: Array.from(githubComponents.map((it) => it._id)) }
    },
    { component: null }
  )
  await client.deleteMany(DOMAIN_TRACKER, { _id: { $in: Array.from(githubComponents.map((it) => it._id)) } })
}

async function migrateMarkup (client: MigrationClient): Promise<void> {
  const hierarchy = client.hierarchy
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const attributes = hierarchy.getAllAttributes(_class)
    const filtered = Array.from(attributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, core.class.TypeMarkup)
    })
    if (filtered.length === 0) continue

    const iterator = await client.traverse<DocSyncInfo>(DOMAIN_GITHUB, {
      _class: github.class.DocSyncInfo,
      objectClass: _class,
      current: { $exists: true }
    })

    try {
      await processMigrateMarkupFor(filtered, client, iterator)
    } finally {
      await iterator.close()
    }
  }
}

async function processMigrateMarkupFor (
  attributes: AnyAttribute[],
  client: MigrationClient,
  iterator: MigrationIterator<DocSyncInfo>
): Promise<void> {
  while (true) {
    const docs = await iterator.next(1000)
    if (docs === null || docs.length === 0) {
      break
    }

    const operations: { filter: MigrationDocumentQuery<DocSyncInfo>, update: MigrateUpdate<DocSyncInfo> }[] = []

    for (const doc of docs) {
      const update: MigrateUpdate<DocSyncInfo> = {}

      for (const attribute of attributes) {
        const value = doc.current[attribute.name]
        if (value != null) {
          update[`current.${attribute.name}`] = htmlToMarkup(value)
        }
      }

      if (Object.keys(update).length > 0) {
        operations.push({ filter: { _id: doc._id }, update })
      }
    }

    if (operations.length > 0) {
      await client.bulk(DOMAIN_GITHUB, operations)
    }
  }
}

export const githubOperationPreTime: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, githubId, [
      {
        state: 'fix-todo-spaces',
        mode: 'upgrade',
        func: migrateTodoSpaces
      },
      {
        state: 'fix-missing-doc-sync-info',
        mode: 'upgrade',
        func: migrateFixMissingDocSyncInfo
      },
      {
        state: 'remove-github-components',
        mode: 'upgrade',
        func: migrateRemoveGithubComponents
      },
      {
        state: 'markup',
        mode: 'upgrade',
        func: migrateMarkup
      },
      {
        state: 'migrate-missing-states',
        mode: 'upgrade',
        func: migrateMissingStates
      },
      {
        state: 'remove-doc-sync-info-txes',
        mode: 'upgrade',
        func: async (client) => {
          await client.deleteMany(DOMAIN_TX, { objectClass: github.class.DocSyncInfo })
        }
      },
      {
        state: 'migrate-github-sync-domain',
        mode: 'upgrade',
        func: async (client) => {
          await client.move(DOMAIN_GITHUB, { _class: github.class.DocSyncInfo }, DOMAIN_GITHUB_SYNC, 100)
          await client.move(DOMAIN_GITHUB, { _class: github.class.GithubUserInfo }, DOMAIN_GITHUB_USER)
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
