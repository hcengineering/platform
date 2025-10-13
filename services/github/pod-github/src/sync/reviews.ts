//
// Copyright © 2023 Hardcore Engineering Inc.
//
import core, {
  PersonId,
  AttachedData,
  Doc,
  DocumentUpdate,
  MeasureContext,
  Ref,
  TxOperations,
  withContext
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubProject,
  GithubPullRequestReviewState,
  GithubReview
} from '@hcengineering/github'
import { LiveQuery } from '@hcengineering/query'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  IntegrationContainer,
  IntegrationManager,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import { PullRequestExternalData, Review as ReviewExternalData, reviewDetails, toReviewState } from './githubTypes'
import { collectUpdate, deleteObjects, errorToObj, isGHWriteAllowed, syncChilds } from './utils'

import { Analytics } from '@hcengineering/analytics'
import { PullRequestReviewEvent, PullRequestReviewSubmittedEvent } from '@octokit/webhooks-types'
import config from '../config'

export type ReviewData = Pick<GithubReview, 'body' | 'state' | 'comments'>

export class ReviewSyncManager implements DocSyncManager {
  provider!: IntegrationManager

  createCommentPromise: Promise<DocumentUpdate<DocSyncInfo>> | undefined

  externalDerivedSync = false

  constructor (
    readonly client: TxOperations,
    readonly lq: LiveQuery
  ) {}

  async init (provider: IntegrationManager): Promise<void> {
    this.provider = provider
  }

  eventSync = new Map<string, Promise<void>>()

  @withContext('reviews-handleEvent')
  async handleEvent<T>(
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    evt: T
  ): Promise<void> {
    await this.createCommentPromise
    const event = evt as PullRequestReviewEvent

    if (event.sender.type === 'Bot') {
      // Ignore events from Bot if it is our bot
      // No need to handle event from ourself
      if (event.sender.login.includes(config.BotName)) {
        return
      }
    }
    ctx.info('reviews:handleEvent', { event, workspace: this.provider.getWorkspaceId() })

    const { project, repository } = await this.provider.getProjectAndRepository(event.repository.node_id)
    if (project === undefined || repository === undefined) {
      ctx.info('No project for repository', {
        name: event.repository.name,
        workspace: this.provider.getWorkspaceId()
      })
      return
    }

    await this.eventSync.get(event.review.html_url)
    const promise = this.processEvent(ctx, event, derivedClient, repository, integration)
    this.eventSync.set(event.review.html_url, promise)
    try {
      await promise
    } catch (err: any) {
      ctx.error('Error processing event', { error: err })
    } finally {
      this.eventSync.delete(event.review.html_url)
    }
  }

  async handleDelete (
    ctx: MeasureContext,
    existing: Doc | undefined,
    info: DocSyncInfo,
    derivedClient: TxOperations,
    deleteExisting: boolean
  ): Promise<boolean> {
    const container = await this.provider.getContainer(info.space)
    if (container === undefined) {
      return false
    }

    const commentExternal = info.external

    if (commentExternal === undefined) {
      // No external issue yet, safe delete, since platform document will be deleted a well.
      return true
    }
    const account =
      existing?.createdBy ?? (await this.provider.getAccountU(commentExternal.user)) ?? core.account.System

    if (commentExternal !== undefined) {
      try {
        await this.deleteGithubDocument(ctx, container, account, commentExternal.node_id)
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
          ctx.error('Error', { err })
          Analytics.handleError(err)
          await derivedClient.update(info, { error: errorToObj(err) })
        }
      }
    }

