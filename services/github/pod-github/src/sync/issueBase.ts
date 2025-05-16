//
// Copyright © 2023 Hardcore Engineering Inc.
//

/*
  TODO:
  * Add since to synchronization
*/
import activity from '@hcengineering/activity'
import { Analytics } from '@hcengineering/analytics'
import { CollaboratorClient } from '@hcengineering/collaborator-client'
import { PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  AttachedDoc,
  Class,
  Doc,
  DocumentUpdate,
  Markup,
  MeasureContext,
  Ref,
  Space,
  TxOperations,
  makeDocCollabId
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubIssue,
  GithubIssue as GithubIssueP,
  GithubProject
} from '@hcengineering/github'
import { IntlString } from '@hcengineering/platform'
import { LiveQuery } from '@hcengineering/query'
import { getPublicLink } from '@hcengineering/server-guest-resources'
import task, { type Task } from '@hcengineering/task'
import { MarkupNode, MarkupNodeType, areEqualMarkups, markupToJSON, traverseNode } from '@hcengineering/text'
import time, { type ToDo } from '@hcengineering/time'
import tracker, { Issue } from '@hcengineering/tracker'
import { deepEqual } from 'fast-equals'
import { Octokit } from 'octokit'
import { ContainerFocus, IntegrationManager, githubExternalSyncVersion, githubSyncVersion } from '../types'
import { IssueExternalData } from './githubTypes'
import { stripGuestLink } from './guest'
import { collectUpdate, compareMarkdown, deleteObjects, errorToObj, guessStatus } from './utils'

/**
 * @public
 */
export type WithMarkup<T extends Issue> = Omit<T, 'description'> & {
  description: Markup
}

/**
 * @public
 */
export type GithubIssueData = Omit<
WithMarkup<Issue>,
| 'commits'
| 'attachments'
| 'commits'
| 'number'
| 'files'
| 'space'
| 'identifier'
| 'rank'
| 'status'
| 'priority'
| 'subIssues'
| 'parents'
| 'estimation'
| 'reportedTime'
| 'reports'
| 'childInfo'
| 'dueDate'
| 'kind'
| 'reviews'
| 'reviewThreads'
| 'reviewComments'
| 'component'
| keyof AttachedDoc
> &
Record<string, any>

/**
 * @public
 */
export type IssueUpdate = DocumentUpdate<WithMarkup<Issue>>

export abstract class IssueSyncManagerBase {
  provider!: IntegrationManager
  constructor (
    readonly ctx: MeasureContext,
    readonly client: TxOperations,
    readonly lq: LiveQuery,
    readonly collaborator: CollaboratorClient
  ) {}

  async init (provider: IntegrationManager): Promise<void> {
    this.provider = provider
  }

  async getAssignees (issue: IssueExternalData): Promise<PersonAccount[]> {
    // Find Assignees and reviewers
    const assignees: PersonAccount[] = []

    for (const o of issue.assignees.nodes) {
      const acc = await this.provider.getAccount(o)
      if (acc !== undefined) {
        assignees.push(acc)
      }
    }
    return assignees
  }

