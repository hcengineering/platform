//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  AttachedData,
  Doc,
  DocumentUpdate,
  MeasureContext,
  Ref,
  TxOperations
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubProject,
  GithubReviewThread
} from '@hcengineering/github'
import { LiveQuery } from '@hcengineering/query'
import { EmptyMarkup } from '@hcengineering/text'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  IntegrationContainer,
  IntegrationManager,
  githubDerivedSyncVersion,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import {
  PullRequestExternalData,
  ReviewThread as ReviewThreadExternalData,
  getUpdatedAtReviewThread,
  reviewThreadDetails
} from './githubTypes'
import { collectUpdate, deleteObjects, errorToObj, isGHWriteAllowed, syncChilds, syncDerivedDocuments } from './utils'

import { Analytics } from '@hcengineering/analytics'
import { PullRequestReviewThreadEvent } from '@octokit/webhooks-types'
import config from '../config'
import { syncConfig } from './syncConfig'

export type ReviewThreadData = Pick<
GithubReviewThread,
| 'threadId'
| 'line'
| 'diffSide'
| 'startLine'
| 'isCollapsed'
| 'isPinned'
| 'isResolved'
| 'isOutdated'
| 'path'
| 'originalLine'
| 'originalStartLine'
| 'resolvedBy'
| 'startDiffSide'
>

export class ReviewThreadSyncManager implements DocSyncManager {
  provider!: IntegrationManager

  createCommentPromise: Promise<DocumentUpdate<DocSyncInfo>> | undefined

  externalDerivedSync = true

  constructor (
    readonly ctx: MeasureContext,
    readonly client: TxOperations,
    readonly lq: LiveQuery
  ) {}

  async init (provider: IntegrationManager): Promise<void> {
    this.provider = provider
  }

  eventSync = new Map<string, Promise<void>>()
  async handleEvent<T>(integration: IntegrationContainer, derivedClient: TxOperations, evt: T): Promise<void> {
    await this.createCommentPromise
    const event = evt as PullRequestReviewThreadEvent

    if (event.sender.type === 'Bot') {
      // Ignore events from Bot if it is our bot
      // No need to handle event from ourself
      if (event.sender.login.includes(config.BotName)) {
        return
      }
    }
    this.ctx.info('reviewThreads:handleEvent', { event, workspace: this.provider.getWorkspaceId().name })

    const { project, repository } = await this.provider.getProjectAndRepository(event.repository.node_id)
    if (project === undefined || repository === undefined) {
      this.ctx.info('No project for repository', {
        name: event.repository.name,
        workspace: this.provider.getWorkspaceId().name
      })
      return
    }

    await this.eventSync.get(event.thread.node_id)
    const promise = this.processEvent(event, derivedClient, repository, integration)
    this.eventSync.set(event.thread.node_id, promise)
    await promise
    this.eventSync.delete(event.thread.node_id)
  }

  async handleDelete (
    existing: Doc | undefined,
    info: DocSyncInfo,
    derivedClient: TxOperations,
    deleteExisting: boolean
  ): Promise<boolean> {
    const container = await this.provider.getContainer(info.space)
    if (container === undefined) {
      return false
    }
    if (
      container?.container === undefined ||
      ((container.project.projectNodeId === undefined ||
        !container.container.projectStructure.has(container.project._id)) &&
        syncConfig.MainProject)
    ) {
      return false
    }

    const commentExternal = info.external

    if (commentExternal === undefined) {
      // No external issue yet, safe delete, since platform document will be deleted a well.
      return true
    }
    const account =
      existing?.createdBy ?? (await this.provider.getAccountU(commentExternal.user))?._id ?? core.account.System

    if (commentExternal !== undefined) {
      try {
        await this.deleteGithubDocument(container, account, commentExternal.node_id)
      } catch (err: any) {
        let cnt = false
        if (Array.isArray(err.errors)) {
          for (const e of err.errors) {
            if (e.type === 'NOT_FOUND') {
              // Ok issue is already deleted
              cnt = true
              break
            }
          }
        }
        if (!cnt) {
          this.ctx.error('Error', { err })
          Analytics.handleError(err)
          await derivedClient.update(info, { error: errorToObj(err) })
        }
      }
    }

    if (existing !== undefined && deleteExisting) {
      await deleteObjects(this.ctx, this.client, [existing], account)
    }
    return true
  }

