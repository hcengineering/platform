//
// Copyright © 2023 Hardcore Engineering Inc.
//

/*
  TODO:
  * Add since to synchronization
*/
import { Analytics } from '@hcengineering/analytics'
import { PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  AttachedData,
  Doc,
  DocumentUpdate,
  Ref,
  SortingOrder,
  Status,
  TxOperations,
  cutObjectArray,
  generateId,
  makeCollabId,
  makeCollabJsonId,
  makeDocCollabId
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubIssueStateReason,
  GithubProject,
  IntegrationRepositoryData,
  GithubIssue as TGithubIssue
} from '@hcengineering/github'
import task, { TaskType, calcRank } from '@hcengineering/task'
import tracker, { Issue, IssuePriority } from '@hcengineering/tracker'
import { Issue as GithubIssue, IssuesEvent, ProjectsV2ItemEvent } from '@octokit/webhooks-types'
import { Octokit } from 'octokit'
import config from '../config'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  IntegrationContainer,
  githubDerivedSyncVersion,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import { IssueExternalData, issueDetails } from './githubTypes'
import { GithubIssueData, IssueSyncManagerBase, IssueSyncTarget, IssueUpdate, WithMarkup } from './issueBase'
import { syncConfig } from './syncConfig'
import { getSince, gqlp, guessStatus, isGHWriteAllowed, syncRunner } from './utils'

export class IssueSyncManager extends IssueSyncManagerBase implements DocSyncManager {
  createPromise: Promise<IssueExternalData | undefined> | undefined
  externalDerivedSync = false
  async getAssigneesI (issue: GithubIssue): Promise<PersonAccount[]> {
    // Find Assignees and reviewers
    const assignees: PersonAccount[] = []

    for (const o of issue.assignees) {
      const acc = await this.provider.getAccountU(o)
      if (acc !== undefined) {
        assignees.push(acc)
      }
    }
    return assignees
  }

  async handleEvent<T = IssuesEvent | ProjectsV2ItemEvent>(
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    evt: T
  ): Promise<void> {
    await this.createPromise
    const event = evt as IssuesEvent | ProjectsV2ItemEvent

    this.ctx.info('issue:handleEvent', {
      nodeId: (event as IssuesEvent).issue?.html_url ?? (event as ProjectsV2ItemEvent)?.projects_v2_item.node_id,
      action: event.action,
      login: event.sender.login,
      type: event.sender.type,
      url: event.sender.url,
      workspace: this.provider.getWorkspaceId().name
    })

    if (event.sender.type === 'Bot') {
      // Ignore events from Bot if it is our bot
      // No need to handle event from ourself
      if (event.sender.login.includes(config.BotName)) {
        return
      }
    }

    const projectV2Event = (event as ProjectsV2ItemEvent).projects_v2_item?.id !== undefined
    if (projectV2Event) {
      const projectV2Event = event as ProjectsV2ItemEvent

      const githubProjects = await this.provider.liveQuery.queryFind(github.mixin.GithubProject, {})
      let prj = githubProjects.find((it) => it.projectNodeId === projectV2Event.projects_v2_item.project_node_id)
      if (prj === undefined) {
        // Checking for milestones
        const m = (await this.provider.liveQuery.queryFind(github.mixin.GithubMilestone, {})).find(
          (it) => it.projectNodeId === projectV2Event.projects_v2_item.project_node_id
        )
        if (m !== undefined) {
          prj = githubProjects.find((it) => it._id === m.space)
        }
      }

      if (prj === undefined) {
        this.ctx.info('Event from unknown v2 project', {
          nodeId: projectV2Event.projects_v2_item.project_node_id,
          workspace: this.provider.getWorkspaceId().name
        })
        return
      }

      const urlId = projectV2Event.projects_v2_item.node_id

      await syncRunner.exec(urlId, async () => {
        await this.processProjectV2Event(integration, projectV2Event, derivedClient, prj as GithubProject)
      })
    } else {
      const issueEvent = event as IssuesEvent
      const { project, repository } = await this.provider.getProjectAndRepository(issueEvent.repository.node_id)
      if (project === undefined || repository === undefined) {
        this.ctx.info('No project for repository', {
          repository: issueEvent.repository.name,
          nodeId: issueEvent.repository.node_id,
          workspace: this.provider.getWorkspaceId().name
        })
        return
      }

      const urlId = issueEvent.issue.url

      await syncRunner.exec(urlId, async () => {
        await this.processEvent(issueEvent, derivedClient, repository, integration, project)
      })
    }
  }