  async handleUpdate (
    external: IssueExternalData,
    derivedClient: TxOperations,
    update: IssueUpdate,
    account: Ref<Account>,
    prj: GithubProject,
    needSync: boolean,
    syncData?: DocSyncInfo,
    verifyUpdate?: (
      state: DocSyncInfo,
      existing: Issue,
      external: IssueExternalData,
      update: IssueUpdate
    ) => Promise<boolean>,
    extraSyncUpdate?: DocumentUpdate<DocSyncInfo>
  ): Promise<void> {
    if (Object.keys(update).length === 0 && !needSync) {
      return
    }

    syncData =
      syncData ??
      (await this.client.findOne(github.class.DocSyncInfo, { space: prj._id, url: (external.url ?? '').toLowerCase() }))

    if (syncData !== undefined) {
      const doc: Issue | undefined = await this.client.findOne<Issue>(syncData.objectClass, {
        _id: syncData._id as unknown as Ref<Issue>
      })

      // Use now as modified date for events.
      const lastModified = new Date().getTime()

      if (doc !== undefined && ((await verifyUpdate?.(syncData, doc, external, update)) ?? true)) {
        const issueData: DocumentUpdate<Issue> = { ...update, description: doc.description }
        if (
          update.description !== undefined &&
          !areEqualMarkups(update.description, syncData.current?.description ?? '')
        ) {
          try {
            const collabId = makeDocCollabId(doc, 'description')
            await this.collaborator.updateMarkup(collabId, update.description)
          } catch (err: any) {
            Analytics.handleError(err)
            this.ctx.error(err)
          }
        } else {
          delete update.description
        }

        // Sync all possibly updated action items states
        if (update.description !== undefined) {
          const node = markupToJSON(update.description)
          const todos: Record<string, boolean> = {}
          traverseNode(node, (n) => {
            if (n.type === MarkupNodeType.todoItem && n.attrs?.todoid !== undefined) {
              todos[n.attrs.todoid as string] = (n.attrs.checked as boolean) ?? false
            }

            return true
          })

          const updateTodos = this.client.apply()
          for (const [k, v] of Object.entries(todos)) {
            await updateTodos.updateDoc(time.class.ToDo, time.space.ToDos, k as Ref<ToDo>, {
              doneOn: v ? Date.now() : null
            })
          }

          await updateTodos.commit()
        }

        await derivedClient.diffUpdate(
          syncData,
          {
            external,
            externalVersion: githubExternalSyncVersion,
            current: { ...syncData.current, ...update },
            needSync: needSync ? '' : githubSyncVersion, // No need to sync after operation.
            derivedVersion: '', // Check derived changes
            lastModified,
            lastGithubUser: account,
            ...extraSyncUpdate
          },
          lastModified
        )
        await this.client.diffUpdate(doc, issueData, lastModified, account)
        this.provider.sync()
      } else if (doc === undefined) {
        await derivedClient.diffUpdate(
          syncData,
          {
            external,
            externalVersion: githubExternalSyncVersion,
            needSync: '',
            derivedVersion: '', // Check derived changes
            lastModified,
            lastGithubUser: account,
            ...extraSyncUpdate
          },
          lastModified
        )
      }
    }
    if (needSync) {
      this.provider.sync()
    }
  }

  abstract fillBackChanges (update: DocumentUpdate<Issue>, existing: GithubIssue, external: any): Promise<void>

  async addConnectToMessage (
    msg: IntlString,
    prj: Ref<Space>,
    issueId: Ref<Issue>,
    _class: Ref<Class<Doc>>,
    issueExternal: { url: string, number: number },
    repository: GithubIntegrationRepository
  ): Promise<void> {
    await this.client.addCollection(activity.class.ActivityInfoMessage, prj, issueId, _class, 'activity', {
      message: msg,
      icon: github.icon.Github,
      props: {
        url: issueExternal.url,
        repository: repository.url?.replace('api.github.com/repos', 'github.com'),
        repoName: repository.name,
        number: issueExternal.number
      }
    })
  }

  stripGuestLink = async (data: MarkupNode): Promise<void> => {
    await stripGuestLink(data)
  }

  abstract performIssueFieldsUpdate (
    info: DocSyncInfo,
    existing: WithMarkup<Issue>,
    platformUpdate: DocumentUpdate<Issue>,
    issueData: GithubIssueData,
    container: ContainerFocus,
    issueExternal: IssueExternalData,
    okit: Octokit,
    account: Ref<Account>
  ): Promise<boolean>

  abstract afterSync (existing: Issue, account: Ref<Account>, issueExternal: any, info: DocSyncInfo): Promise<void>

