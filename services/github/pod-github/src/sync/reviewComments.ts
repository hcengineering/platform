//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  AttachedData,
  Doc,
  DocData,
  DocumentUpdate,
  MeasureContext,
  Ref,
  TxOperations
} from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubProject,
  GithubReviewComment
} from '@hcengineering/github'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  IntegrationContainer,
  IntegrationManager,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import { ReviewComment as ReviewCommentExternalData, reviewCommentDetails } from './githubTypes'
import { collectUpdate, deleteObjects, errorToObj, isGHWriteAllowed } from './utils'

import { Analytics } from '@hcengineering/analytics'
import { PullRequestReviewCommentCreatedEvent, PullRequestReviewCommentEvent } from '@octokit/webhooks-types'
import config from '../config'
import { syncConfig } from './syncConfig'

export type ReviewCommentData = DocData<GithubReviewComment>

export class ReviewCommentSyncManager implements DocSyncManager {
  provider!: IntegrationManager

  createCommentPromise: Promise<DocumentUpdate<DocSyncInfo>> | undefined

  externalDerivedSync = false

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
    const event = evt as PullRequestReviewCommentEvent

    if (event.sender.type === 'Bot') {
      // Ignore events from Bot if it is our bot
      // No need to handle event from ourself
      if (event.sender.login.includes(config.BotName)) {
        return
      }
    }
    this.ctx.info('reviewComments:handleEvent', {
      action: event.action,
      login: event.sender.login,
      workspace: this.provider.getWorkspaceId().name
    })
    const { project, repository } = await this.provider.getProjectAndRepository(event.repository.node_id)
    if (project === undefined || repository === undefined) {
      this.ctx.info('No project for repository', {
        name: event.repository.name,
        workspace: this.provider.getWorkspaceId().name
      })
      return
    }
    await this.eventSync.get(event.comment.html_url)
    const promise = this.processEvent(event, derivedClient, repository, integration)
    this.eventSync.set(event.comment.html_url, promise)
    await promise
    this.eventSync.delete(event.comment.html_url)
  }

  async handleDelete (
    existing: Doc | undefined,
    info: DocSyncInfo,
    derivedClient: TxOperations,
    deleteExisting: boolean,
    parent?: DocSyncInfo
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
        await this.deleteGithubDocument(container, account, commentExternal.node_id, derivedClient, parent)
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

  async deleteGithubDocument (
    container: ContainerFocus,
    account: Ref<Account>,
    id: string,
    derivedClient: TxOperations,
    parent?: DocSyncInfo
  ): Promise<void> {
    const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit
    const q = `mutation deleteReviewComment($reviewID: ID!) {
      deletePullRequestReviewComment(input: {
        id: $reviewID
      }) {
        pullRequestReview {
          url
        }
      }
    }`
    if (isGHWriteAllowed()) {
      await okit?.graphql(q, {
        reviewID: id
      })
    }
    if (parent !== undefined) {
      // We need to force pull request update to sync review content properly.
      await derivedClient.update(parent, { externalVersion: '', derivedVersion: '' })
    }
  }

  private async processEvent (
    event: PullRequestReviewCommentEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    integration: IntegrationContainer
  ): Promise<void> {
    const account = (await this.provider.getAccountU(event.sender))?._id ?? core.account.System

    let externalData: ReviewCommentExternalData
    try {
      const response: any = await integration.octokit?.graphql(
        `
        query listReview($reviewID: ID!) {
          node(id: $reviewID) {
            ... on PullRequestReviewComment {
              ${reviewCommentDetails}
            }
          }
        }
        `,
        {
          reviewID: event.comment.node_id
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
      case 'created': {
        await this.createSyncData(event, derivedClient, repo, externalData)
        break
      }
      case 'deleted': {
        const reviewData = await this.client.findOne(github.class.DocSyncInfo, {
          url: (event.comment.html_url ?? '').toLowerCase()
        })
        if (reviewData !== undefined) {
          await derivedClient.update<DocSyncInfo>(
            reviewData,
            {
              deleted: true,
              needSync: ''
            },
            false,
            Date.now(),
            account
          )
          this.provider.sync()
        }
        break
      }
      case 'edited': {
        const reviewData = await this.client.findOne(github.class.DocSyncInfo, {
          url: (event.comment.html_url ?? '').toLowerCase()
        })

        if (reviewData !== undefined) {
          const reviewObj: GithubReviewComment | undefined = await this.client.findOne<GithubReviewComment>(
            reviewData.objectClass,
            {
              _id: reviewData._id as unknown as Ref<GithubReviewComment>
            }
          )
          if (reviewObj !== undefined) {
            const lastModified = Date.now()
            const body = await this.provider.getMarkup(integration, event.comment.body)
            await derivedClient.diffUpdate(
              reviewData,
              {
                external: externalData,
                externalVersion: githubExternalSyncVersion,
                current: { ...reviewData.current, body },
                needSync: githubSyncVersion,
                lastModified
              },
              lastModified
            )
            await this.client.update(
              reviewObj,
              {
                body
              },
              false,
              lastModified,
              account
            )
            this.provider.sync()
          }
        }
        break
      }
    }
  }

  private async createSyncData (
    createdEvent: PullRequestReviewCommentCreatedEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    externalData: ReviewCommentExternalData
  ): Promise<void> {
    const reviewData = await this.client.findOne(github.class.DocSyncInfo, {
      url: (createdEvent.comment.html_url ?? '').toLowerCase()
    })

    if (reviewData === undefined) {
      await derivedClient.createDoc(github.class.DocSyncInfo, repo.githubProject as Ref<GithubProject>, {
        url: (createdEvent.comment.html_url ?? '').toLowerCase(),
        needSync: '',
        githubNumber: 0,
        repository: repo._id,
        objectClass: github.class.GithubReviewComment,
        external: externalData,
        externalVersion: githubExternalSyncVersion,
        parent: createdEvent.pull_request.html_url,
        lastModified: new Date(createdEvent.comment.updated_at ?? Date.now()).getTime()
      })
      this.provider.sync()
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
      this.createCommentPromise = this.createGithubReviewComment(container, existing, info, parent, derivedClient)
      return await this.createCommentPromise
    }
    const reviewComment = info.external as ReviewCommentExternalData

    const account =
      existing?.modifiedBy ?? (await this.provider.getAccount(reviewComment.author))?._id ?? core.account.System

    if (info.reviewThreadId === undefined && reviewComment.replyTo?.url !== undefined) {
      const rthread = await derivedClient.findOne(github.class.GithubReviewComment, {
        url: reviewComment.replyTo?.url?.toLowerCase()
      })
      if (rthread !== undefined) {
        info.reviewThreadId = rthread.reviewThreadId
        await derivedClient.update(info, { reviewThreadId: info.reviewThreadId })
      }
    }

    const messageData: ReviewCommentData = {
      body: await this.provider.getMarkup(container.container, reviewComment.body),
      diffHunk: reviewComment.diffHunk,
      isMinimized: reviewComment.isMinimized,
      reviewUrl: reviewComment.pullRequestReview.url,
      line: reviewComment.line,
      startLine: reviewComment.startLine,
      originalLine: reviewComment.originalLine,
      outdated: reviewComment.outdated,
      path: reviewComment.path,
      url: reviewComment.url.toLowerCase(),
      minimizedReason: reviewComment.minimizedReason,
      includesCreatedEdit: reviewComment.includesCreatedEdit,
      originalStartLine: reviewComment.originalLine,
      replyToUrl: reviewComment.replyTo?.url,
      reviewThreadId: info.reviewThreadId
    }
    if (existing === undefined) {
      try {
        await this.createReviewComment(info, messageData, parent, reviewComment, account)
        return { needSync: githubSyncVersion, current: messageData }
      } catch (err: any) {
        this.ctx.error('Error', { err })
        Analytics.handleError(err)
        return { needSync: githubSyncVersion, error: errorToObj(err) }
      }
    } else {
      await this.handleDiffUpdate(existing, info, messageData, container, parent, reviewComment, account, derivedClient)
    }
    return { current: messageData, needSync: githubSyncVersion }
  }

  private async handleDiffUpdate (
    existing: Doc,
    info: DocSyncInfo,
    reviewCommentData: ReviewCommentData,
    container: ContainerFocus,
    parent: DocSyncInfo,
    reviewComment: ReviewCommentExternalData,
    account: Ref<Account>,
    derivedClient: TxOperations
  ): Promise<void> {
    const repository = await this.provider.getRepositoryById(info.repository)
    if (repository === undefined) {
      return
    }

    const existingReview = existing as GithubReviewComment

    const previousData: ReviewCommentData = info.current ?? ({} as unknown as ReviewCommentData)

    const update = collectUpdate<GithubReviewComment>(previousData, reviewCommentData, Object.keys(reviewCommentData))

    const platformUpdate = collectUpdate<GithubReviewComment>(previousData, existing, Object.keys(reviewCommentData))

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
      if (platformUpdate.body !== undefined) {
        const body = await this.provider.getMarkup(container.container, platformUpdate.body)
        const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit
        const q = `mutation updateReviewComment($commentID: ID!, $body: String!) {
          updatePullRequestReviewComment(input: {
            threadId: $threadID
          }) {
          pullRequestReviewComment {
            id
          }
        }`
        if (isGHWriteAllowed()) {
          await okit?.graphql(q, {
            threadID: reviewComment.id,
            body
          })
        }
        await derivedClient.update(info, { external: { ...info.external, body } })
      }
    }
    if (Object.keys(update).length > 0) {
      await this.client.update(
        existing,
        update,
        false,
        new Date(reviewComment.updatedAt ?? Date.now()).getTime(),
        account
      )
    }
  }

  private async createReviewComment (
    info: DocSyncInfo,
    messageData: ReviewCommentData,
    parent: DocSyncInfo,
    review: ReviewCommentExternalData,
    account: Ref<Account>
  ): Promise<void> {
    const _id: Ref<GithubReviewComment> = info._id as unknown as Ref<GithubReviewComment>
    const value: AttachedData<GithubReviewComment> = {
      ...messageData
    }
    await this.client.addCollection(
      github.class.GithubReviewComment,
      info.space,
      parent._id,
      parent.objectClass,
      'reviewComments',
      value,
      _id,
      new Date(review.createdAt ?? Date.now()).getTime(),
      account
    )
  }

  async createGithubReviewComment (
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
    const existingReview = existing as GithubReviewComment
    const okit =
      (await this.provider.getOctokit(existingReview.modifiedBy as Ref<PersonAccount>)) ?? container.container.octokit

    // No external version yet, create it.
    try {
      const q = `mutation createComment($prID: ID!, $body: String!) {
          addPullRequestReviewThreadReply(input:{
            pullRequestReviewThreadId: $prID,
            body: $body
           }) {
            comment {
               ${reviewCommentDetails}
             }
           }
         }`

      if (isGHWriteAllowed()) {
        const response:
        | {
          addPullRequestReviewThreadReply: {
            comment: ReviewCommentExternalData
          }
        }
        | undefined = await okit?.graphql(q, {
          prID: existingReview.reviewThreadId,
          body: (await this.provider.getMarkdown(existingReview.body)) ?? ''
        })

        const reviewExternal = response?.addPullRequestReviewThreadReply?.comment

        if (reviewExternal !== undefined) {
          const upd: DocumentUpdate<DocSyncInfo> = {
            url: reviewExternal.url.toLowerCase(),
            external: reviewExternal,
            current: existing,
            repository: repo._id,
            needSync: githubSyncVersion,
            externalVersion: githubExternalSyncVersion
          }
          // We need to update in current promise, to prevent event changes.
          await derivedClient.update(info, upd)

          await this.client.update(existingReview, {
            diffHunk: reviewExternal.diffHunk,
            isMinimized: reviewExternal.isMinimized,
            reviewUrl: reviewExternal.pullRequestReview.url,
            line: reviewExternal.line,
            startLine: reviewExternal.startLine,
            originalLine: reviewExternal.originalLine,
            outdated: reviewExternal.outdated,
            path: reviewExternal.path,
            url: reviewExternal.url.toLowerCase(),
            minimizedReason: reviewExternal.minimizedReason,
            includesCreatedEdit: reviewExternal.includesCreatedEdit,
            originalStartLine: reviewExternal.originalLine,
            replyToUrl: reviewExternal.replyTo?.url,
            reviewThreadId: info.reviewThreadId ?? existingReview.reviewThreadId
          })
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
    repository: GithubIntegrationRepository,
    project: GithubProject
  ): Promise<void> {
    // No need to perform external sync for reviews, so let's update marks
    const tx = derivedClient.apply()
    for (const d of syncDocs) {
      await tx.update(d, { externalVersion: githubExternalSyncVersion })
    }
    await tx.commit()
    this.provider.sync()
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
