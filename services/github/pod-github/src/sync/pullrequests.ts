import { Analytics } from '@hcengineering/analytics'
import { Person } from '@hcengineering/contact'
import core, {
  PersonId,
  AttachedData,
  Doc,
  DocumentUpdate,
  Ref,
  SortingOrder,
  Status,
  TxCUD,
  TxMixin,
  TxOperations,
  TxProcessor,
  WithLookup,
  cutObjectArray,
  generateId,
  makeCollabId,
  makeDocCollabId
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubIssue,
  GithubIssueStateReason,
  GithubProject,
  GithubPullRequest,
  GithubPullRequestState,
  GithubTodo,
  LastReviewState
} from '@hcengineering/github'
import task, { TaskType, calcRank, makeRank } from '@hcengineering/task'
import time, { ToDo, ToDoPriority } from '@hcengineering/time'
import tracker, { Issue, IssuePriority, IssueStatus, Project } from '@hcengineering/tracker'
import { ProjectsV2ItemEvent, PullRequestEvent } from '@octokit/webhooks-types'
import { Octokit } from 'octokit'
import config from '../config'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  IntegrationContainer,
  UserInfo,
  githubDerivedSyncVersion,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import {
  IssueExternalData,
  PullRequestExternalData,
  PullRequestReviewState,
  Review,
  getUpdatedAtReviewThread,
  pullRequestDetails,
  toPRState,
  toReviewDecision,
  toReviewState
} from './githubTypes'
import { GithubIssueData, IssueSyncManagerBase, IssueSyncTarget, WithMarkup } from './issueBase'
import { syncConfig } from './syncConfig'
import {
  errorToObj,
  getSinceRaw,
  gqlp,
  guessStatus,
  isGHWriteAllowed,
  syncChilds,
  syncDerivedDocuments,
  syncRunner
} from './utils'

type GithubPullRequestData = GithubIssueData &
Omit<GithubPullRequest, keyof Issue | 'commits' | 'reviews' | 'reviewComments'>

type GithubPullRequestUpdate = DocumentUpdate<WithMarkup<GithubPullRequest>>

export class PullRequestSyncManager extends IssueSyncManagerBase implements DocSyncManager {
  externalDerivedSync = true
  async handleEvent<T>(integration: IntegrationContainer, derivedClient: TxOperations, evt: T): Promise<void> {
    const _event = evt as PullRequestEvent | ProjectsV2ItemEvent

    if (_event.sender.type === 'Bot') {
      // Ignore events from Bot if it is our bot
      // No need to handle event from ourself
      if (_event.sender.login.includes(config.BotName)) {
        return
      }
    }
    this.ctx.info('pull request:handleEvent', {
      nodeId:
        (_event as PullRequestEvent).pull_request?.html_url ??
        (_event as ProjectsV2ItemEvent).projects_v2_item?.node_id,
      action: _event.action,
      login: _event.sender.login,
      type: _event.sender.type,
      workspace: this.provider.getWorkspaceId()
    })

    const projectV2Event = (_event as any as ProjectsV2ItemEvent).projects_v2_item?.id !== undefined
    if (projectV2Event) {
      const projectV2Event = _event as ProjectsV2ItemEvent

      const githubProjects = await this.provider.liveQuery.findAll(github.mixin.GithubProject, {
        archived: false
      })
      let prj = githubProjects.find((it) => it.projectNodeId === projectV2Event.projects_v2_item.project_node_id)
      if (prj === undefined) {
        // Checking for milestones
        const m = await this.provider.liveQuery.findOne(github.mixin.GithubMilestone, {
          projectNodeId: projectV2Event.projects_v2_item.project_node_id
        })
        if (m !== undefined) {
          prj = githubProjects.find((it) => it._id === m.space)
        }
      }

      if (prj === undefined) {
        this.ctx.info('Event from unknown v2 project', {
          nodeId: projectV2Event.projects_v2_item.project_node_id,
          workspace: this.provider.getWorkspaceId()
        })
        return
      }

      const urlId = projectV2Event.projects_v2_item.node_id

      await syncRunner.exec(urlId, async () => {
        await this.processProjectV2Event(integration, projectV2Event, derivedClient, prj as GithubProject)
      })
    } else {
      const event = _event as PullRequestEvent
      const { project, repository } = await this.provider.getProjectAndRepository(event.repository.node_id)

      if (project === undefined || repository === undefined) {
        this.ctx.info('No project for repository', {
          name: event.repository.name,
          workspace: this.provider.getWorkspaceId()
        })
        return
      }
      const url = event.pull_request.issue_url

      await syncRunner.exec(url, async () => {
        await this.processEvent(event, derivedClient, repository, integration, project)
      })
    }
  }

