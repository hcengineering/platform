//
// Copyright © 2023 Hardcore Engineering Inc.
//
import chunter, { ChatMessage } from '@hcengineering/chunter'
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
import github, { DocSyncInfo, GithubIntegrationRepository, GithubProject } from '@hcengineering/github'
import { LiveQuery } from '@hcengineering/query'
import { deepEqual } from 'fast-equals'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  IntegrationContainer,
  IntegrationManager,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import { collectUpdate, deleteObjects, errorToObj, getSince, isGHWriteAllowed } from './utils'

import { Analytics } from '@hcengineering/analytics'
import { IssueComment, IssueCommentCreatedEvent, IssueCommentEvent } from '@octokit/webhooks-types'
import config from '../config'

interface MessageData {
  message: string
}

type CommentExternalData = Omit<IssueComment, 'author_association' | 'performed_via_github_app'>

export class CommentSyncManager implements DocSyncManager {
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

  @withContext('comments-handle-event')
  async handleEvent<T>(
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    evt: T
  ): Promise<void> {
    await this.createCommentPromise
    const event = evt as IssueCommentEvent
    ctx.info('comments:handleEvent', {
      action: event.action,
      login: event.sender.login,
      workspace: this.provider.getWorkspaceId()
    })

    if (event.sender.type === 'Bot') {
      // Ignore events from Bot if it is our bot
      // No need to handle event from ourself
      if (event.sender.login.includes(config.BotName)) {
        return
      }
    }

    await this.eventSync.get(event.issue.url)
    const promise = this.processEvent(ctx, event, derivedClient, integration)
    this.eventSync.set(event.issue.url, promise)
    try {
      await promise
      this.eventSync.delete(event.issue.url)
    } catch (err: any) {
      ctx.error('Error processing event', { error: err })
    } finally {
      this.eventSync.delete(event.issue.url)
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

    const commentExternal = info.external as CommentExternalData | undefined

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

    const q = `mutation deleteComment($commentID: ID!) {
      deleteIssueComment(
        input: {id: $commentID}
      ) {
        __typename
      }
    }`
    if (isGHWriteAllowed()) {
      await okit?.graphql(q, {
        commentID: id
      })
    }
  }

  private async processEvent (
    ctx: MeasureContext,
    event: IssueCommentEvent,
    derivedClient: TxOperations,
    integration: IntegrationContainer
  ): Promise<void> {
    const { repository: repo } = await this.provider.getProjectAndRepository(event.repository.node_id)
    if (repo === undefined) {
      ctx.info('No project for repository', {
        repository: event.repository,
        workspace: this.provider.getWorkspaceId()
      })
      return
    }

    const account = (await this.provider.getAccountU(event.sender)) ?? core.account.System
    switch (event.action) {
      case 'created': {
        await this.createSyncData(event, derivedClient, repo)
        break
      }
      case 'deleted': {
        const syncData = await this.client.findOne(github.class.DocSyncInfo, {
          space: repo.githubProject as Ref<GithubProject>,
          url: (event.comment.url ?? '').toLowerCase()
        })
        if (syncData !== undefined) {
          await derivedClient.update<DocSyncInfo>(syncData, { deleted: true, needSync: '' })
          this.provider.sync()
        }
        break
      }
      case 'edited': {
        const commentData = await this.client.findOne(github.class.DocSyncInfo, {
          space: repo.githubProject as Ref<GithubProject>,
          url: (event.comment.url ?? '').toLowerCase()
        })

        const messageData: MessageData = {
          message: await this.provider.getMarkupSafe(integration, event.comment.body)
        }

        if (commentData !== undefined) {
          const chatMessage: ChatMessage | undefined = await this.client.findOne<ChatMessage>(commentData.objectClass, {
            _id: commentData._id as unknown as Ref<ChatMessage>
          })
          if (chatMessage !== undefined) {
            const lastModified = new Date(event.comment.updated_at).getTime()
            await derivedClient.diffUpdate(
              commentData,
              {
                external: event.comment,
                current: messageData,
                needSync: githubSyncVersion,
                lastModified
              },
              lastModified
            )
            await this.client.diffUpdate(chatMessage, messageData, lastModified, account)
            this.provider.sync()
          }
        }
        break
      }
    }
  }

  private async createSyncData (
    createdEvent: IssueCommentCreatedEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository
  ): Promise<void> {
    const commentData = await this.client.findOne(github.class.DocSyncInfo, {
      space: repo.githubProject as Ref<GithubProject>,
      url: (createdEvent.comment.url ?? '').toLowerCase()
    })

    if (commentData === undefined) {
      await derivedClient.createDoc(github.class.DocSyncInfo, repo.githubProject as Ref<GithubProject>, {
        url: (createdEvent.comment.url ?? '').toLowerCase(),
        needSync: '',
        githubNumber: 0,
        repository: repo._id,
        objectClass: chunter.class.ChatMessage,
        external: createdEvent.comment as CommentExternalData,
        externalVersion: githubExternalSyncVersion,
        parent: (createdEvent.issue.url ?? '').toLocaleLowerCase(),
        lastModified: new Date(createdEvent.comment.updated_at).getTime()
      })
      this.provider.sync()
    }
  }

  @withContext('comments-sync')
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
    if (info.external === undefined) {
      // TODO: Use selected repository
      const repo = await this.provider.getRepositoryById(parent?.repository)
      if (repo?.nodeId === undefined) {
        // No need to sync if parent repository is not defined.
        return { needSync: githubSyncVersion }
      }

      // If no external document, we need to create it.
      this.createCommentPromise = this.createGithubComment(ctx, container, existing, info, parent, derivedClient)
      return await this.createCommentPromise
    }
    const comment = info.external as CommentExternalData
    if (parent === undefined) {
      // Find parent by issue url
      parent = await this.client.findOne(github.class.DocSyncInfo, {
        space: container.project._id,
        url: (comment.html_url.split('#')?.[0] ?? '').toLowerCase()
      })
    }
    if (parent === undefined) {
      // no Sync until parent is found, parent should trigger all child's refresh.
      return { needSync: githubSyncVersion }
    }

    const account = existing?.modifiedBy ?? (await this.provider.getAccountU(comment.user)) ?? core.account.System

    const messageData: MessageData = {
      message: await this.provider.getMarkupSafe(container.container, comment.body)
    }
    if (existing === undefined) {
      try {
        await this.createComment(info, messageData, parent, comment, account)
        return { needSync: githubSyncVersion, current: messageData }
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error(err)
        return { needSync: githubSyncVersion, error: errorToObj(err) }
      }
    } else {
      await this.handleDiffUpdate(ctx, existing, info, messageData, container, parent, comment, account)
    }
    return { current: messageData, needSync: githubSyncVersion }
  }