  async handleDiffUpdate (
    container: ContainerFocus,
    existing: WithMarkup<Issue>,
    info: DocSyncInfo,
    issueData: GithubIssueData,
    issueExternal: IssueExternalData,
    account: Ref<Account>,
    accountGH: Ref<Account>
  ): Promise<DocumentUpdate<DocSyncInfo>> {
    let needUpdate = false
    if (!this.client.getHierarchy().hasMixin(existing, github.mixin.GithubIssue)) {
      await this.ctx.withLog(
        'create mixin issue: GithubIssue',
        {},
        async () => {
          await this.client.createMixin<Issue, GithubIssueP>(
            existing._id as Ref<GithubIssueP>,
            existing._class,
            existing.space,
            github.mixin.GithubIssue,
            {
              githubNumber: issueExternal.number,
              url: issueExternal.url,
              repository: info.repository as Ref<GithubIntegrationRepository>
            }
          )
          await this.notifyConnected(container, info, existing, issueExternal)
        },
        { identifier: existing.identifier, url: issueExternal.url }
      )
      // Re iterate to have existing value with mixin inside.
      needUpdate = true
    } else {
      const ghIssue = this.client.getHierarchy().as(existing, github.mixin.GithubIssue)
      await this.client.diffUpdate(ghIssue, {
        githubNumber: issueExternal.number,
        url: issueExternal.url,
        repository: info.repository as Ref<GithubIntegrationRepository>
      })
      if (ghIssue.url !== issueExternal.url) {
        await this.notifyConnected(container, info, existing, issueExternal)
      }
    }
    if (needUpdate) {
      return { needSync: '' }
    }

    const existingIssue = this.client.getHierarchy().as(existing, github.mixin.GithubIssue)
    const previousData: GithubIssueData = info.current ?? ({} as unknown as GithubIssueData)
    // const type = await this.provider.getTaskTypeOf(container.project.type, existing._class)
    // const stst = await this.provider.getStatuses(type?._id)

    const update = collectUpdate<Issue>(previousData, issueData, Object.keys(issueData))

    const allAttributes = this.client.getHierarchy().getAllAttributes(existingIssue._class)
    const platformUpdate = collectUpdate<Issue>(previousData, existingIssue, Array.from(allAttributes.keys()))

    const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit

    // Remove current same values from update
    for (const [k, v] of Object.entries(update)) {
      if ((existingIssue as any)[k] === v) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (update as any)[k]
      }
    }

    if (update.description !== undefined) {
      if (update.description === existingIssue.description) {
        delete update.description
      }
    }

    for (const [k, v] of Object.entries(update)) {
      let pv = (platformUpdate as any)[k]

      if (k === 'description' && pv != null) {
        const mdown = await this.provider.getMarkdown(pv)
        pv = await this.provider.getMarkupSafe(container.container, mdown, this.stripGuestLink)
      }
      if (pv != null && pv !== v) {
        // We have conflict of values, assume platform is more proper one.
        this.ctx.error('conflict', { id: existing.identifier, k })
        // Assume platform change is more important in case of conflict values.
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (update as any)[k]
        continue
      }
    }

    await this.fillBackChanges(update, existingIssue, issueExternal)

    let needExternalSync = false

    if (container !== undefined && okit !== undefined) {
      // Check and update issue fields.
      needExternalSync = await this.performIssueFieldsUpdate(
        info,
        existing,
        platformUpdate,
        issueData,
        container,
        issueExternal,
        okit,
        account
      )
    }