  private async processEvent (
    event: IssuesEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    integration: IntegrationContainer,
    prj: GithubProject
  ): Promise<void> {
    const account = (await this.provider.getAccountU(event.sender))?._id ?? core.account.System

    let externalData: IssueExternalData | undefined
    if (event.action !== 'deleted') {
      try {
        const response: any = await integration.octokit?.graphql(
          `query listIssue($name: String!, $owner: String!, $issue: Int!) {
          repository(name: $name, owner: $owner) {
            issue(number: $issue) {
              ${issueDetails(true)}
            }
          }
        }
        `,
          {
            name: repo.name,
            owner: repo.owner?.login,
            issue: event.issue.number
          }
        )
        externalData = response.repository.issue
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('Error', { err })

        // We need to check if we do not have sync data, we need to create by html_url
        await this.createErrorSyncDataByUrl(
          event.issue.html_url,
          event.issue.number,
          new Date(event.issue.updated_at),
          derivedClient,
          repo,
          err
        )
        return
      }
      if (externalData === undefined) {
        await this.createErrorSyncDataByUrl(
          event.issue.html_url,
          event.issue.number,
          new Date(event.issue.updated_at),
          derivedClient,
          repo,
          'no external data found'
        )
        return
      }
    }

    switch (event.action) {
      case 'transferred':
      case 'opened': {
        await this.createSyncData(externalData as IssueExternalData, derivedClient, repo)
        break
      }
      case 'deleted': {
        const syncData = await this.client.findOne(github.class.DocSyncInfo, {
          space: repo.githubProject as Ref<GithubProject>,
          url: (event.issue.html_url ?? '').toLowerCase()
        })
        if (syncData !== undefined) {
          await derivedClient.update<DocSyncInfo>(syncData, { deleted: true, needSync: '', lastGithubUser: account })
          this.provider.sync()
        }
        break
      }
      case 'edited': {
        const update: IssueUpdate = {}
        const du: DocumentUpdate<DocSyncInfo> = {}
        if (event.changes.body !== undefined) {
          update.description = await this.provider.getMarkup(integration, event.issue.body, this.stripGuestLink)
          du.markdown = await this.provider.getMarkdown(update.description)
        }
        if (event.changes.title !== undefined) {
          update.title = event.issue.title
        }

        await this.handleUpdate(
          externalData as IssueExternalData,
          derivedClient,
          update,
          account,
          prj,
          false,
          undefined,
          undefined,
          du
        )
        break
      }
      case 'assigned':
      case 'unassigned': {
        const assignees = await this.getAssigneesI(event.issue)
        const update: IssueUpdate = {
          assignee: assignees?.[0]?.person ?? null
        }
        await this.handleUpdate(externalData as IssueExternalData, derivedClient, update, account, prj, false)
        break
      }
      case 'closed':
      case 'reopened': {
        const stateMap: Record<string, 'CLOSED' | 'OPEN'> = { closed: 'CLOSED', open: 'OPEN' }
        const stateReasonMap: Record<string, GithubIssueStateReason> = {
          completed: GithubIssueStateReason.Completed,
          reopened: GithubIssueStateReason.Reopened,
          not_planed: GithubIssueStateReason.NotPlanned
        }
        const type = await this.provider.getTaskTypeOf(prj.type, tracker.class.Issue)
        const statuses = await this.provider.getStatuses(type?._id)
        const update: IssueUpdate = {
          status: (
            await guessStatus(
              {
                state: stateMap[event.issue.state],
                stateReason: event.issue.state_reason != null ? stateReasonMap[event.issue.state_reason] : undefined
              },
              statuses
            )
          )._id
        }
        await this.handleUpdate(
          externalData as IssueExternalData,
          derivedClient,
          update,
          account,
          prj,
          false,
          undefined,
          async (state, existing, external) => {
            // We need to be sure we not change status if category is same, since github doesn't know about it.
            const existingStatus = statuses.find((it) => it._id === existing.status)
            const updateState = statuses.find((it) => it._id === update.status)
            return existingStatus?.category !== updateState?.category
          }
        )
        break
      }
    }
  }