  private async handleDiffUpdate (
    ctx: MeasureContext,
    existing: Doc,
    info: DocSyncInfo,
    messageData: MessageData,
    container: ContainerFocus,
    parent: DocSyncInfo,
    comment: CommentExternalData,
    account: PersonId
  ): Promise<void> {
    const repository = await this.provider.getRepositoryById(info.repository)
    if (repository === undefined) {
      return
    }

    const existingComment = existing as ChatMessage

    const previousData: MessageData = info.current ?? ({} as unknown as MessageData)

    const update = collectUpdate<ChatMessage>(previousData, messageData, Object.keys(messageData))

    const platformUpdate = collectUpdate<ChatMessage>(previousData, existing, Object.keys(messageData))

    // We should remove changes we already have from github changed.
    for (const [k, v] of Object.entries(update)) {
      if ((platformUpdate as any)[k] !== v) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (platformUpdate as any)[k]
      }
    }
    // Remove current same values from update
    for (const [k, v] of Object.entries(existingComment)) {
      if ((update as any)[k] === v) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (update as any)[k]
      }
    }

    if (Object.keys(platformUpdate).length > 0) {
      // Check and update body with external
      const okit = (await this.provider.getOctokit(ctx, existing.modifiedBy)) ?? container.container.octokit
      const mdown = await this.provider.getMarkdown(existingComment.message)
      if (mdown.trim().length > 0) {
        await okit?.rest.issues.updateComment({
          owner: repository.owner?.login as string,
          repo: repository.name,
          issue_number: parent.githubNumber,
          comment_id: comment.id,
          body: mdown,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        })
      }
    }
    if (Object.keys(update).length > 0) {
      await this.client.update(existing, update, false, new Date(comment.updated_at).getTime(), account)
    }
  }

  isHulyLinkComment (message: string): boolean {
    return message.includes('<p>Connected to') && message.includes('Huly&reg;')
  }

  private async createComment (
    info: DocSyncInfo,
    messageData: MessageData,
    parent: DocSyncInfo,
    comment: CommentExternalData,
    account: PersonId
  ): Promise<void> {
    const _id: Ref<ChatMessage> = info._id as unknown as Ref<ChatMessage>
    const value: AttachedData<ChatMessage> = {
      ...messageData,
      attachments: 0
    }
    // Check if it is Connected message.
    if ((comment as any).performed_via_github_app !== undefined && this.isHulyLinkComment(comment.body)) {
      // No need to create comment on platform.
      return
    }
    await this.client.addCollection(
      chunter.class.ChatMessage,
      info.space,
      parent._id,
      parent.objectClass,
      'comments',
      value,
      _id,
      new Date(comment.created_at).getTime(),
      account
    )
  }

  async createGithubComment (
    ctx: MeasureContext,
    container: ContainerFocus,
    existing: Doc | undefined,
    info: DocSyncInfo,
    parent: DocSyncInfo | undefined,
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
    const chatMessage = existing as ChatMessage
    const okit = (await this.provider.getOctokit(ctx, chatMessage.modifiedBy)) ?? container.container.octokit

    // No external version yet, create it.
    try {
      const mdown = await this.provider.getMarkdown(chatMessage.message)
      if (mdown.trim().length > 0) {
        const result = await okit?.rest.issues.createComment({
          owner: repo.owner?.login as string,
          repo: repo.name,
          issue_number: parent.githubNumber,
          body: mdown,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        })

        const upd: DocumentUpdate<DocSyncInfo> = {
          parent: (result?.data.html_url?.split('#')?.[0] ?? '').toLowerCase(),
          url: (result?.data.url ?? '').toLowerCase(),
          external: result?.data as CommentExternalData,
          current: result?.data,
          repository: repo._id,
          needSync: githubSyncVersion
        }

        // We need to update in current promise, to prevent event changes.
        await derivedClient.update(info, upd)
      }
      return { needSync: githubSyncVersion }
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error(err)
      return { needSync: githubSyncVersion, error: errorToObj(err) }
    }
  }

  @withContext('comments-externalSync')
  async externalSync (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    kind: ExternalSyncField,
    syncDocs: DocSyncInfo[],
    repository: GithubIntegrationRepository,
    project: GithubProject
  ): Promise<void> {
    // No need to perform external sync for comments, so let's update marks
    const tx = derivedClient.apply()
    for (const d of syncDocs) {
      await tx.update(d, { externalVersion: githubExternalSyncVersion })
    }
    await tx.commit()
    this.provider.sync()
  }

  repositoryDisabled (ctx: MeasureContext, integration: IntegrationContainer, repo: GithubIntegrationRepository): void {
    integration.synchronized.delete(`${repo._id}:comment`)
  }

  @withContext('comments-externalFullSync')
  async externalFullSync (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    projects: GithubProject[],
    repositories: GithubIntegrationRepository[]
  ): Promise<void> {
    for (const repo of repositories) {
      if (this.provider.isClosing()) {
        break
      }
      const syncKey = `${repo._id}:comment`
      if (repo.githubProject === undefined || !repo.enabled || integration.synchronized.has(syncKey)) {
        if (!repo.enabled) {
          integration.synchronized.delete(syncKey)
        }
        continue
      }
      const prj = projects.find((it) => repo.githubProject === it._id)
      if (prj === undefined) {
        continue
      }

      // Wait global project sync
      await integration.syncLock.get(prj._id)

      const since = await getSince(this.client, chunter.class.ChatMessage, repo)

      const i = integration.octokit.paginate.iterator(integration.octokit.rest.issues.listCommentsForRepo, {
        owner: repo.owner?.login as string,
        repo: repo.name,
        state: 'all',
        sort: 'updated',
        direction: 'asc',
        since,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      try {
        for await (const data of i) {
          if (this.provider.isClosing()) {
            break
          }
          const comments: CommentExternalData[] = data.data as any
          ctx.info('retrieve comments for', {
            repo: repo.name,
            comments: comments.length,
            used: data.headers['x-ratelimit-used'],
            limit: data.headers['x-ratelimit-limit'],
            workspace: this.provider.getWorkspaceId()
          })
          await this.syncComments(ctx, repo, comments, derivedClient)
          this.provider.sync()
        }
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error(err)
      }
      integration.synchronized.add(syncKey)
    }
  }

  async syncComments (
    ctx: MeasureContext,
    repo: GithubIntegrationRepository,
    comments: CommentExternalData[],
    derivedClient: TxOperations
  ): Promise<void> {
    if (repo.githubProject == null) {
      return
    }
    const syncInfo = await this.client.findAll<DocSyncInfo>(github.class.DocSyncInfo, {
      space: repo.githubProject,
      // repository: repo._id, // If we skip repository, we will find orphaned comments, so we could connect them on.
      objectClass: chunter.class.ChatMessage,
      url: { $in: comments.map((it) => (it.url ?? '').toLowerCase()) }
    })

    for (const comment of comments) {
      try {
        const existing = syncInfo.find((it) => it.url === comment.url.toLowerCase())
        const lastModified = new Date(comment.updated_at).getTime()
        if (existing === undefined) {
          await derivedClient.createDoc(github.class.DocSyncInfo, repo.githubProject, {
            url: comment.url.toLowerCase(),
            needSync: '',
            githubNumber: 0,
            objectClass: chunter.class.ChatMessage,
            external: comment,
            externalVersion: githubExternalSyncVersion,
            parent: (comment.html_url.split('#')?.[0] ?? '').toLowerCase(),
            repository: repo._id,
            lastModified
          })
        } else {
          if (
            !deepEqual(existing.external, comment) ||
            existing.externalVersion !== githubExternalSyncVersion ||
            existing.repository !== repo._id
          ) {
            await derivedClient.diffUpdate(
              existing,
              {
                needSync: '',
                external: comment,
                externalVersion: githubExternalSyncVersion,
                lastModified,
                repository: repo._id
              },
              lastModified
            )
            this.provider.sync()
          }
        }
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error(err)
      }
    }
  }
}
