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
import { LiveQuery } from '@hcengineering/query'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubProject,
  GithubPullRequestReviewState,
  GithubReview
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
import { PullRequestExternalData, Review as ReviewExternalData, reviewDetails, toReviewState } from './githubTypes'
import { collectUpdate, deleteObjects, errorToObj, isGHWriteAllowed } from './utils'

import { Analytics } from '@hcengineering/analytics'
import { PullRequestReviewEvent, PullRequestReviewSubmittedEvent } from '@octokit/webhooks-types'
import config from '../config'
import { syncConfig } from './syncConfig'

export type ReviewData = Pick<GithubReview, 'body' | 'state' | 'comments'>

export class ReviewSyncManager implements DocSyncManager {
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
    const event = evt as PullRequestReviewEvent

    if (event.sender.type === 'Bot') {
      // Ignore events from Bot if it is our bot
      // No need to handle event from ourself
      if (event.sender.login.includes(config.BotName)) {
        return
      }
    }
    this.ctx.info('reviews:handleEvent', { event, workspace: this.provider.getWorkspaceId().name })

    const { project, repository } = await this.provider.getProjectAndRepository(event.repository.node_id)
    if (project === undefined || repository === undefined) {
      this.ctx.info('No project for repository', {
        name: event.repository.name,
        workspace: this.provider.getWorkspaceId().name
      })
      return
    }

    await this.eventSync.get(event.review.html_url)
    const promise = this.processEvent(event, derivedClient, repository, integration)
    this.eventSync.set(event.review.html_url, promise)
    await promise
    this.eventSync.delete(event.review.html_url)
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
    const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit
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
    event: PullRequestReviewEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    integration: IntegrationContainer
  ): Promise<void> {
    const account = (await this.provider.getAccountU(event.sender))?._id ?? core.account.System

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
      this.ctx.error('Error', { err })
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
        parent: createdEvent.pull_request.html_url,
        lastModified: new Date(createdEvent.review.submitted_at ?? Date.now()).getTime()
      })
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
      return {}
    }
    if (parent === undefined) {
      return { needSync: '' }
    }
    if (info.external === undefined) {
      // TODO: Use selected repository
      const repo = container.repository.find((it) => it._id === parent?.repository)
      if (repo?.nodeId === undefined) {
        // No need to sync if parent repository is not defined.
        return { needSync: githubSyncVersion }
      }

      // If no external document, we need to create it.
      this.createCommentPromise = this.createGithubReview(container, existing, info, parent, derivedClient)
      return await this.createCommentPromise
    }
    const review = info.external as ReviewExternalData

    const account = existing?.modifiedBy ?? (await this.provider.getAccount(review.author))?._id ?? core.account.System

    const messageData: ReviewData = {
      body: await this.provider.getMarkup(container.container, review.body),
      state: toReviewState(review.state),
      comments: (review.comments?.nodes ?? []).map((it) => it.url)
    }
    if (existing === undefined) {
      try {
        await this.createReview(info, messageData, parent, review, account)
        return { needSync: githubSyncVersion, current: messageData }
      } catch (err: any) {
        this.ctx.error('Error', { err })
        Analytics.handleError(err)
        return { needSync: githubSyncVersion, error: errorToObj(err) }
      }
    } else {
      await this.handleDiffUpdate(existing, info, messageData, container, parent, review, account)
    }
    return { current: messageData, needSync: githubSyncVersion }
  }

  private async handleDiffUpdate (
    existing: Doc,
    info: DocSyncInfo,
    reviewData: ReviewData,
    container: ContainerFocus,
    parent: DocSyncInfo,
    review: ReviewExternalData,
    account: Ref<Account>
  ): Promise<void> {
    const repository = container.repository.find((it) => it._id === info.repository)
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

  private async createReview (
    info: DocSyncInfo,
    messageData: ReviewData,
    parent: DocSyncInfo,
    review: ReviewExternalData,
    account: Ref<Account>
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

  async createGithubReview (
    container: ContainerFocus,
    existing: Doc | undefined,
    info: DocSyncInfo,
    parent: DocSyncInfo,
    derivedClient: TxOperations
  ): Promise<DocumentUpdate<DocSyncInfo>> {
    // TODO: Use selected repository
    const repo = container.repository.find((it) => it._id === parent?.repository)
    if (repo?.nodeId === undefined) {
      // No need to sync if parent repository is not defined.
      return { needSync: githubSyncVersion }
    }

    if (parent === undefined) {
      return {}
    }
    const existingReview = existing as GithubReview
    const okit =
      (await this.provider.getOctokit(existingReview.modifiedBy as Ref<PersonAccount>)) ?? container.container.octokit

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