  async deleteGithubDocument (container: ContainerFocus, account: Ref<Account>, id: string): Promise<void> {
    // Not supported
  }

  private async processEvent (
    event: PullRequestReviewThreadEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    integration: IntegrationContainer
  ): Promise<void> {
    const account = (await this.provider.getAccountU(event.sender))?._id ?? core.account.System

    let externalData: ReviewThreadExternalData
    try {
      const response: any = await integration.octokit?.graphql(
        `
        query listReview($reviewID: ID!) {
          node(id: $reviewID) {
            ... on PullRequestReviewThread {
              ${reviewThreadDetails}
            }
          }
        }
        `,
        {
          reviewID: event.thread.node_id
        }
      )
      externalData = response.node
    } catch (err: any) {
      this.ctx.error('Error', { err })
      Analytics.handleError(err)
      return
    }
    if (externalData === undefined) {
      return
    }

    switch (event.action) {
      case 'resolved':
      case 'unresolved': {
        const isResolved = event.action === 'resolved'
        const reviewData = await this.client.findOne(github.class.DocSyncInfo, {
          url: event.thread.node_id.toLocaleLowerCase()
        })

        if (reviewData !== undefined) {
          const reviewObj: GithubReviewThread | undefined = await this.client.findOne<GithubReviewThread>(
            reviewData.objectClass,
            {
              _id: reviewData._id as unknown as Ref<GithubReviewThread>
            }
          )
          if (reviewObj !== undefined) {
            const lastModified = Date.now()
            await derivedClient.diffUpdate(
              reviewData,
              {
                external: externalData,
                current: { ...reviewData.current, isResolved },
                needSync: githubSyncVersion,
                lastModified
              },
              lastModified
            )
            await this.client.diffUpdate(
              reviewObj,
              {
                isResolved,
                resolvedBy: account
              },
              lastModified,
              account
            )

            // We need to trigger PR external update, to properly handle todos.
          }

          const reviewPR = await this.client.findOne(github.class.DocSyncInfo, {
            url: (reviewData.parent ?? '').toLowerCase()
          })
          if (reviewPR !== undefined) {
            await derivedClient.update(reviewPR, {
              externalVersion: ''
            })
          }
          this.provider.sync()
        }
        break
      }
    }
  }

  async sync (
    existing: Doc | undefined,
    info: DocSyncInfo,
    parent: DocSyncInfo | undefined,
    derivedClient: TxOperations
  ): Promise<DocumentUpdate<DocSyncInfo> | undefined> {
    const container = await this.provider.getContainer(info.space)
    if (container?.container === undefined) {
      return { needSync: githubSyncVersion }
    }
    if (parent === undefined) {
      return { needSync: githubSyncVersion }
    }
    if (info.external === undefined) {
      // TODO: Use selected repository
      const repo = await this.provider.getRepositoryById(parent?.repository)
      if (repo?.nodeId === undefined) {
        // No need to sync if parent repository is not defined.
        return { needSync: githubSyncVersion }
      }

      // If no external document, we need to create it.
      this.createCommentPromise = this.createGithubReviewThread(container, existing, info, parent, derivedClient)
      return await this.createCommentPromise
    }
    const review = info.external as ReviewThreadExternalData

    // Use first comment as author, since github doesn't provide one.
    const account =
      existing?.modifiedBy ??
      (await this.provider.getAccount(review.comments.nodes[0].author ?? null))?._id ??
      core.account.System

    const messageData: ReviewThreadData = {
      threadId: review.id,
      diffSide: review.diffSide,
      isCollapsed: review.isCollapsed,
      isOutdated: review.isOutdated,
      isResolved: review.isResolved,
      line: review.line,
      startLine: review.startLine,
      originalLine: review.originalLine,
      originalStartLine: review.originalStartLine,
      path: review.path,
      resolvedBy: (await this.provider.getAccount(review.resolvedBy))?._id ?? core.account.System,
      startDiffSide: review.startDiffSide
    }
    if (existing === undefined) {
      try {
        await this.createReviewThread(info, messageData, parent, review, account)

        // We need trigger comments, if their sync data created before
        await syncChilds(info, this.client, derivedClient)
        return { needSync: githubSyncVersion, current: messageData }
      } catch (err: any) {
        this.ctx.error('Error', { err })
        Analytics.handleError(err)
        return { needSync: githubSyncVersion, error: errorToObj(err) }
      }
    } else {
      await this.handleDiffUpdate(existing, info, messageData, container, parent, review, account, derivedClient)
    }
    return { current: messageData, needSync: githubSyncVersion }
  }