  private async processEvent (
    event: PullRequestEvent,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    integration: IntegrationContainer,
    prj: GithubProject
  ): Promise<void> {
    const account = (await this.provider.getAccountU(event.sender))?._id ?? core.account.System

    let externalData: PullRequestExternalData
    try {
      const response: any = await integration.octokit?.graphql(
        `query listIssue($name: String!, $owner: String!, $issue: Int!) {
          repository(name: $name, owner: $owner) {
            pullRequest(number: $issue) {
              ${pullRequestDetails}
            }
          }
        }
        `,
        {
          name: repo.name,
          owner: repo.owner?.login,
          issue: event.pull_request.number
        }
      )
      externalData = response.repository.pullRequest
    } catch (err: any) {
      this.ctx.error('Error', { err })
      Analytics.handleError(err)
      await this.createErrorSyncDataByUrl(
        event.pull_request.html_url,
        event.pull_request.number,
        new Date(event.pull_request.updated_at),
        derivedClient,
        repo,
        err
      )
      return
    }
    if (externalData === undefined) {
      await this.createErrorSyncDataByUrl(
        event.pull_request.html_url,
        event.pull_request.number,
        new Date(event.pull_request.updated_at),
        derivedClient,
        repo,
        'no external data found'
      )
      return
    }

    switch (event.action) {
      case 'opened': {
        await this.createSyncData(externalData, derivedClient, repo, account)
        break
      }
      case 'edited': {
        const update: GithubPullRequestUpdate = {}
        const du: DocumentUpdate<DocSyncInfo> = {}
        if (event.changes.title !== undefined) {
          update.title = event.pull_request.title
        }
        if (event.changes.body !== undefined) {
          update.description = await this.provider.getMarkup(integration, event.pull_request.body, this.stripGuestLink)
          du.markdown = await this.provider.getMarkdown(update.description)
        }
        if (event.changes.base !== undefined) {
          update.base = externalData.baseRef
        }
        await this.handleUpdate(externalData, derivedClient, update, account, prj, false, undefined, undefined, du)
        break
      }
      case 'review_requested': {
        const update: GithubPullRequestUpdate = {}
        await this.handleUpdate(externalData, derivedClient, update, account, prj, true)
        break
      }
      case 'review_request_removed': {
        const update: GithubPullRequestUpdate = {}
        await this.handleUpdate(externalData, derivedClient, update, account, prj, true)
        break
      }
      case 'converted_to_draft':
      case 'ready_for_review': {
        await this.handleUpdate(externalData, derivedClient, {}, account, prj, true)
        break
      }
      case 'assigned':
      case 'unassigned': {
        const assignees = await this.getAssignees(externalData)
        const update: GithubPullRequestUpdate = {
          assignee: assignees?.[0]?.person ?? null
        }
        await this.handleUpdate(externalData, derivedClient, update, account, prj, true)
        break
      }
      case 'closed':
      case 'reopened': {
        const type = await this.provider.getTaskTypeOf(prj.type, github.class.GithubPullRequest)
        const statuses = await this.provider.getStatuses(type?._id)

        const isMerged = event.pull_request?.merged_at !== null

        const update: GithubPullRequestUpdate = {
          draft: externalData.isDraft,
          head: externalData.headRef,
          base: externalData.baseRef,
          mergeable: externalData.mergeable,
          commits: externalData.commits?.nodes?.length,
          remainingTime: 0,
          state: toPRState(externalData.state ?? 'OPEN'),
          reviewDecision: toReviewDecision(externalData.reviewDecision ?? 'REVIEW_REQUIRED'),
          ...(event.action === 'closed'
            ? {
                status: (
                  await guessStatus(
                    {
                      state: 'CLOSED',
                      stateReason: isMerged ? GithubIssueStateReason.Completed : GithubIssueStateReason.NotPlanned
                    },
                    statuses
                  )
                )._id,
                mergedAt:
                  event.pull_request?.merged_at !== null ? new Date(event.pull_request?.merged_at).getTime() : null,
                closedAt:
                  event.pull_request?.closed_at !== null ? new Date(event.pull_request?.closed_at).getTime() : null
              }
            : {
                status: (await guessStatus({ state: 'OPEN', stateReason: GithubIssueStateReason.Reopened }, statuses))
                  ._id,
                mergedAt: null,
                closedAt: null
              })
        }
        await this.handleUpdate(
          externalData,
          derivedClient,
          update,
          account,
          prj,
          true,
          undefined,
          async (state, existing, external, update) => {
            // We need to be sure we not change status if category is same, since github doesn't know about it.
            const existingStatus = statuses.find((it) => it._id === existing.status)
            const updateState = statuses.find((it) => it._id === update.status)
            if (existingStatus?.category === updateState?.category) {
              delete update.status
            }
            return true
          }
        )
        break
      }
      case 'synchronize': {
        const syncData = await this.client.findOne(github.class.DocSyncInfo, {
          space: repo.githubProject as Ref<GithubProject>,
          url: (externalData.url ?? '').toLowerCase()
        })
        if (syncData !== undefined) {
          await derivedClient.update(syncData, {
            needSync: '',
            external: externalData,
            derivedVersion: '', // Check derived changes
            updatePatch: true
          })
          this.provider.sync()
        }
        break
      }
    }
  }

  // async getReviewers (issue: PullRequestExternalData): Promise<PersonAccount[]> {
  //   // Find Assignees and reviewers
  //   const ids: UserInfo[] = issue.reviewRequests.nodes.map((it: any) => it.requestedReviewer)

  //   const values: PersonAccount[] = []

  //   for (const o of ids) {
  //     const acc = await this.provider.getAccount(o)
  //     if (acc !== undefined) {
  //       values.push(acc)
  //     }
  //   }

  //   for (const n of issue.latestReviews.nodes) {
  //     const acc = await this.provider.getAccount(n.author)
  //     if (acc !== undefined) {
  //       values.push(acc)
  //     }
  //   }
  //   return values
  // }

  private async createSyncData (
    pullRequestExternal: PullRequestExternalData,
    derivedClient: TxOperations,
    repo: GithubIntegrationRepository,
    account: PersonId
  ): Promise<void> {
    const lastModified = new Date(pullRequestExternal.updatedAt).getTime()
    await derivedClient.createDoc(github.class.DocSyncInfo, repo.githubProject as Ref<GithubProject>, {
      url: pullRequestExternal.url.toLowerCase(),
      needSync: '', // we need to sync to retrieve patch in background
      githubNumber: pullRequestExternal.number,
      repository: repo._id,
      objectClass: github.class.GithubPullRequest,
      external: pullRequestExternal,
      externalVersion: githubExternalSyncVersion,
      derivedVersion: '',
      addHulyLink: true,
      lastModified,
      lastGithubUser: account
    })
    // We need trigger comments, if their sync data created before
    const childInfos = await this.client.findAll(github.class.DocSyncInfo, {
      parent: (pullRequestExternal.url ?? '').toLowerCase()
    })
    for (const child of childInfos) {
      await derivedClient?.update(child, { needSync: '' })
    }
    this.provider.sync()
  }