    if (existing !== undefined && deleteExisting) {
      await deleteObjects(ctx, this.client, [existing], account)
    }
    return true
  }

  async deleteGithubDocument (
    ctx: MeasureContext,
    container: ContainerFocus,
    account: PersonId,
    id: string
  ): Promise<void> {
    const okit = (await this.provider.getOctokit(ctx, account)) ?? container.container.octokit
    const q = `mutation deleteReview($reviewID: ID!) {
      deletePullRequestReview(input: {
        pullRequestReviewId: $reviewID
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
  }

  private async processEvent (
    ctx: MeasureContext,
    event: PullRequestReviewEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    integration: IntegrationContainer
  ): Promise<void> {
    const account = (await this.provider.getAccountU(event.sender)) ?? core.account.System

    let externalData: ReviewExternalData
    try {
      const response: any = await integration.octokit?.graphql(
        `
        query listReview($reviewID: ID!) {
          node(id: $reviewID) {
            ... on PullRequestReview {
              ${reviewDetails}
            }
          }
        }
        `,
        {
          reviewID: event.review.node_id
        }
      )
      externalData = response.node
    } catch (err: any) {
      ctx.error('Error', { err })
      Analytics.handleError(err)
      return
    }
    if (externalData === undefined) {
      return
    }

    switch (event.action) {
      case 'submitted': {
        await this.createSyncData(event, derivedClient, repo, externalData)

        const parentDoc = await this.client.findOne(github.class.DocSyncInfo, {
          space: repo.githubProject as Ref<GithubProject>,
          url: (event.pull_request.html_url ?? '').toLowerCase()
        })
        if (parentDoc !== undefined) {
          await derivedClient.update<DocSyncInfo>(parentDoc, {
            externalVersion: '',
            derivedVersion: ''
          })
          this.provider.sync()
        }
        break
      }
      case 'dismissed': {
        const reviewData = await this.client.findOne(github.class.DocSyncInfo, {
          space: repo.githubProject as Ref<GithubProject>,
          url: (event.review.html_url ?? '').toLowerCase()
        })

        if (reviewData !== undefined) {
          const reviewObj: GithubReview | undefined = await this.client.findOne<GithubReview>(reviewData.objectClass, {
            _id: reviewData._id as unknown as Ref<GithubReview>
          })
          if (reviewObj !== undefined) {
            const lastModified = Date.now()
            await derivedClient.diffUpdate(
              reviewData,
              {
                external: externalData,
                current: { ...reviewData.current, state: GithubPullRequestReviewState.Dismissed },
                needSync: githubSyncVersion,
                lastModified
              },
              lastModified
            )
            await this.client.update(
              reviewObj,
              {
                state: GithubPullRequestReviewState.Dismissed
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
    createdEvent: PullRequestReviewSubmittedEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    externalData: ReviewExternalData
  ): Promise<void> {
    const reviewData = await this.client.findOne(github.class.DocSyncInfo, {
      space: repo.githubProject as Ref<GithubProject>,
      url: (createdEvent.review.html_url ?? '').toLowerCase()
    })

    if (reviewData === undefined) {
      await derivedClient.createDoc(github.class.DocSyncInfo, repo.githubProject as Ref<GithubProject>, {
        url: createdEvent.review.html_url.toLowerCase(),
        needSync: '',
        githubNumber: 0,
        repository: repo._id,
        objectClass: github.class.GithubReview,
        external: externalData,
        externalVersion: githubExternalSyncVersion,
        derivedVersion: '',
        parent: (createdEvent.pull_request.html_url ?? '').toLowerCase(),
        lastModified: new Date(createdEvent.review.submitted_at ?? Date.now()).getTime()
      })
    }
  }

  @withContext('reviews-sync')
  async sync (
    ctx: MeasureContext,
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
      this.createCommentPromise = this.createGithubReview(ctx, container, existing, info, parent, derivedClient)
      return await this.createCommentPromise
    }
    const review = info.external as ReviewExternalData

    const account = existing?.modifiedBy ?? (await this.provider.getAccount(review.author)) ?? core.account.System

    const messageData: ReviewData = {
      body: await this.provider.getMarkupSafe(container.container, review.body),
      state: toReviewState(review.state),
      comments: (review.comments?.nodes ?? []).map((it) => it.url)
    }
    if (existing === undefined) {
      try {
        await this.createReview(ctx, info, messageData, parent, review, account)

        await syncChilds(ctx, info, this.client, derivedClient)
        return { needSync: githubSyncVersion, current: messageData }
      } catch (err: any) {
        ctx.error('Error', { err })
        Analytics.handleError(err)
        return { needSync: githubSyncVersion, error: errorToObj(err) }
      }
    } else {
      await this.handleDiffUpdate(ctx, existing, info, messageData, container, parent, review, account)
    }
    return { current: messageData, needSync: githubSyncVersion }
  }

  @withContext('reviews-handleDiffUpdate')
  private async handleDiffUpdate (
    ctx: MeasureContext,
    existing: Doc,
    info: DocSyncInfo,
    reviewData: ReviewData,
    container: ContainerFocus,
    parent: DocSyncInfo,
    review: ReviewExternalData,
    account: PersonId
  ): Promise<void> {
    const repository = await this.provider.getRepositoryById(info.repository)
    if (repository === undefined) {
      return
    }

    const existingReview = existing as GithubReview

    const previousData: ReviewData = info.current ?? ({} as unknown as ReviewData)

    const update = collectUpdate<GithubReview>(previousData, reviewData, Object.keys(reviewData))

    const platformUpdate = collectUpdate<GithubReview>(previousData, existing, Object.keys(reviewData))

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
      // Check and update body with external
      // No update is possible for review.
    }
    if (Object.keys(update).length > 0) {
      await this.client.update(existing, update, false, new Date(review.updatedAt ?? Date.now()).getTime(), account)
    }
  }

  @withContext('reviews-createReview')
  private async createReview (
    ctx: MeasureContext,
    info: DocSyncInfo,
    messageData: ReviewData,
    parent: DocSyncInfo,
    review: ReviewExternalData,
    account: PersonId
  ): Promise<void> {
    const _id: Ref<GithubReview> = info._id as unknown as Ref<GithubReview>
    const value: AttachedData<GithubReview> = {
      ...messageData
    }
    await this.client.addCollection(
      github.class.GithubReview,
      info.space,
      parent._id,
      parent.objectClass,
      'activity',
      value,
      _id,
      new Date(review.submittedAt ?? review.createdAt ?? Date.now()).getTime(),
      account
    )
  }

  @withContext('reviews-createGithubReview')
  async createGithubReview (
    ctx: MeasureContext,
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
    const existingReview = existing as GithubReview
    const okit = (await this.provider.getOctokit(ctx, existingReview.modifiedBy)) ?? container.container.octokit

    // No external version yet, create it.
    try {
      // TOOD: Collect all threads and all pending comments to be added, and map them back.
      const q = `mutation createReview($prID: ID!, $body: String!, $state: PullRequestReviewEvent!) {
           addPullRequestReview(input:{
             pullRequestId: $prID,
             body: $body,
             event: $state
           }) {
             pullRequestReview {
               ${reviewDetails}
             }
           }
         }`

      if (isGHWriteAllowed()) {
        const response:
        | {
          addPullRequestReview: {
            pullRequestReview: ReviewExternalData
          }
        }
        | undefined = await okit?.graphql(q, {
          prID: (parent.external as PullRequestExternalData).id,
          body: (await this.provider.getMarkdown(existingReview.body)) ?? '',
          state: existingReview.state
        })

        const reviewExternal = response?.addPullRequestReview?.pullRequestReview

        if (reviewExternal !== undefined) {
          const upd: DocumentUpdate<DocSyncInfo> = {
            url: reviewExternal.url.toLowerCase(),
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
      ctx.error('Error', { err })
      Analytics.handleError(err)
      return { needSync: githubSyncVersion, error: errorToObj(err) }
    }
  }

  @withContext('reviews-externalSync')
  async externalSync (
    ctx: MeasureContext,
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

  repositoryDisabled (ctx: MeasureContext, integration: IntegrationContainer, repo: GithubIntegrationRepository): void {}

  @withContext('reviews-externalFullSync')
  async externalFullSync (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    projects: GithubProject[],
    repositories: GithubIntegrationRepository[]
  ): Promise<void> {
    // No external sync for reviews, they are done in pull requests.
  }
}