  private async handleDiffUpdate (
    existing: Doc,
    info: DocSyncInfo,
    reviewData: ReviewThreadData,
    container: ContainerFocus,
    parent: DocSyncInfo,
    review: ReviewThreadExternalData,
    account: Ref<Account>,
    derivedClient: TxOperations
  ): Promise<void> {
    const repository = await this.provider.getRepositoryById(info.repository)
    if (repository === undefined) {
      return
    }

    const existingReview = existing as GithubReviewThread

    const previousData: ReviewThreadData = info.current ?? ({} as unknown as ReviewThreadData)

    const update = collectUpdate<GithubReviewThread>(previousData, reviewData, Object.keys(reviewData))

    const platformUpdate = collectUpdate<GithubReviewThread>(previousData, existing, Object.keys(reviewData))

    // We should remove changes we already have from github changed.
    for (const [k, v] of Object.entries(update)) {
      if ((platformUpdate as any)[k] !== v) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (platformUpdate as any)[k]
      }
    }
    // Remove current same values from update
    for (const [k, v] of Object.entries(existingReview)) {
      if ((update as any)[k] === v) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (update as any)[k]
      }
    }

    if (Object.keys(platformUpdate).length > 0) {
      // Check and update  external
      if (platformUpdate.isResolved !== undefined) {
        const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit
        const q = `mutation updateReviewThread($threadID: ID!) {
          ${platformUpdate.isResolved ? 'resolveReviewThread' : 'unresolveReviewThread'} (
            input: {
              threadId: $threadID
            }) {
            thread {
              id
              isResolved
            }
          }
        }`
        try {
          if (isGHWriteAllowed()) {
            await okit?.graphql(q, {
              threadID: review.id
            })
          }
        } catch (err: any) {
          update.isResolved = !platformUpdate.isResolved
          platformUpdate.isResolved = !platformUpdate.isResolved
          this.ctx.error('Error', { err })
          Analytics.handleError(err)
        }
        await derivedClient.update(info, { external: { ...info.external, isResolved: platformUpdate.isResolved } })
      }
    }
    if (Object.keys(update).length > 0) {
      await this.client.update(existing, update, false, getUpdatedAtReviewThread(review), account)
    }
  }

  private async createReviewThread (
    info: DocSyncInfo,
    messageData: ReviewThreadData,
    parent: DocSyncInfo,
    review: ReviewThreadExternalData,
    account: Ref<Account>
  ): Promise<void> {
    const _id: Ref<GithubReviewThread> = info._id as unknown as Ref<GithubReviewThread>
    const value: AttachedData<GithubReviewThread> = {
      ...messageData
    }
    await this.client.addCollection(
      github.class.GithubReviewThread,
      info.space,
      parent._id,
      parent.objectClass,
      'activity',
      value,
      _id,
      new Date(review.comments.nodes[0].createdAt ?? Date.now()).getTime(),
      account
    )
  }

  async createGithubReviewThread (
    container: ContainerFocus,
    existing: Doc | undefined,
    info: DocSyncInfo,
    parent: DocSyncInfo,
    derivedClient: TxOperations
  ): Promise<DocumentUpdate<DocSyncInfo>> {
    // TODO: Use selected repository
    const repo = await this.provider.getRepositoryById(parent?.repository)
    if (repo?.nodeId === undefined) {
      // No need to sync if parent repository is not defined.
      return { needSync: githubSyncVersion }
    }

    if (parent === undefined) {
      return {}
    }
    const existingReview = existing as GithubReviewThread
    const okit =
      (await this.provider.getOctokit(existingReview.modifiedBy as Ref<PersonAccount>)) ?? container.container.octokit

    // No external version yet, create it.
    // Will be added into pending state.
    try {
      // Will be created in pending state.
      const q = `mutation addPullRequestReviewThread($prID: ID!, $body: String!) {
          addPullRequestReviewThread(input:{
            pullRequestId: $prID,
            path: "${existingReview.path}"
            body: $body,
            line: ${existingReview.line},
            side: LEFT,
            startSide: LEFT,
           }) {
             pullRequestReview {
               ${reviewThreadDetails}
             }
           }
         }`

      if (isGHWriteAllowed()) {
        const response:
        | {
          addPullRequestReviewThread: {
            thread: ReviewThreadExternalData
          }
        }
        | undefined = await okit?.graphql(q, {
          prID: (parent.external as PullRequestExternalData).id,
          body: EmptyMarkup // TODO: Need to replace with first comment on comment sync.
        })

        const reviewExternal = response?.addPullRequestReviewThread?.thread

        if (reviewExternal !== undefined) {
          const upd: DocumentUpdate<DocSyncInfo> = {
            url: reviewExternal.id,
            external: reviewExternal,
            current: existing,
            repository: repo._id,
            version: githubSyncVersion,
            externalVersion: githubExternalSyncVersion
          }
          // We need to update in current promise, to prevent event changes.
          await derivedClient.update(info, upd)
        }
      }
      return {}
    } catch (err: any) {
      this.ctx.error('Error', { err })
      Analytics.handleError(err)
      return { needSync: githubSyncVersion, error: errorToObj(err) }
    }
  }

  async externalSync (
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    kind: ExternalSyncField,
    syncDocs: DocSyncInfo[],
    repo: GithubIntegrationRepository,
    prj: GithubProject
  ): Promise<void> {
    if (kind === 'externalVersion') {
      // No need to perform external sync for review threads, so let's update marks
      const tx = derivedClient.apply()
      for (const d of syncDocs) {
        await tx.update(d, { externalVersion: githubExternalSyncVersion })
      }
      await tx.commit()
      this.provider.sync()
    } else if (kind === 'derivedVersion') {
      // We need to create comments.
      // Find a pull request parents

      const allParents = syncDocs
        .map((it) => (it.parent ?? '').toLowerCase())
        .filter((it, idx, arr) => it != null && arr.indexOf(it) === idx)
      const parents = await derivedClient.findAll(github.class.DocSyncInfo, {
        url: {
          $in: allParents
        }
      })

      for (const d of syncDocs) {
        const ext = d.external as ReviewThreadExternalData
        if (ext == null) {
          continue
        }
        if (ext.comments.nodes.length < ext.comments.totalCount) {
          // TODO: We need to fetch missing items.
        }

        const prParent = parents.find((it) => it.url === d.parent?.toLowerCase())
        if (prParent === undefined) {
          continue
        }
        await syncDerivedDocuments<ReviewThreadExternalData & { url: string }>(
          derivedClient,
          prParent,
          { ...ext, url: (d.parent ?? '').toLowerCase() }, // Parent is Pull request.
          prj,
          repo,
          github.class.GithubReviewComment,
          {
            reviewThreadId: ext.id
          },
          (ext) => ext.comments.nodes,
          { reviewThreadId: ext.id }
        )
      }
      const tx = derivedClient.apply()
      for (const d of syncDocs) {
        await tx.update(d, { derivedVersion: githubDerivedSyncVersion })
      }
      await tx.commit()
      this.provider.sync()
    }
  }

  repositoryDisabled (integration: IntegrationContainer, repo: GithubIntegrationRepository): void {}

  async externalFullSync (
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    projects: GithubProject[],
    repositories: GithubIntegrationRepository[]
  ): Promise<void> {
    // No external sync for reviews, they are done in pull requests.
  }
}