  private async createSyncData (
    issueExternal: IssueExternalData,
    derivedClient: TxOperations | undefined,
    repo: GithubIntegrationRepository
  ): Promise<void> {
    const issueSyncData = await this.client.findOne(github.class.DocSyncInfo, {
      space: repo.githubProject as Ref<GithubProject>,
      url: (issueExternal.url ?? '').toLowerCase()
    })
    if (issueSyncData === undefined) {
      await derivedClient?.createDoc(github.class.DocSyncInfo, repo.githubProject as Ref<GithubProject>, {
        url: issueExternal.url.toLowerCase(),
        needSync: '',
        githubNumber: issueExternal.number,
        repository: repo._id,
        objectClass: tracker.class.Issue,
        external: issueExternal,
        externalVersion: githubExternalSyncVersion,
        lastModified: new Date(issueExternal.updatedAt).getTime(),
        addHulyLink: true
      })

      // We need trigger comments, if their sync data created before
      const childInfos = await this.client.findAll(github.class.DocSyncInfo, {
        parent: (issueExternal.url ?? '').toLowerCase()
      })
      for (const child of childInfos) {
        await derivedClient?.update(child, { needSync: '' })
      }

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

    let needCreateConnectedAtHuly = info.addHulyLink === true

    if (
      (container.project.projectNodeId === undefined ||
        !container.container.projectStructure.has(container.project._id)) &&
      syncConfig.MainProject
    ) {
      this.ctx.error('Not syncing no structure', { url: info.url })
      return { needSync: '' }
    }

    if (info.repository == null && existing !== undefined) {
      if (this.client.getHierarchy().hasMixin(existing, github.mixin.GithubIssue)) {
        const repositoryId = this.client.getHierarchy().as(existing, github.mixin.GithubIssue).repository

        if (repositoryId !== undefined) {
          info.repository = repositoryId
          await derivedClient.update(info, { repository: repositoryId })
        }
        if (info.repository == null) {
          // No need to sync if component it not yet set
          const repos = (await this.provider.getProjectRepositories(container.project._id))
            .map((it) => it.name)
            .join(', ')
          this.ctx.error('Not syncing repository === null', {
            url: info.url,
            identifier: (existing as Issue).identifier,
            repos
          })
          return { needSync: githubSyncVersion }
        }
      }
    }

    let externalWasCreated = false

    let issueExternal = info.external as IssueExternalData
    if (info.external === undefined && existing !== undefined) {
      const repository = await this.provider.getRepositoryById(info.repository)
      if (repository === undefined) {
        const repos = (await this.provider.getProjectRepositories(container.project._id))
          .map((it) => it.name)
          .join(', ')
        this.ctx.error('Not syncing repository === undefined', {
          url: info.url,
          identifier: (existing as Issue).identifier,
          repos
        })
        return { needSync: githubSyncVersion }
      }

      const description = await this.ctx.withLog('query collaborative description', {}, async () => {
        const collabId = makeDocCollabId(existing, 'description')
        return await this.collaborator.getMarkup(collabId, (existing as Issue).description)
      })

      this.ctx.info('create github issue', {
        title: (existing as Issue).title,
        number: (existing as Issue).number,
        workspace: this.provider.getWorkspaceId().name
      })
      const createdIssueData = await this.ctx.withLog(
        'create github issue',
        {},
        async () => {
          this.createPromise = this.createGithubIssue(container, { ...(existing as Issue), description }, repository)
          return await this.createPromise
        },
        { id: (existing as Issue).identifier, workspace: this.provider.getWorkspaceId().name }
      )
      if (createdIssueData === undefined) {
        this.ctx.error('Error create issue', { url: info.url })
        return { needSync: githubSyncVersion, error: 'Unknown error on create issue' }
      }
      issueExternal = createdIssueData

      // Store external value created.
      const update: DocumentUpdate<DocSyncInfo> = {
        external: issueExternal,
        externalVersion: githubExternalSyncVersion,
        url: issueExternal.url.toLowerCase(),
        githubNumber: issueExternal.number,
        lastModified: new Date(issueExternal.updatedAt).getTime(),
        addHulyLink: false, // Do not need, since we create comment on Github about issue is connected.
        current: {
          title: issueExternal.title,
          description: await this.provider.getMarkup(container.container, issueExternal.body, this.stripGuestLink)
        }
      }
      needCreateConnectedAtHuly = true
      await derivedClient.update(info, update)
      info.external = update.external
      info.externalVersion = update.externalVersion
      info.current = update.current

      externalWasCreated = true
    }
    if (info.externalVersion !== githubExternalSyncVersion) {
      // We wait external sync.
      return { needSync: githubSyncVersion }
    }

    let target = await this.getMilestoneIssueTarget(
      container.project,
      container.container,
      existing as Issue,
      issueExternal
    )
    if (target === undefined) {
      target = this.getProjectIssueTarget(container.project, issueExternal)
    }

    const syncResult = await this.syncToTarget(target, container, existing, issueExternal, derivedClient, info)

    if (externalWasCreated && existing !== undefined) {
      // Create child documents
      const createId = generateId()
      while (true) {
        const attachedDocs = await this.client.findAll(
          github.class.DocSyncInfo,
          { attachedTo: existing._id, createId: { $ne: createId } },
          { sort: { createdOn: SortingOrder.Ascending }, limit: 50 }
        )
        if (attachedDocs.length === 0) {
          break
        }

        await this.provider.doSyncFor(attachedDocs, container.project)
        for (const child of attachedDocs) {
          await derivedClient.update(child, { createId })
        }
      }
    }

    if (existing !== undefined && issueExternal !== undefined && needCreateConnectedAtHuly) {
      await this.addHulyLink(info, syncResult, existing, issueExternal, container)
    }

    return {
      ...syncResult,
      issueExternal,
      targetNodeId: target.target.projectNodeId
    }
  }

  async syncToTarget (
    target: IssueSyncTarget,
    container: ContainerFocus,
    existing: Doc | undefined,
    issueExternal: IssueExternalData,
    derivedClient: TxOperations,
    info: DocSyncInfo
  ): Promise<DocumentUpdate<DocSyncInfo>> {
    const account =
      existing?.modifiedBy ?? (await this.provider.getAccount(issueExternal.author))?._id ?? core.account.System
    const accountGH =
      info.lastGithubUser ?? (await this.provider.getAccount(issueExternal.author))?._id ?? core.account.System

    const isProjectProjectTarget = target.target.projectNodeId === target.project.projectNodeId
    const supportProjects =
      (isProjectProjectTarget && syncConfig.MainProject) || (!isProjectProjectTarget && syncConfig.SupportMilestones)

    // A target node id
    const targetNodeId: string | undefined = info.targetNodeId as string

    const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit

    const type = await this.provider.getTaskTypeOf(container.project.type, tracker.class.Issue)
    const statuses = await this.provider.getStatuses(type?._id)
    // collaborators: assignees.map((it) => it._id),
    const assignees = await this.getAssignees(issueExternal)

    const issueData = {
      title: issueExternal.title,
      description: await this.provider.getMarkup(container.container, issueExternal.body, this.stripGuestLink),
      assignee: assignees[0]?.person,
      repository: info.repository,
      remainingTime: 0
    }

    const taskTypes = (await this.client.findAll(task.class.TaskType, { parent: container.project.type })).filter(
      (it) =>
        this.client.getHierarchy().isDerived(it.targetClass, tracker.class.Issue) &&
        !this.client.getHierarchy().isDerived(it.targetClass, github.class.GithubPullRequest)
    )

    // TODO: Use GithubProject configuration to specify target type for issues
    if (taskTypes.length === 0) {
      // Missing required task type
      this.ctx.error('Missing required task type', { identifier: (existing as Issue)?.identifier })
      return { needSync: githubSyncVersion }
    }

    await this.fillProjectV2Fields(target, container, issueData, taskTypes[0])

    if (
      targetNodeId !== undefined &&
      target.target.projectNodeId !== undefined &&
      targetNodeId !== target.target.projectNodeId &&
      supportProjects
    ) {
      const itemNode = issueExternal.projectItems.nodes.find((it) => it.project.id === targetNodeId)
      if (itemNode !== undefined) {
        await this.removeIssueFromProject(okit, targetNodeId, itemNode.id)
        // remove data
        issueExternal.projectItems.nodes = issueExternal.projectItems.nodes.filter((it) => it.id !== targetNodeId)
        target.prjData = undefined
        await derivedClient.update(info, {
          external: issueExternal,
          externalVersion: githubExternalSyncVersion
        })
        // We need to sync from platform as new to new project.
        // We need to remove current sync
        info.current = {}
      }
    }

    if (target.prjData === undefined && okit !== undefined && syncConfig.IssuesInProject && supportProjects) {
      try {
        this.ctx.info('add issue to project v2', {
          url: issueExternal.url,
          workspace: this.provider.getWorkspaceId().name
        })
        target.prjData = await this.ctx.withLog('add issue to project v2', {}, () =>
          this.addIssueToProject(container, okit, issueExternal, target.target.projectNodeId as string)
        )
        if (target.prjData !== undefined) {
          issueExternal.projectItems.nodes.push(target.prjData)
        }

        await derivedClient.update(info, {
          external: issueExternal,
          externalVersion: githubExternalSyncVersion
        })
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('Error add project v2', { err })
        return { needSync: githubSyncVersion, error: JSON.stringify(err) }
      }
    }
    if (existing === undefined) {
      try {
        this.ctx.info('create platform issue', {
          url: issueExternal.url,
          title: issueExternal.title,
          workspace: this.provider.getWorkspaceId().name
        })
        const { markdownCompatible, markdown } = await this.provider.checkMarkdownConversion(
          container.container,
          issueExternal.body
        )
        const repo = await this.provider.getRepositoryById(info.repository)
        if (repo == null) {
          // No repository, it probable deleted
          return { needSync: githubSyncVersion }
        }
        await this.ctx.withLog(
          'create platform issue',
          {},
          async () => {
            const st = (await guessStatus(issueExternal, statuses))._id as Ref<Status>

            await this.createNewIssue(
              info,
              accountGH,
              {
                ...issueData,
                status: st
              },
              issueExternal,
              info.repository as Ref<GithubIntegrationRepository>,
              container.project,
              taskTypes[0]._id,
              repo as GithubIntegrationRepository & {
                repository: IntegrationRepositoryData
              },
              !markdownCompatible
            )
          },
          { url: issueExternal.url }
        )
        // We need reiterate to update all sync data.
        return {
          needSync: '',
          external: issueExternal,
          externalVersion: githubExternalSyncVersion,
          lastModified: new Date(issueExternal.updatedAt).getTime(),
          lastGithubUser: null,
          isDescriptionLocked: !markdownCompatible,
          markdown
        }
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('Error', { err })
        return { needSync: githubSyncVersion, error: JSON.stringify(err) }
      }
    } else {
      try {
        const description = await this.ctx.withLog(
          'query collaborative description',
          {},
          async () => {
            const collabId = makeDocCollabId(existing, 'description')
            return await this.collaborator.getMarkup(collabId, (existing as Issue).description)
          },
          { url: issueExternal.url }
        )

        const updateResult = await this.ctx.withLog(
          'diff update',
          {},
          async () =>
            await this.handleDiffUpdate(
              target,
              { ...(existing as any), description },
              info,
              issueData,
              container,
              issueExternal,
              account,
              accountGH,
              supportProjects
            ),
          { url: issueExternal.url }
        )
        return {
          ...updateResult,
          lastModified: new Date(issueExternal.updatedAt).getTime(),
          lastGithubUser: null
        }
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('error sync', { err })
        return { needSync: githubSyncVersion, error: JSON.stringify(err), external: issueExternal }
      }
    }
  }

  async afterSync (existing: Issue, update: DocumentUpdate<Doc>, account: Ref<Account>): Promise<void> {}

  async performIssueFieldsUpdate (
    info: DocSyncInfo,
    existing: WithMarkup<Issue>,
    platformUpdate: DocumentUpdate<Issue>,
    issueData: Pick<WithMarkup<Issue>, 'title' | 'description' | 'assignee' | 'status' | 'remainingTime' | 'component'>,
    container: ContainerFocus,
    issueExternal: IssueExternalData,
    okit: Octokit,
    account: Ref<Account>
  ): Promise<boolean> {
    const { state, stateReason, body, ...issueUpdate } = await this.collectIssueUpdate(
      info,
      existing,
      platformUpdate,
      issueData,
      container,
      issueExternal,
      tracker.class.Issue
    )

    const isLocked =
      info.isDescriptionLocked === true && !(await this.provider.isPlatformUser(account as Ref<PersonAccount>))

    const hasFieldStateChanges = Object.keys(issueUpdate).length > 0 || state !== undefined
    // We should allow modification from user.

    const closeIssue = async (): Promise<void> => {
      await okit?.graphql(
        `
      mutation closeIssue($issue: ID!) {
        closeIssue(input: {
          issueId: $issue,
          stateReason: ${stateReason === 'not_planed' ? 'NOT_PLANNED' : 'COMPLETED'}
        }) {
          issue {
            id
            updatedAt
          }
        }
      }`,
        { issue: issueExternal.id }
      )
    }

    const reopenIssue = async (): Promise<void> => {
      await okit?.graphql(
        `
      mutation reopenIssue($issue: ID!) {
        reopenIssue(input: {
          issueId: $issue
        }) {
          issue {
            id
            updatedAt
          }
        }
      }`,
        { issue: issueExternal.id }
      )
    }

    if (hasFieldStateChanges || body !== undefined) {
      if (body !== undefined && !isLocked) {
        await this.ctx.withLog(
          '==> updateIssue',
          {},
          async () => {
            this.ctx.info('update fields', {
              url: issueExternal.url,
              ...issueUpdate,
              body,
              workspace: this.provider.getWorkspaceId().name
            })
            if (isGHWriteAllowed()) {
              if (state === 'OPEN') {
                // We need to call re-open issue
                await reopenIssue()
              }
              await okit?.graphql(
                `
              mutation updateIssue($issue: ID!, $body: String! ) {
                updateIssue(input: {
                  id: $issue,
                  ${gqlp(issueUpdate)},
                  body: $body
                }) {
                  issue {
                    id
                    updatedAt
                  }
                }
              }`,
                { issue: issueExternal.id, body }
              )
              if (state === 'CLOSED') {
                await closeIssue()
              }
            }
          },
          { url: issueExternal.url, id: existing._id }
        )
        issueData.description = await this.provider.getMarkup(container.container, body, this.stripGuestLink)
      } else if (hasFieldStateChanges) {
        await this.ctx.withLog(
          '==> updateIssue',
          {},
          async () => {
            this.ctx.info('update fields', { ...issueUpdate, workspace: this.provider.getWorkspaceId().name })
            if (isGHWriteAllowed()) {
              const hasOtherChanges = Object.keys(issueUpdate).length > 0
              if (state === 'OPEN') {
                // We need to call re-open issue
                await reopenIssue()
              }
              if (hasOtherChanges) {
                await okit?.graphql(
                  `
                mutation updateIssue($issue: ID!) {
                  updateIssue(input: {
                    id: $issue,
                    ${gqlp(issueUpdate)}
                  }) {
                    issue {
                      id
                      updatedAt
                    }
                  }
                }`,
                  { issue: issueExternal.id }
                )
              }
              if (state === 'CLOSED') {
                await closeIssue()
              }
            }
          },
          { url: issueExternal.url }
        )
      }
      return true
    }
    return false
  }

  async createGithubIssue (
    container: ContainerFocus,
    existing: WithMarkup<Issue>,
    repository: GithubIntegrationRepository
  ): Promise<IssueExternalData | undefined> {
    const existingIssue = existing

    const okit =
      (await this.provider.getOctokit(existingIssue.modifiedBy as Ref<PersonAccount>)) ?? container.container.octokit

    const repoId = repository.nodeId

    const info =
      existingIssue.assignee !== null
        ? await this.provider.getGithubLogin(container.container, existingIssue.assignee)
        : undefined

    const assigneeIds = info !== undefined ? [info.id] : []

    const q = `mutation createIssue($repo:ID!, $title: String!, $body: String, $assigneeIds: [ID!]) {
      createIssue(
        input: {repositoryId: $repo, title: $title, body: $body, assigneeIds: $assigneeIds}
      ) {
        issue {
          ${issueDetails(true)}
        }
      }
    }`

    const body = (await this.provider.getMarkdown(existingIssue.description)) ?? ''
    if (isGHWriteAllowed()) {
      const response:
      | {
        createIssue: {
          issue: IssueExternalData
        }
      }
      | undefined = await okit?.graphql(q, {
        repo: repoId,
        title: existingIssue.title,
        body,
        assigneeIds
      })

      return response?.createIssue?.issue
    }
  }

  async deleteGithubDocument (container: ContainerFocus, account: Ref<Account>, id: string): Promise<void> {
    const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit

    const q = `mutation deleteIssue($issueID: ID!) {
      deleteIssue(
        input: {issueId: $issueID}
      ) {
        repository {
          url
        }
      }
    }`
    if (isGHWriteAllowed()) {
      await okit?.graphql(q, {
        issueID: id
      })
    }
  }

  private async createNewIssue (
    info: DocSyncInfo,
    account: Ref<Account>,
    issueData: GithubIssueData & { status: Issue['status'] },
    issueExternal: IssueExternalData,
    repo: Ref<GithubIntegrationRepository>,
    prj: GithubProject,
    taskType: Ref<TaskType>,
    repository: GithubIntegrationRepository,
    isDescriptionLocked: boolean
  ): Promise<void> {
    const lastOne = await this.client.findOne<Issue>(
      tracker.class.Issue,
      { space: prj._id },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await this.client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      prj._id,
      { $inc: { sequence: 1 } },
      true,
      new Date().getTime(),
      account
    )

    const number = (incResult as any).object.sequence

    const issueId = info._id as unknown as Ref<Issue>

    const { description, ...update } = issueData

    const collabId = makeCollabId(tracker.class.Issue, issueId, 'description')
    const contentId = makeCollabJsonId(collabId)

    const value: AttachedData<Issue> = {
      ...update,
      description: contentId,
      kind: taskType,
      component: null,
      milestone: null,
      number,
      priority: IssuePriority.NoPriority,
      rank: calcRank(lastOne, undefined),
      comments: 0,
      subIssues: 0,
      dueDate: null,
      parents: [],
      reportedTime: 0,
      remainingTime: 0,
      estimation: 0,
      reports: 0,
      relations: [],
      childInfo: [],
      identifier: `${prj.identifier}-${number}`
    }

    await this.collaborator.updateMarkup(collabId, description)

    await this.client.addCollection(
      tracker.class.Issue,
      prj._id,
      tracker.ids.NoParent,
      tracker.class.Issue,
      'subIssues',
      value,
      issueId,
      new Date(issueExternal.createdAt).getTime(),
      account
    )

    // Compare description and our markdown and mark issue as description locked in case they are not match.

    await this.client.createMixin(issueId, tracker.class.Issue, prj._id, github.mixin.GithubIssue, {
      githubNumber: issueExternal.number,
      url: issueExternal.url,
      repository: repo,
      descriptionLocked: isDescriptionLocked
    })
    await this.client.createMixin<Issue, Issue>(issueId, github.mixin.GithubIssue, prj._id, prj.mixinClass, {})

    await this.addConnectToMessage(
      github.string.IssueConnectedActivityInfo,
      prj._id,
      issueId,
      tracker.class.Issue,
      issueExternal,
      repository
    )
  }

  async fillBackChanges (update: DocumentUpdate<Issue>, existing: TGithubIssue, external: any): Promise<void> {}

  async externalSync (
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    kind: ExternalSyncField,
    syncDocs: DocSyncInfo[],
    repo: GithubIntegrationRepository,
    prj: GithubProject
  ): Promise<void> {
    // Wait global project sync
    await integration.syncLock.get(prj._id)

    const allSyncDocs = [...syncDocs]
    //
    let partsize = 50
    try {
      while (true) {
        if (this.provider.isClosing()) {
          break
        }
        const docsPart = allSyncDocs.splice(0, partsize)
        const idsPart = docsPart.map((it) => (it.external as IssueExternalData).id).filter((it) => it !== undefined)
        if (idsPart.length === 0) {
          break
        }
        const idsp = idsPart.map((it) => `"${it}"`).join(', ')
        try {
          const response: any = await this.ctx.with(
            'graphql.listIssue',
            { prj: prj.name, repo: repo.name },
            () =>
              integration.octokit.graphql(
                `query listIssues {
                    nodes(ids: [${idsp}] ) {
                      ... on Issue {
                        ${issueDetails(true)}
                      }
                    }
                  }`
              ),
            {
              prj: prj.name,
              repo: repo.name,
              ids: idsp
            }
          )
          const issues: IssueExternalData[] = response.nodes

          if (issues.some((issue) => issue.url === undefined && Object.keys(issue).length === 0)) {
            this.ctx.error('empty document content', {
              repo: repo.name,
              workspace: this.provider.getWorkspaceId().name,
              data: cutObjectArray(response)
            })
          }

          await this.syncIssues(tracker.class.Issue, repo, issues, derivedClient, docsPart)
        } catch (err: any) {
          if (partsize > 1) {
            partsize = 1
            allSyncDocs.push(...docsPart)
            this.ctx.warn('issue external retrieval switch to one by one mode', {
              errors: err.errors,
              msg: err.message,
              workspace: this.provider.getWorkspaceId().name
            })
          } else if (partsize === 1) {
            // We need to update issue, since it is missing on external side.
            const syncDoc = syncDocs.find((it) => it.external.id === idsPart[0])
            if (syncDoc !== undefined) {
              this.ctx.warn('mark missing external PR', {
                errors: err.errors,
                msg: err.message,
                url: syncDoc.url,
                workspace: this.provider.getWorkspaceId().name
              })
              await derivedClient.diffUpdate(
                syncDoc,
                {
                  needSync: githubSyncVersion,
                  externalVersion: githubExternalSyncVersion,
                  derivedVersion: githubDerivedSyncVersion
                },
                Date.now()
              )
            }
          }
        }
      }
      for (const d of syncDocs) {
        if ((d.external as IssueExternalData).id == null) {
          this.ctx.error('failed to do external sync for', { objectClass: d.objectClass, _id: d._id })
          // no external data for doc
          await derivedClient.update<DocSyncInfo>(d, {
            externalVersion: githubExternalSyncVersion
          })
        }
      }
      this.provider.sync()
    } catch (err: any) {
      Analytics.handleError(err)
      this.ctx.error('Error', { err })
    }
  }

  repositoryDisabled (integration: IntegrationContainer, repo: GithubIntegrationRepository): void {
    integration.synchronized.delete(`${repo._id}:issues`)
  }

  async externalFullSync (
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    projects: GithubProject[],
    repositories: GithubIntegrationRepository[]
  ): Promise<void> {
    for (const repo of repositories) {
      if (this.provider.isClosing()) {
        break
      }
      const prj = projects.find((it) => repo.githubProject === it._id)
      if (prj === undefined) {
        continue
      }
      // Wait global project sync
      await integration.syncLock.get(prj._id)

      const syncKey = `${repo._id}:issues`
      if (
        repo.githubProject === undefined ||
        !repo.enabled ||
        integration.synchronized.has(syncKey) ||
        integration.octokit === undefined
      ) {
        if (!repo.enabled) {
          integration.synchronized.delete(syncKey)
        }
        continue
      }
      const since = await getSince(this.client, tracker.class.Issue, repo)

      this.ctx.info('sync external issues', { repo: repo.name, since, workspace: this.provider.getWorkspaceId().name })

      const i = integration.octokit.graphql.paginate.iterator(
        `query listIssue($name: String!, $owner: String!, $since: DateTime!, $cursor: String) {
          repository(name: $name, owner: $owner) {
            issues(first: 50, orderBy: {field: UPDATED_AT, direction: ASC}, filterBy: { since: $since }, after: $cursor) {
              nodes {
               ${issueDetails(true)}
              }
              pageInfo {
                startCursor
                hasNextPage
                endCursor
              }
              totalCount
            }
          }
        }
        `,
        {
          name: repo.name,
          owner: repo.owner?.login ?? '',
          since: since ?? '1970-01-01T01:00:00Z'
        }
      )
      try {
        for await (const data of i) {
          if (this.provider.isClosing()) {
            break
          }
          const issues: IssueExternalData[] = data.repository.issues.nodes
          if (issues.some((issue) => issue.url === undefined && Object.keys(issue).length === 0)) {
            this.ctx.error('empty document content', {
              repo: repo.name,
              workspace: this.provider.getWorkspaceId().name,
              data: cutObjectArray(data)
            })
          }
          await this.syncIssues(tracker.class.Issue, repo, issues, derivedClient)
          this.provider.sync()
        }
      } catch (err: any) {
        this.ctx.error('Error', { err })
        Analytics.handleError(err)
      }

      this.ctx.info('sync external issues - done', {
        repo: repo.name,
        since,
        workspace: this.provider.getWorkspaceId().name
      })
      integration.synchronized.add(syncKey)
    }
  }
}