    // We need remove all readonly field values
    for (const k of Object.keys(update)) {
      // Skip readonly fields
      const attr = this.client.getHierarchy().findAttribute(existingIssue._class, k)
      if (attr?.readonly === true) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (update as any)[k]
        continue
      }
    }

    // Update collaborative description
    if (update.description !== undefined) {
      this.ctx.info(`<= perform ${issueExternal.url} update to collaborator`, {
        workspace: this.provider.getWorkspaceId().name
      })
      try {
        const description = update.description as Markup
        issueData.description = description
        const collabId = makeDocCollabId(existingIssue, 'description')
        await this.collaborator.updateMarkup(collabId, description)
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('error during description update', err)
      }
    }

    if (Object.keys(update).length > 0) {
      // We have some fields to update of existing from external
      this.ctx.info(`<= perform ${issueExternal.url} update to platform`, {
        ...update,
        workspace: this.provider.getWorkspaceId().name
      })
      await this.client.update(existingIssue, update, false, new Date().getTime(), accountGH)
    }

    await this.afterSync(existingIssue, accountGH, issueExternal, info)
    // We need to trigger external version retrieval, via sync or event, to prevent move sync operations from platform before we will be sure all is updated on github.
    return {
      current: issueData,
      needSync: githubSyncVersion,
      ...(needExternalSync ? { externalVersion: '' } : {}),
      lastGithubUser: null
    }
  }

  private async notifyConnected (
    container: ContainerFocus,
    info: DocSyncInfo,
    existing: WithMarkup<Issue>,
    issueExternal: IssueExternalData
  ): Promise<void> {
    const repo = await this.provider.getRepositoryById(info.repository)
    if (repo != null) {
      await this.addConnectToMessage(
        existing._class === github.class.GithubPullRequest
          ? github.string.PullRequestConnectedActivityInfo
          : github.string.IssueConnectedActivityInfo,
        existing.space,
        existing._id,
        existing._class,
        issueExternal,
        repo
      )
    }
  }

  async collectIssueUpdate (
    info: DocSyncInfo,
    doc: WithMarkup<Issue>,
    platformUpdate: DocumentUpdate<Issue>,
    issueData: Pick<WithMarkup<Issue>, 'title' | 'description' | 'assignee' | 'status'>,
    container: ContainerFocus,
    issueExternal: IssueExternalData,
    _class: Ref<Class<Issue>>
  ): Promise<Record<string, any>> {
    const issueUpdate: {
      title?: string
      body?: string
      stateReason?: string
      assigneeIds?: string[]
    } & Record<string, any> = {}
    if (platformUpdate.title != null) {
      if (platformUpdate.title !== issueExternal.title) {
        issueUpdate.title = platformUpdate.title
      }
      issueData.title = platformUpdate.title
    }
    if (platformUpdate.description != null) {
      // Need to convert to markdown
      issueUpdate.body = await this.provider.getMarkdown(platformUpdate.description ?? '')
      issueData.description = await this.provider.getMarkupSafe(
        container.container,
        issueUpdate.body ?? '',
        this.stripGuestLink
      )

      // Of value is same, not need to update.
      if (compareMarkdown(issueUpdate.body, issueExternal.body)) {
        delete issueUpdate.body
      }
    }
    if (platformUpdate.assignee !== undefined) {
      const info =
        platformUpdate.assignee !== null
          ? await this.provider.getGithubLogin(container.container, platformUpdate.assignee)
          : undefined
      // Check external

      const currentAssignees = issueExternal.assignees.nodes.map((it) => it.id)
      currentAssignees.sort((a, b) => a.localeCompare(b))

      issueUpdate.assigneeIds = info !== undefined ? [info.id] : []
      issueUpdate.assigneeIds.sort((a, b) => a.localeCompare(b))

      if (deepEqual(currentAssignees, issueUpdate.assigneeIds)) {
        // Same ids
        delete issueUpdate.assigneeIds
      }
      issueData.assignee = platformUpdate.assignee
    }

    const status = platformUpdate.status ?? issueData.status
    const type = await this.provider.getTaskTypeOf(container.project.type, _class)
    const statuses = await this.provider.getStatuses(type?._id)
    const st = statuses.find((it) => it._id === status)
    if (st !== undefined) {
      // Need to convert to two operations.
      switch (st.category) {
        case task.statusCategory.UnStarted:
        case task.statusCategory.ToDo:
        case task.statusCategory.Active:
          if (issueExternal.state !== 'OPEN') {
            issueUpdate.state = 'OPEN'
          }
          break
        case task.statusCategory.Won:
          if (issueExternal.state !== 'CLOSED' || issueExternal.stateReason !== 'COMPLETED') {
            issueUpdate.state = 'CLOSED'
            issueUpdate.stateReason = 'COMPLETED'
          }
          break
        case task.statusCategory.Lost:
          if (issueExternal.state !== 'CLOSED' || issueExternal.stateReason !== 'NOT_PLANNED') {
            issueUpdate.state = 'CLOSED'
            issueUpdate.stateReason = 'not_planed' // Not supported change to github
          }
          break
      }
    }
    return issueUpdate
  }

  async performDocumentExternalSync (
    ctx: MeasureContext,
    info: DocSyncInfo,
    previousExternal: IssueExternalData,
    issueExternal: IssueExternalData,
    derivedClient: TxOperations
  ): Promise<void> {
    // TODO: Since Github integeration need to be re-written to use cards, so this is quick fix to not loose data in case of external sync while service was offline.

    const update: IssueUpdate = {}
    const du: DocumentUpdate<DocSyncInfo> = {}
    const account = (await this.provider.getAccount(issueExternal.author))?._id ?? core.account.System

    const container = await this.provider.getContainer(info.space)
    if (container == null) {
      return
    }
    const type = await this.provider.getTaskTypeOf(container.project.type, tracker.class.Issue)
    const statuses = await this.provider.getStatuses(type?._id)

    if (previousExternal.state !== issueExternal.state) {
      update.status = (
        await guessStatus({ state: issueExternal.state, stateReason: issueExternal.stateReason }, statuses)
      )._id
    }
    if (previousExternal.title !== issueExternal.title) {
      update.title = issueExternal.title
    }
    if (previousExternal.body !== issueExternal.body) {
      update.description = await this.provider.getMarkupSafe(
        container.container,
        issueExternal.body,
        this.stripGuestLink
      )
      du.markdown = await this.provider.getMarkdown(update.description)
    }
    if (!deepEqual(previousExternal.assignees, issueExternal.assignees)) {
      const assignees = await this.getAssignees(issueExternal)
      update.assignee = assignees?.[0]?.person ?? null
    }
    if (Object.keys(update).length > 0) {
      await this.handleUpdate(issueExternal, derivedClient, update, account, container.project, false)
    }
  }

  async syncIssues (
    _class: Ref<Class<Doc>>,
    repo: GithubIntegrationRepository,
    issues: IssueExternalData[],
    derivedClient: TxOperations,
    syncDocs?: DocSyncInfo[]
  ): Promise<void> {
    if (repo.githubProject == null) {
      return
    }
    const syncInfo =
      syncDocs ??
      (await this.client.findAll<DocSyncInfo>(github.class.DocSyncInfo, {
        space: repo.githubProject,
        // repository: repo._id, // If we skip repository, we will find orphaned issues, so we could connect them on.
        objectClass: _class,
        url: { $in: issues.map((it) => (it.url ?? '').toLowerCase()) }
      }))

    const ops = derivedClient.apply()

    for (const issue of issues) {
      try {
        if (issue.url === undefined && Object.keys(issue).length === 0) {
          this.ctx.info('Retrieve empty document', { repo: repo.name, workspace: this.provider.getWorkspaceId().name })
          continue
        }
        const existing =
          syncInfo.find((it) => it.url.toLowerCase() === issue.url.toLowerCase()) ??
          syncInfo.find((it) => (it.external as IssueExternalData)?.id === issue.id)
        if (existing === undefined && syncDocs === undefined) {
          this.ctx.info('Create sync doc', { url: issue.url, workspace: this.provider.getWorkspaceId().name })
          await ops.createDoc<DocSyncInfo>(github.class.DocSyncInfo, repo.githubProject, {
            url: issue.url.toLowerCase(),
            needSync: '',
            repository: repo._id,
            githubNumber: issue.number,
            objectClass: _class,
            external: issue,
            externalVersion: githubExternalSyncVersion,
            derivedVersion: '',
            externalVersionSince: '',
            lastModified: new Date(issue.updatedAt).getTime()
          })
        } else if (existing !== undefined) {
          if (syncDocs !== undefined) {
            syncDocs = syncDocs.filter((it) => it._id !== existing._id)
          }
          const externalEqual = deepEqual(existing.external, issue) && existing.repository === repo._id
          if (!externalEqual || existing.externalVersion !== githubExternalSyncVersion) {
            this.ctx.info('Update sync doc(extarnal changes)', {
              url: issue.url,
              workspace: this.provider.getWorkspaceId().name
            })

            if (existing.needSync === githubSyncVersion || existing.repository !== repo._id) {
              // Sync external if and only if no changes from platform or we do resync from github.
              // We need to apply changes from Github, while service was offline.
              await this.performDocumentExternalSync(this.ctx, existing, existing.external, issue, derivedClient)
            }

            await ops.diffUpdate(
              existing,
              {
                needSync: externalEqual ? existing.needSync : '',
                external: issue,
                externalVersion: githubExternalSyncVersion,
                derivedVersion: '', // Clear derived state to recalculate it.
                externalVersionSince: '',
                repository: repo._id,
                lastModified: new Date(issue.updatedAt).getTime()
              },
              Date.now()
            )
          }
        }
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error(err)
      }
    }
    // if no sync doc, mark it as synchronized
    for (const sd of syncDocs ?? []) {
      await ops.update(sd, {
        needSync: githubSyncVersion,
        externalVersion: githubExternalSyncVersion,
        error: 'not found external doc'
      })
    }
    await ops.commit(true)
    this.provider.sync()
  }

  abstract deleteGithubDocument (container: ContainerFocus, account: Ref<Account>, id: string): Promise<void>

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

    const issueExternal = info.external as IssueExternalData | undefined

    if (issueExternal === undefined) {
      // No external issue yet, safe delete, since platform document will be deleted a well.
      return true
    }
    const account =
      existing?.createdBy ?? (await this.provider.getAccount(issueExternal.author))?._id ?? core.account.System

    if (issueExternal !== undefined) {
      try {
        await this.deleteGithubDocument(container, account, issueExternal.id)
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
          this.ctx.error('Error', { err })
          await derivedClient.update(info, { error: errorToObj(err), needSync: githubSyncVersion })
          return false
        }
      }
    }

    if (existing !== undefined && deleteExisting) {
      const childItems = await derivedClient.findAll(github.class.DocSyncInfo, {
        parent: (issueExternal.url ?? '').toLowerCase()
      })
      for (const u of childItems) {
        // We need just to clean all of them, since child's for issue are comments for now.
        await derivedClient.remove(u)
      }

      await deleteObjects(this.ctx, this.client, [existing], account)
    }
    return true
  }

  protected async createErrorSyncDataByUrl (
    url: string,
    githubNumber: number,
    date: Date,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    err: any,
    _class: Ref<Class<Doc>> = tracker.class.Issue
  ): Promise<void> {
    const syncData = await this.client.findOne(github.class.DocSyncInfo, {
      space: repo.githubProject as Ref<GithubProject>,
      url: url.toLowerCase()
    })
    if (syncData === undefined) {
      await derivedClient?.createDoc(github.class.DocSyncInfo, repo.githubProject as Ref<GithubProject>, {
        url,
        needSync: githubSyncVersion, // We need external sync first.
        githubNumber,
        externalVersion: '',
        repository: repo._id,
        objectClass: _class,
        external: {},
        error: errorToObj(err),
        lastModified: date.getTime()
      })
      // We need trigger comments, if their sync data created before
      const childInfos = await this.client.findAll(github.class.DocSyncInfo, { parent: url.toLowerCase() })
      for (const child of childInfos) {
        await derivedClient?.update(child, { needSync: '' })
      }
      this.provider.sync()
    }
  }

  async addHulyLink (
    info: DocSyncInfo,
    syncResult: DocumentUpdate<DocSyncInfo>,
    object: Doc,
    external: IssueExternalData,
    container: ContainerFocus
  ): Promise<void> {
    const repository = await this.provider.getRepositoryById(info.repository)
    if (repository !== undefined) {
      syncResult.addHulyLink = false
      const publicLink = await getPublicLink(
        object,
        this.client,
        this.provider.getWorkspaceId(),
        false,
        this.provider.getBranding()
      )
      // We need to create comment on Github about issue is connected.
      await container.container.octokit.rest.issues.createComment({
        owner: repository.owner?.login as string,
        repo: repository.name,
        issue_number: external.number,

        body: `<p>Connected to <b><a href="${publicLink}">Huly&reg;: ${(object as Task).identifier}</a></b></p>`,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
    }
  }
}