  async syncToTarget (
    target: IssueSyncTarget,
    container: ContainerFocus,
    existing: Doc | undefined,
    pullRequestExternal: PullRequestExternalData,
    derivedClient: TxOperations,
    info: DocSyncInfo
  ): Promise<DocumentUpdate<DocSyncInfo>> {
    const account =
      existing?.modifiedBy ?? (await this.provider.getAccount(pullRequestExternal.author))?._id ?? core.account.System
    const accountGH =
      info.lastGithubUser ?? (await this.provider.getAccount(pullRequestExternal.author))?._id ?? core.account.System

    // A target node id
    const targetNodeId: string | undefined = info.targetNodeId as string

    const okit = (await this.provider.getOctokit(account as PersonId)) ?? container.container.octokit

    const isProjectProjectTarget = target.target.projectNodeId === target.project.projectNodeId
    const supportProjects =
      (isProjectProjectTarget && syncConfig.MainProject) || (!isProjectProjectTarget && syncConfig.SupportMilestones)

    const type = await this.provider.getTaskTypeOf(container.project.type, github.class.GithubPullRequest)
    const statuses = await this.provider.getStatuses(type?._id)

    if (
      targetNodeId !== undefined &&
      target.target.projectNodeId !== undefined &&
      targetNodeId !== target.target.projectNodeId &&
      supportProjects
    ) {
      const itemNode = pullRequestExternal.projectItems.nodes.find((it) => it.project.id === targetNodeId)
      if (itemNode !== undefined) {
        await this.removeIssueFromProject(okit, target.target.projectNodeId, itemNode.id)
        // remove data
        pullRequestExternal.projectItems.nodes = pullRequestExternal.projectItems.nodes.filter(
          (it) => it.id !== targetNodeId
        )
        await derivedClient.update(info, {
          external: pullRequestExternal,
          externalVersion: githubExternalSyncVersion
        })
        target.prjData = undefined
        // We need to sync from platform as new to new project.
        // We need to remove current sync
        info.current = {}
      }
    }

    // Check if issue are added to project.
    if (target.prjData === undefined && okit !== undefined && supportProjects) {
      try {
        target.prjData = await this.ctx.withLog(
          'add pull request to project}',
          {},
          () => this.addIssueToProject(container, okit, pullRequestExternal, target.target.projectNodeId as string),
          { url: pullRequestExternal.url }
        )
        if (target.prjData !== undefined) {
          pullRequestExternal.projectItems.nodes.push(target.prjData)
        }

        await derivedClient.update(info, {
          external: pullRequestExternal,
          externalVersion: githubExternalSyncVersion
        })
      } catch (err: any) {
        this.ctx.error('Error', { err })
        Analytics.handleError(err)
        return { needSync: githubSyncVersion, error: errorToObj(err) }
      }
    }

    const assignees = await this.getAssignees(pullRequestExternal)
    // TODO: FIXME
    const reviewers: any = [] // await this.getReviewers(pullRequestExternal)

    const latestReviews: LastReviewState[] = []

    for (const d of pullRequestExternal.latestReviews?.nodes ?? []) {
      const author = (await this.provider.getAccount(d.author))?._id
      if (author !== undefined) {
        latestReviews.push({
          state: toReviewState(d.state),
          user: author
        })
      }
    }
    const pullRequestData: GithubPullRequestData = {
      title: pullRequestExternal.title,
      description: await this.provider.getMarkup(container.container, pullRequestExternal.body, this.stripGuestLink),
      assignee: assignees[0]?.person ?? null,
      reviewers: reviewers.map((it: any) => it.person),
      draft: pullRequestExternal.isDraft,
      head: pullRequestExternal.headRef,
      base: pullRequestExternal.baseRef,
      mergedAt: pullRequestExternal.mergedAt != null ? new Date(pullRequestExternal.mergedAt).getTime() : null,
      closedAt: pullRequestExternal.closedAt != null ? new Date(pullRequestExternal.closedAt).getTime() : null,
      mergeable: pullRequestExternal.mergeable,
      commits: pullRequestExternal.commits?.nodes?.length,
      remainingTime: 0,
      state: toPRState(pullRequestExternal.state ?? 'OPEN'),
      latestReviews,
      reviewDecision: toReviewDecision(pullRequestExternal.reviewDecision ?? 'REVIEW_REQUIRED'),
      files: pullRequestExternal.files.totalCount
    }

    const taskTypes = (await this.client.findAll(task.class.TaskType, { parent: container.project.type })).filter(
      (it) => this.client.getHierarchy().isDerived(it.targetClass, github.class.GithubPullRequest)
    )

    if (taskTypes.length === 0) {
      // Missing required task type
      this.ctx.error('Missing required task type', { url: pullRequestExternal.url })
      return { needSync: githubSyncVersion }
    }
    await this.fillProjectV2Fields(target, container, pullRequestData, taskTypes[0])

    const lastModified = new Date(pullRequestExternal.updatedAt).getTime()

    if (existing === undefined) {
      try {
        await this.ctx.withLog(
          'retrieve pull request patch',
          {},
          () =>
            this.handlePatch(
              info,
              container,
              pullRequestExternal,
              {
                _id: info._id as unknown as Ref<GithubPullRequest>,
                space: info.space as Ref<GithubProject>,
                _class: github.class.GithubPullRequest
              },
              lastModified,
              accountGH
            ),
          { url: pullRequestExternal.url }
        )
        const { markdownCompatible, markdown } = await this.provider.checkMarkdownConversion(
          container.container,
          pullRequestExternal.body
        )

        const op = this.client.apply()
        let createdPullRequest: GithubPullRequest | undefined

        await this.ctx.withLog(
          'create pull request in platform',
          {},
          async () => {
            createdPullRequest = await this.createPullRequest(
              op,
              info,
              accountGH,
              {
                ...pullRequestData,
                status: (await guessStatus(pullRequestExternal, statuses))._id as Ref<Status>
              },
              pullRequestExternal,
              info.repository as Ref<GithubIntegrationRepository>,
              container.project,
              taskTypes[0]._id,
              (await this.provider.getRepositoryById(info.repository)) as GithubIntegrationRepository,
              !markdownCompatible
            )
          },
          { url: pullRequestExternal.url }
        )

        const pullRequestObj =
          createdPullRequest ??
          (await this.client.findOne(github.class.GithubPullRequest, {
            _id: info._id as unknown as Ref<GithubPullRequest>
          }))
        if (pullRequestObj !== undefined) {
          await this.todoSync(op, pullRequestObj, pullRequestExternal, info, account)
        }

        await op.commit()

        // To sync reviews/review threads in case they are created before us.
        await syncChilds(info, this.client, derivedClient)

        return {
          needSync: '',
          external: pullRequestExternal,
          externalVersion: githubExternalSyncVersion,
          lastModified: new Date(pullRequestExternal.updatedAt).getTime(),
          isDescriptionLocked: !markdownCompatible,
          markdown
        }
      } catch (err: any) {
        this.ctx.error('Error', { err })
        Analytics.handleError(err)
        return { needSync: githubSyncVersion, error: errorToObj(err) }
      }
    } else {
      try {
        if (info.updatePatch === true) {
          await this.ctx.withLog(
            'update pull request patch',
            {},
            () =>
              this.handlePatch(
                info,
                container,
                pullRequestExternal,
                {
                  _id: info._id as unknown as Ref<GithubPullRequest>,
                  space: info.space as Ref<GithubProject>,
                  _class: github.class.GithubPullRequest
                },
                lastModified,
                accountGH
              ),
            { url: pullRequestExternal.url }
          )
        }

        const description = await this.ctx.withLog(
          'query collaborative pull request description',
          {},
          async () => {
            const collabId = makeDocCollabId(existing, 'description')
            return await this.collaborator.getMarkup(collabId, (existing as GithubPullRequest).description)
          },
          { url: pullRequestExternal.url }
        )

        const update = await this.ctx.withLog(
          'perform pull request diff update',
          {},
          () =>
            this.handleDiffUpdate(
              target,
              { ...(existing as any), description },
              info,
              pullRequestData,
              container,
              pullRequestExternal,
              account,
              accountGH,
              supportProjects
            ),
          { url: pullRequestExternal.url }
        )
        return {
          ...update,
          updatePatch: false,
          lastModified: new Date(pullRequestExternal.updatedAt).getTime(),
          lastGithubAccount: null
        }
      } catch (err: any) {
        this.ctx.error('Error update pr', { err })
        Analytics.handleError(err)
        return { needSync: githubSyncVersion, error: errorToObj(err), external: pullRequestExternal }
      }
    }
  }

  async afterSync (existing: Issue, account: PersonId, issueExternal: any, info: DocSyncInfo): Promise<void> {
    const pullRequest = existing as GithubPullRequest
    await this.todoSync(this.client, pullRequest, issueExternal as PullRequestExternalData, info, account)
  }

  async todoSync (
    client: TxOperations,
    pullRequest: Pick<
    GithubPullRequest,
    '_id' | 'identifier' | 'reviewers' | 'title' | 'state' | 'space' | '_class' | 'modifiedBy'
    >,
    external: PullRequestExternalData,
    info: DocSyncInfo,
    account: PersonId
  ): Promise<void> {
    // Find all todo's related to PR.
    const allTodos = await client.findAll<GithubTodo>(github.mixin.GithubTodo, { attachedTo: pullRequest._id })
    // We also need to track deleted Todos,
    const removedTodos: GithubTodo[] = []

    const removedTodoOps = await client.findAll<TxCUD<ToDo>>(
      core.class.TxCUD,
      {
        attachedTo: pullRequest._id,
        objectClass: time.class.ProjectToDo,
        objectId: { $nin: allTodos.map((it) => it._id) }
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )

    const todoIds = removedTodoOps.filter((it) => it._class === core.class.TxCreateDoc).map((it) => it.objectId)

    const mixinOps = await client.findAll<TxMixin<ToDo, GithubTodo>>(
      core.class.TxMixin,
      {
        objectId: { $in: todoIds }
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )

    const groupedByTodo = new Map<Ref<ToDo>, TxCUD<ToDo>[]>()

    const h = this.client.getHierarchy()

    // We need to rebuild removed todos's if pressent.
    for (const tx of removedTodoOps) {
      const ops = groupedByTodo.get(tx.objectId)
      groupedByTodo.set(tx.objectId, [...(ops ?? []), tx])
    }

    for (const tx of mixinOps) {
      const ops = groupedByTodo.get(tx.objectId)
      groupedByTodo.set(tx.objectId, [...(ops ?? []), tx])
    }

    for (const [, txes] of groupedByTodo) {
      const todo = TxProcessor.buildDoc2Doc<ToDo>(txes)
      if (todo !== undefined && h.hasMixin(todo, github.mixin.GithubTodo)) {
        removedTodos.push(h.as(todo, github.mixin.GithubTodo))
      }
    }

    const pendingOrDismissed = new Map<Ref<Person>, PullRequestReviewState>()

    const approvedOrChangesRequested = new Map<Ref<Person>, PullRequestReviewState>()
    const reviewStates = new Map<Ref<Person>, PullRequestReviewState[]>()

    const sortedReviews: (Review & { date: number })[] = external.reviews.nodes
      .filter((it) => it != null)
      .map((it) => ({
        ...it,
        date: new Date(it.updatedAt ?? it.submittedAt ?? it.createdAt).getTime()
      }))

    for (const it of external.latestReviews.nodes) {
      if (sortedReviews.some((qt) => it.id === qt.id)) {
        continue
      }

      sortedReviews.push({ ...it, date: new Date(it.updatedAt ?? it.submittedAt ?? it.createdAt).getTime() })
    }

    sortedReviews.sort((a, b) => b.date - a.date)

    for (const r of sortedReviews) {
      const rp = await this.provider.getAccount(r.author)
      if (rp === undefined) {
        continue
      }
      if (r.state === 'PENDING' || r.state === 'DISMISSED') {
        pendingOrDismissed.set(rp.person, r.state)
      }
      if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED') {
        approvedOrChangesRequested.set(rp.person, r.state)
      }
      reviewStates.set(rp.person, [...(reviewStates.get(rp.person) ?? []), r.state])
    }

    for (const r of pullRequest.reviewers ?? []) {
      // Find all related todos's
      const todos = [...allTodos, ...removedTodos].filter((it) => it.user === r && it.purpose === 'review')
      // We also need to check if user deleted, todo, in this case we need to remove review request.

      const hasPending = todos.some((it) => it.doneOn !== null)

      // Create review Todo, if missing.
      if (
        pullRequest.state === GithubPullRequestState.open ||
        (!hasPending && pendingOrDismissed.get(r) !== undefined)
      ) {
        if (todos.length === 0) {
          await this.requestReview(client, pullRequest, external, r, account)
        }
      }
    }

    // Handle change requests.
    // If we have change requests pending, we need to create Todo to resolve them to author or assigned person, to resolve them.

    const changeRequestPersons = new Set<Ref<Person>>()
    const author = await this.provider.getAccount(external.author)
    if (author !== undefined) {
      changeRequestPersons.add(author.person)
    }
    for (const au of external.assignees.nodes ?? []) {
      const u = await this.provider.getAccount(au)
      if (u !== undefined) {
        changeRequestPersons.add(u.person)
      }
    }

    // Check review threads and create todo to resolve them.
    const requestedIds: Ref<Person>[] = []

    let allResolved = true
    for (const r of external.reviewThreads.nodes) {
      if (!r.isResolved) {
        allResolved = false
        for (const c of Array.from(changeRequestPersons)) {
          // We need to add Todo to resolve PR.
          const todos = [...allTodos, ...removedTodos].filter((it) => it.user === c && it.purpose === 'fix')
          if (todos.length === 0) {
            requestedIds.push(c)
            // We do not have todos's create one to solve issue.
            await this.requestFix(client, pullRequest, external, c, account)
          }
        }
        break
      }
    }

    // Handle change request
    if (external.reviewThreads.nodes.length === 0) {
      // If we have changes requested.
      for (const [, sst] of approvedOrChangesRequested.entries()) {
        if (sst === 'CHANGES_REQUESTED') {
          // We have changes requested and not resolved yet.
          for (const c of Array.from(changeRequestPersons)) {
            const todos = [...allTodos, ...removedTodos].filter((it) => it.user === c && it.purpose === 'fix')
            if (todos.length === 0 && !requestedIds.includes(c)) {
              requestedIds.push(c)
              // We do not have todos's create one to solve issue.
              await this.requestFix(client, pullRequest, external, c, account)
            }
          }
        }
      }
    }

    if (allResolved) {
      // We need to complete or remove todo, in case all are resolved.
      if (!Array.from(approvedOrChangesRequested.values()).includes('CHANGES_REQUESTED')) {
        const todos = allTodos.filter((it) => it.purpose === 'fix')
        for (const t of todos) {
          await this.markDoneOrDeleteTodo(t)
        }
      }
    }

    // In case of merged, reviewed, we need to close todos's
    if (pullRequest.state !== GithubPullRequestState.open) {
      for (const td of allTodos.filter((it) => it.doneOn == null)) {
        await this.markDoneOrDeleteTodo(td)
      }
    }
  }

  private async requestReview (
    client: TxOperations,
    pullRequest: Pick<GithubPullRequest, '_id' | 'identifier' | 'space' | '_class' | 'reviewers' | 'title' | 'state'>,
    external: PullRequestExternalData,
    todoUser: Ref<Person>,
    account: PersonId
  ): Promise<void> {
    const latestTodo = await client.findOne(
      time.class.ToDo,
      {
        user: todoUser,
        doneOn: null
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )
    const todoId = await client.addCollection(
      time.class.ProjectToDo,
      time.space.ToDos,
      pullRequest._id,
      pullRequest._class,
      'todos',
      {
        title: 'Review ' + external.title,
        description: external.url,
        attachedSpace: pullRequest.space,
        user: todoUser,
        workslots: 0,
        priority: ToDoPriority.High,
        visibility: 'public',
        rank: makeRank(undefined, latestTodo?.rank)
      },
      undefined,
      undefined,
      account
    )
    await client.createMixin(
      todoId,
      time.class.ToDo,
      time.space.ToDos,
      github.mixin.GithubTodo,
      {
        purpose: 'review'
      },
      undefined,
      account
    )
  }

  private async requestFix (
    client: TxOperations,
    pullRequest: Pick<
    GithubPullRequest,
    '_id' | 'identifier' | 'reviewers' | 'title' | 'space' | 'state' | 'space' | '_class'
    >,
    external: PullRequestExternalData,
    todoUser: Ref<Person>,
    account: PersonId
  ): Promise<void> {
    const latestTodo = await client.findOne(
      time.class.ToDo,
      {
        user: todoUser,
        doneOn: null
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )

    const todoId = await client.addCollection(
      time.class.ProjectToDo,
      time.space.ToDos,
      pullRequest._id,
      pullRequest._class,
      'todos',
      {
        attachedSpace: pullRequest.space,
        title: 'Resolve ' + pullRequest.title,
        description: external.url,
        user: todoUser,
        workslots: 0,
        priority: ToDoPriority.High,
        visibility: 'public',
        rank: makeRank(undefined, latestTodo?.rank)
      },
      undefined,
      undefined,
      account
    )
    await client.createMixin(
      todoId,
      time.class.ToDo,
      time.space.ToDos,
      github.mixin.GithubTodo,
      {
        purpose: 'fix'
      },
      undefined,
      account
    )
  }

  private async markDoneOrDeleteTodo (td: WithLookup<GithubTodo>): Promise<void> {
    // Let's mark as done in any case
    await this.client.update(td, {
      doneOn: Date.now()
    })
  }

  async fillBackChanges (update: DocumentUpdate<Issue>, existing: GithubIssue, external: any): Promise<void> {
    const statuses = await this.provider.getStatuses(existing.kind)
    const status = (existing as unknown as GithubPullRequest).status
    const pullRequestExternal = external as PullRequestExternalData

    // We need to update status in case category are different
    const stInstance =
      statuses.find((it) => it._id === status) ??
      ((await this.client.findOne(core.class.Status, { _id: status })) as Status)

    let gs: IssueStatus | undefined
    if (pullRequestExternal.merged) {
      gs = await guessStatus({ state: 'MERGED' }, statuses)
    }

    // If PR is merged or closed, we need to update platform issue status
    if (gs !== undefined && stInstance.category !== gs.category) {
      update.status = gs._id
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
    const needCreateConnectedAtHuly = info.addHulyLink === true
    if (
      (container.project.projectNodeId === undefined ||
        !container.container.projectStructure.has(container.project._id)) &&
      syncConfig.MainProject
    ) {
      return { needSync: githubSyncVersion }
    }

    if (info.repository == null) {
      return { needSync: githubSyncVersion }
    }

    const pullRequestExternal = info.external as unknown as PullRequestExternalData

    if (info.externalVersion !== githubExternalSyncVersion) {
      return { needSync: '' }
    }

    let target = await this.getMilestoneIssueTarget(
      container.project,
      container.container,
      existing as Issue,
      pullRequestExternal
    )
    if (target === undefined) {
      target = this.getProjectIssueTarget(container.project, pullRequestExternal)
    }

    const syncResult = await this.syncToTarget(target, container, existing, pullRequestExternal, derivedClient, info)

    if (existing !== undefined && pullRequestExternal !== undefined && needCreateConnectedAtHuly) {
      await this.addHulyLink(info, syncResult, existing, pullRequestExternal, container)
    }
    return {
      ...syncResult,
      targetNodeId: target.target.projectNodeId
    }
  }

  async performIssueFieldsUpdate (
    info: DocSyncInfo,
    existing: WithMarkup<Issue>,
    platformUpdate: DocumentUpdate<Issue>,
    issueData: Pick<WithMarkup<Issue>, 'title' | 'description' | 'assignee' | 'status' | 'remainingTime' | 'component'>,
    container: ContainerFocus,
    issueExternal: IssueExternalData,
    okit: Octokit,
    account: PersonId
  ): Promise<boolean> {
    let { state, stateReason, body, ...issueUpdate } = await this.collectIssueUpdate(
      info,
      existing,
      platformUpdate,
      issueData,
      container,
      issueExternal,
      github.class.GithubPullRequest
    )

    if ((issueExternal as PullRequestExternalData).merged) {
      // We could not change state for merged pull requests.
      state = undefined
    }

    const hasFieldsUpdate = Object.keys(issueUpdate).length > 0 || state !== undefined
    const isLocked =
      info.isDescriptionLocked === true && !(await this.provider.isPlatformUser(account as PersonId))

    if (hasFieldsUpdate || body !== undefined) {
      if (body !== undefined && !isLocked) {
        await this.ctx.withLog(
          '==> updatePullRequest',
          {},
          async () => {
            this.ctx.info('update-pr-fields', {
              url: issueExternal.url,
              ...issueUpdate,
              body,
              workspace: this.provider.getWorkspaceId()
            })
            if (isGHWriteAllowed()) {
              await okit?.graphql(
                `
            mutation updatePullRequest($issue: ID!, $body: String!) {
              updatePullRequest(input: {
                pullRequestId: $issue,
                ${state !== undefined ? `state: ${state as string}` : ''}
                ${gqlp(issueUpdate)},
                body: $body
              }) {
                pullRequest {
                  id
                  updatedAt
                }
              }
            }`,
                { issue: issueExternal.id, body }
              )
            }
          },
          { url: issueExternal.url }
        )
        issueData.description = await this.provider.getMarkup(container.container, body, this.stripGuestLink)
      } else if (hasFieldsUpdate) {
        await this.ctx.withLog('==> updatePullRequest:', {}, async () => {
          this.ctx.info('update-fields', {
            url: issueExternal.url,
            ...issueUpdate,
            workspace: this.provider.getWorkspaceId()
          })
          if (isGHWriteAllowed()) {
            await okit?.graphql(
              `
          mutation updatePullRequest($issue: ID!) {
            updatePullRequest(input: {
              pullRequestId: $issue,
              ${state !== undefined ? `state: ${state as string}` : ''}
              ${gqlp(issueUpdate)}
            }) {
              pullRequest {
                id
                updatedAt
              }
            }
          }`,
              { issue: issueExternal.id }
            )
          }
        })
      }
      return true
    }
    return false
  }

  private async handlePatch (
    info: DocSyncInfo,
    container: ContainerFocus,
    pullRequestExternal: PullRequestExternalData,
    existingPR: Pick<GithubPullRequest, '_id' | 'space' | '_class'>,
    lastModified: number,
    account: PersonId
  ): Promise<void> {
    const repo = await this.provider.getRepositoryById(info.repository)
    if (repo?.nodeId === undefined) {
      return
    }
    if (info.external?.patch !== true) {
      const { patch, contentType } = await this.fetchPatch(pullRequestExternal, container.container.octokit, repo)

      // Update attached patch data.
      const patchAttachment = await this.client.findOne(github.class.GithubPatch, { attachedTo: existingPR._id })
      const blob = await this.provider.uploadFile(patch, patchAttachment?.file, contentType)
      if (blob !== undefined) {
        if (patchAttachment === undefined) {
          await this.client.addCollection(
            github.class.GithubPatch,
            existingPR.space,
            existingPR._id,
            existingPR._class,
            'attachments',
            {
              name: 'Patch.diff',
              file: blob._id,
              type: blob.contentType,
              size: blob.size,
              lastModified,
              readonly: true
            },
            generateId(),
            lastModified,
            account
          )
        } else {
          await this.client.diffUpdate(
            patchAttachment,
            {
              size: blob.size,
              type: blob.contentType,
              lastModified
            },
            new Date().getTime(),
            account
          )
        }
      }
    }
  }

  private async createPullRequest (
    client: TxOperations,
    info: DocSyncInfo,
    account: PersonId,
    pullRequestData: GithubPullRequestData & { status: Issue['status'] },
    pullRequestExternal: PullRequestExternalData,
    repo: Ref<GithubIntegrationRepository>,
    prj: GithubProject,
    taskType: Ref<TaskType>,
    repository: GithubIntegrationRepository,
    isDescriptionLocked: boolean
  ): Promise<GithubPullRequest> {
    const lastOne = await client.findOne<Issue>(
      tracker.class.Issue,
      { space: prj._id },
      { sort: { rank: SortingOrder.Descending }, limit: 1 }
    )
    const incResult = await this.client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      info.space as Ref<Project>,
      { $inc: { sequence: 1 } },
      true,
      new Date().getTime(),
      account
    )

    const prId = info._id as unknown as Ref<GithubPullRequest>

    const { description, ...data } = pullRequestData
    const project = (incResult as any).object as Project
    const number = project.sequence
    const value: AttachedData<GithubPullRequest> = {
      ...data,
      description: null,
      kind: taskType,
      component: null,
      milestone: null,
      number,
      identifier: `${project.identifier}-${number}`,
      priority: IssuePriority.Medium,
      rank: calcRank(lastOne, undefined),
      comments: 0,
      subIssues: 0,
      dueDate: null,
      parents: [],
      reportedTime: 0,
      estimation: 0,
      remainingTime: 0,
      reports: 0,
      relations: [],
      childInfo: [],
      commits: 0,
      reviewComments: 0,
      reviews: 0
    }

    const collabId = makeCollabId(github.class.GithubPullRequest, prId, 'description')
    await this.collaborator.updateMarkup(collabId, description)

    await client.addCollection(
      github.class.GithubPullRequest,
      info.space,
      tracker.ids.NoParent,
      tracker.class.Issue,
      'subIssues',
      value,
      prId,
      new Date(pullRequestExternal.createdAt).getTime(),
      account
    )
    await client.createMixin<Issue, GithubIssue>(
      prId,
      github.class.GithubPullRequest,
      info.space,
      github.mixin.GithubIssue,
      {
        githubNumber: pullRequestExternal.number,
        url: pullRequestExternal.url,
        repository: repo,
        descriptionLocked: isDescriptionLocked
      }
    )
    await client.createMixin<Issue, Issue>(prId, github.mixin.GithubIssue, prj._id, prj.mixinClass, {})

    await this.addConnectToMessage(
      github.string.PullRequestConnectedActivityInfo,
      prj._id,
      prId,
      tracker.class.Issue,
      pullRequestExternal,
      repository
    )

    return {
      ...value,
      _id: prId,
      _class: github.class.GithubPullRequest,
      space: info.space as any,
      attachedTo: tracker.ids.NoParent,
      attachedToClass: tracker.class.Issue,
      collection: 'subIssues',
      modifiedOn: new Date(pullRequestExternal.createdAt).getTime(),
      modifiedBy: account,
      createdOn: new Date(pullRequestExternal.createdAt).getTime(),
      createdBy: account
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
      // Bulk update of selected PR's
      // Wait global project sync
      await this.performExternalSync(integration, prj, syncDocs, repo, derivedClient)
    }

    if (kind === 'derivedVersion') {
      // Perform external synchronization's
      // TODO: Add re-request for missing reviews/review threads.
      await this.performDerivedSync(syncDocs, derivedClient, prj, repo)
    }
  }

  private async performDerivedSync (
    syncDocs: DocSyncInfo[],
    derivedClient: TxOperations,
    prj: GithubProject,
    repo: GithubIntegrationRepository
  ): Promise<void> {
    for (const d of syncDocs) {
      const ext = d.external as PullRequestExternalData
      if (ext == null) {
        continue
      }
      if (ext.reviews.nodes.length < ext.reviews.totalCount) {
        // TODO: We need to fetch missing items.
      }

      if (ext.reviewThreads.nodes.length < ext.reviewThreads.totalCount) {
        // TODO: We need to fetch missing items.
      }

      await syncDerivedDocuments(
        derivedClient,
        d,
        ext,
        prj,
        repo,
        github.class.GithubReview,
        {},
        (ext) => ext.reviews.nodes
      )
      await syncDerivedDocuments(derivedClient, d, ext, prj, repo, github.class.GithubReviewThread, {}, (ext) =>
        ext.reviewThreads.nodes.map((it) => ({
          ...it,
          url: it.id,
          createdAt: new Date(it.comments.nodes[0].createdAt ?? Date.now()).toISOString(),
          updatedAt: new Date(getUpdatedAtReviewThread(it)).toISOString()
        }))
      )
    }

    const tx = derivedClient.apply()
    for (const d of syncDocs) {
      await tx.update(d, { derivedVersion: githubDerivedSyncVersion })
    }
    await tx.commit()
    this.provider.sync()
  }

  private async performExternalSync (
    integration: IntegrationContainer,
    prj: GithubProject,
    syncDocs: DocSyncInfo[],
    repo: GithubIntegrationRepository,
    derivedClient: TxOperations
  ): Promise<void> {
    await integration.syncLock.get(prj._id)

    const allSyncDocs = [...syncDocs]

    let partsize = 50
    try {
      while (true) {
        const docsPart = allSyncDocs.splice(0, partsize)
        const idsPart = docsPart.map((it) => (it.external as IssueExternalData).id).filter((it) => it !== undefined)
        if (idsPart.length === 0) {
          break
        }
        const idsp = idsPart.map((it) => `"${it}"`).join(', ')
        try {
          const response: any = await this.ctx.withLog(
            'fetch pull request updates',
            {},
            async () =>
              await integration.octokit.graphql(
                `query listIssues {
                    nodes(ids: [${idsp}] ) {
                      ... on PullRequest {
                        ${pullRequestDetails}
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
          const issues: PullRequestExternalData[] = response.nodes

          if (issues.some((issue) => issue.url === undefined && Object.keys(issue).length === 0)) {
            this.ctx.error('empty document content updates', {
              repo: repo.name,
              workspace: this.provider.getWorkspaceId(),
              data: cutObjectArray(response)
            })
          }
          await this.syncIssues(github.class.GithubPullRequest, repo, issues, derivedClient, docsPart)
        } catch (err: any) {
          if (partsize > 1) {
            partsize = 1
            allSyncDocs.push(...docsPart)
            this.ctx.warn('pull request external retrieval switch to one by one mode', {
              errors: err.errors,
              msg: err.message,
              workspace: this.provider.getWorkspaceId()
            })
          } else if (partsize === 1) {
            // We need to update issue, since it is missing on external side.
            const syncDoc = syncDocs.find((it) => it.external.id === idsPart[0])
            if (syncDoc !== undefined) {
              this.ctx.warn('mark missing external PR', {
                errors: err.errors,
                msg: err.message,
                url: syncDoc.url,
                workspace: this.provider.getWorkspaceId()
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
    } catch (err: any) {
      this.ctx.error('Error', { err })
      Analytics.handleError(err)
    }
    this.provider.sync()
  }

  repositoryDisabled (integration: IntegrationContainer, repo: GithubIntegrationRepository): void {
    integration.synchronized.delete(`${repo._id}:pullRequests`)
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

      const syncKey = `${repo._id}:pullRequests`
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
      const since = await getSinceRaw(this.client, github.class.GithubPullRequest, repo)

      // We need always sync open PRs, since review changes are not included into PR updated state.
      this.ctx.info('sync external pull requests', {
        repo: repo.name,
        since,
        workspace: this.provider.getWorkspaceId(),
        state: 'OPEN'
      })
      await this.performPRSync(integration, repo, 'OPEN', undefined, derivedClient, prj)

      this.ctx.info('sync external pull requests', {
        repo: repo.name,
        since,
        workspace: this.provider.getWorkspaceId(),
        state: 'CLOSED, MERGED'
      })
      await this.performPRSync(integration, repo, 'CLOSED, MERGED', since, derivedClient, prj)

      this.ctx.info('sync external pull requests - done', {
        repo: repo.name,
        since,
        workspace: this.provider.getWorkspaceId()
      })

      this.provider.sync()
      integration.synchronized.add(syncKey)
    }
  }

  private async performPRSync (
    integration: IntegrationContainer,
    repo: GithubIntegrationRepository,
    states: string,
    since: number | undefined,
    derivedClient: TxOperations,
    prj: GithubProject
  ): Promise<void> {
    try {
      const pullRequestIterator = integration.octokit.graphql.paginate.iterator(
        `query listPullRequests($name: String!, $owner: String!, $cursor: String) {
            repository(name: $name, owner: $owner) {
              pullRequests(
                first: 25,
                orderBy: {field: UPDATED_AT, direction: DESC},
                states: [${states}],
                after: $cursor) {
                nodes {
                 ${pullRequestDetails}
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
          owner: repo.owner?.login ?? ''
        }
      )
      for await (const data of pullRequestIterator) {
        if (this.provider.isClosing()) {
          break
        }
        const issues: PullRequestExternalData[] = data.repository.pullRequests.nodes
        this.ctx.info('retrieve pull requests for', {
          repo: repo.name,
          since,
          len: issues.length,
          workspace: this.provider.getWorkspaceId()
        })

        if (since !== undefined) {
          // Check if since > all updated data, then break and store since.
          const hasUpdated = issues.some((it) => new Date(it.updatedAt).getTime() > since)
          if (!hasUpdated) {
            // We updated all since documents already
            break
          }
        }

        let emptyIndex = -1
        emptyIndex = issues.findIndex((issue) => issue.url === undefined && Object.keys(issue).length === 0)
        if (emptyIndex !== -1) {
          this.ctx.error('empty document content', {
            repo: repo.name,
            workspace: this.provider.getWorkspaceId(),
            data: cutObjectArray(data),
            emptyIndex,
            el: JSON.stringify(issues[emptyIndex])
          })
        }

        await this.syncIssues(github.class.GithubPullRequest, repo, issues, derivedClient)
      }
    } catch (err: any) {
      this.ctx.error('Error', { err })
      Analytics.handleError(err)
    }
  }

  async fetchPatch (
    pullRequest: PullRequestExternalData,
    octokit: Octokit,
    repository: GithubIntegrationRepository
  ): Promise<{ patch: string, contentType: string }> {
    let patch = ''
    let contentType = 'application/vnd.github.VERSION.diff'
    try {
      const patchContent = await octokit.rest.pulls.get({
        owner: repository.owner?.login as string,
        repo: repository.name,
        pull_number: pullRequest.number,
        headers: {
          Accept: 'application/vnd.github.VERSION.diff',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      patch = (patchContent.data as unknown as string) ?? ''
      contentType = patchContent.headers['content-type'] ?? 'application/vnd.github.VERSION.diff'
    } catch (err: any) {
      this.ctx.error('Error', { err })
      Analytics.handleError(err)
    }
    return { patch, contentType }
  }

  async deleteGithubDocument (container: ContainerFocus, account: PersonId, id: string): Promise<void> {
    // No delete is allowed for pull requests
  }
}
