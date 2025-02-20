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
  Status,
  TxOperations,
  makeDocCollabId
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubFieldMapping,
  GithubIntegrationRepository,
  GithubIssue,
  GithubIssue as GithubIssueP,
  GithubMilestone,
  GithubProject
} from '@hcengineering/github'
import { IntlString } from '@hcengineering/platform'
import { LiveQuery } from '@hcengineering/query'
import { getPublicLink } from '@hcengineering/server-guest-resources'
import task, { TaskType, type Task } from '@hcengineering/task'
import { MarkupNode, MarkupNodeType, areEqualMarkups, markupToJSON, traverseNode } from '@hcengineering/text'
import time, { type ToDo } from '@hcengineering/time'
import tracker, { Issue, IssuePriority } from '@hcengineering/tracker'
import { ProjectsV2ItemEvent } from '@octokit/webhooks-types'
import { deepEqual } from 'fast-equals'
import { Octokit } from 'octokit'
import {
  ContainerFocus,
  IntegrationContainer,
  IntegrationManager,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import {
  GithubDataType,
  GithubProjectV2FieldOption,
  GithubProjectV2Item,
  GithubProjectV2ItemFieldValue,
  IssueExternalData,
  fieldValues,
  projectValue,
  supportedGithubTypes
} from './githubTypes'
import { stripGuestLink } from './guest'
import { syncConfig } from './syncConfig'
import {
  collectUpdate,
  compareMarkdown,
  deleteObjects,
  errorToObj,
  getCreateStatus,
  getType,
  isGHWriteAllowed
} from './utils'

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

/**
 * @public
 */
export interface IssueSyncTarget {
  project: GithubProject
  mappings: GithubFieldMapping[]
  target: GithubProject | GithubMilestone
  prjData?: GithubProjectV2Item
}

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

  async processProjectV2Event (
    integration: IntegrationContainer,
    event: ProjectsV2ItemEvent,
    derivedClient: TxOperations,
    prj: GithubProject
  ): Promise<void> {
    const account = (await this.provider.getAccountU(event.sender))?._id ?? core.account.System
    switch (event.action) {
      case 'edited': {
        const itemId = event.projects_v2_item.node_id
        const projectId = event.projects_v2_item.project_node_id

        try {
          const actualContent: {
            node: {
              id: string
              content: {
                id: string
                url: string
                number: number
              }
              fieldValues: {
                nodes: GithubProjectV2ItemFieldValue[]
              }
            }
          } = (await integration.octokit?.graphql(
            `query listIssue($nodeId: ID!) {
                          node(id: $nodeId) {
                            ... on ProjectV2Item {
                              id
                              content {
                                ... on Issue {
                                  id
                                  number
                                  url
                                }
                                ... on PullRequest {
                                  id
                                  number
                                  url
                                }
                              }
                              ${fieldValues}
                            }
                          }
                        }`,
            {
              nodeId: itemId
            }
          )) as any
          const syncData = await this.client.findOne(github.class.DocSyncInfo, {
            space: prj._id,
            url: (actualContent.node.content.url ?? '').toLowerCase()
          })

          if (syncData !== undefined) {
            const milestone = await this.client.findOne<GithubMilestone>(github.mixin.GithubMilestone, {
              projectNodeId: projectId
            })

            const target: IssueSyncTarget | undefined =
              milestone !== undefined
                ? {
                    mappings: milestone.mappings ?? [],
                    project: prj,
                    target: milestone
                  }
                : prj.projectNodeId === projectId
                  ? this.getProjectIssueTarget(prj)
                  : undefined

            if (target === undefined) {
              // Not our project, we should just update external
              return
            }

            this.ctx.info('event for issue', { url: syncData.url, workspace: this.provider.getWorkspaceId().name })
            const externalData = syncData.external as IssueExternalData
            // We need to replace field values we retrieved
            target.prjData = externalData.projectItems.nodes.find(
              (it) => it.project.id === event.projects_v2_item.project_node_id
            )

            if (target.prjData === undefined) {
              target.prjData = {
                fieldValues: actualContent.node.fieldValues,
                id: event.projects_v2_item.node_id,
                type: 'ISSUE',
                project: {
                  id: prj.projectNodeId as string,
                  number: prj.projectNumber as number
                }
              }
              externalData.projectItems.nodes.push(target.prjData)
            } else {
              target.prjData.fieldValues = actualContent.node.fieldValues
            }
            // Store github values
            await derivedClient.update(syncData, {
              external: externalData,
              externalVersion: githubExternalSyncVersion
            })

            if (event.changes.field_value === undefined) {
              this.ctx.info('No changes for change event', { event, workspace: this.provider.getWorkspaceId().name })
              return
            }

            let needProjectRefresh = false
            const update: DocumentUpdate<WithMarkup<Issue>> & Record<string, any> = {}

            let structure = integration.projectStructure.get(target.target._id)

            for (const f of target.prjData.fieldValues?.nodes ?? []) {
              if (!('id' in f)) {
                continue
              }
              // Check if we need to update project structure
              if (structure !== undefined) {
                const ff = structure.projectV2.fields.edges.find((it) => it.node.id === f.field.id)
                if (ff === undefined && supportedGithubTypes.has(f.field.dataType)) {
                  // We have missing field.
                  needProjectRefresh = true
                }
              }
              if (needProjectRefresh && syncData.repository != null) {
                const repo = await this.provider.liveQuery.findOne<GithubIntegrationRepository>(
                  github.class.GithubIntegrationRepository,
                  {
                    _id: syncData.repository
                  }
                )

                if (repo !== undefined) {
                  await this.provider.handleEvent(github.class.GithubIntegration, integration.installationId, repo, {})
                  structure = integration.projectStructure.get(prj._id)
                }
              }

              const taskTypes = (
                await this.provider.liveQuery.queryFind(task.class.TaskType, { parent: prj.type })
              ).filter((it) => this.client.getHierarchy().isDerived(it.targetClass, syncData.objectClass))

              // TODO: Use GithubProject configuration to specify target type for issues
              if (taskTypes.length === 0) {
                // Missing required task type
                this.ctx.error('Missing required task type, in Event.')
              }

              if (event.changes.field_value.field_node_id === f.field.id && taskTypes.length > 0) {
                const ff = await this.toPlatformField(
                  {
                    container: integration,
                    project: prj
                  },
                  f,
                  target,
                  taskTypes[0]
                )
                if (ff === undefined) {
                  continue
                }
                const { value, mapping } = ff
                if (value !== undefined) {
                  update[mapping.name] = value
                }
                continue
              }
            }
            if (Object.keys(update).length > 0) {
              await this.handleUpdate(externalData, derivedClient, update, account, prj, false, syncData)
            }
          }
        } catch (err: any) {
          Analytics.handleError(err)
          this.ctx.error(err, event)
        }

        break
      }
    }
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
        await this.client.diffUpdate(
          this.client.getHierarchy().as(doc, prj.mixinClass),
          issueData,
          lastModified,
          account
        )
        this.provider.sync()
      }
    }
    if (needSync) {
      this.provider.sync()
    }
  }

  async addIssueToProject (
    container: ContainerFocus,
    okit: Octokit,
    issue: IssueExternalData,
    projectTarget: string
  ): Promise<GithubProjectV2Item | undefined> {
    const query = `mutation addIssueToProject($project: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $project, contentId: $contentId}) {
        item {
          ${projectValue}
          id
          type
          ${fieldValues}
        }
      }
    }`
    if (isGHWriteAllowed()) {
      const response: any = await okit.graphql(query, { project: projectTarget, contentId: issue.id })
      return response.addProjectV2ItemById.item
    }
  }

  async removeIssueFromProject (okit: Octokit, projectTarget: string, issueId: string): Promise<void> {
    try {
      const query = `mutation removeIssueToProject($project: ID!, $contentId: ID!) {
      deleteProjectV2Item(input: {projectId: $project, itemId: $contentId}) {
        deletedItemId
      }
    }`
      if (isGHWriteAllowed()) {
        await okit.graphql(query, { project: projectTarget, contentId: issueId })
      }
    } catch (err: any) {
      Analytics.handleError(err)
      this.ctx.error(err)
    }
  }

  findOption (
    container: ContainerFocus,
    field: GithubProjectV2ItemFieldValue,
    target: GithubProject | GithubMilestone
  ): GithubProjectV2FieldOption | undefined {
    const structure = container.container.projectStructure.get(target._id)
    if (structure === undefined) {
      return {
        id: field.field.id,
        name: field.field.name,
        color: field.color ?? '',
        description: field.description ?? ''
      }
    }
    const pField = structure.projectV2.fields.edges.find((it) => it.node.id === field.field.id)
    if (pField === undefined) {
      return {
        id: field.field.id,
        name: field.field.name,
        color: field.color ?? '',
        description: field.description ?? ''
      }
    }
    return (pField.node.options ?? []).find((it) => it.id === field.optionId)
  }

  findOptionId (
    container: ContainerFocus,
    fieldId: string,
    value: string | null,
    target: IssueSyncTarget
  ): string | undefined {
    if (value == null) {
      return
    }
    const structure = container.container.projectStructure.get(target.target._id)
    if (structure === undefined) {
      return
    }
    const pField = structure.projectV2.fields.edges.find((it) => it.node.id === fieldId)
    if (pField === undefined) {
      return undefined
    }
    return (pField.node.options ?? []).find((it) => it.name?.toLowerCase() === value.toLowerCase())?.id
  }

  async toPlatformField (
    container: ContainerFocus,
    // eslint-disable-next-line @typescript-eslint/ban-types
    field: GithubProjectV2ItemFieldValue | {},
    target: IssueSyncTarget,
    taskType: TaskType
  ): Promise<{ value: any, mapping: GithubFieldMapping } | undefined> {
    if (!('field' in field)) {
      return
    }
    const mapping = target.mappings.find((it) => it.githubId === field.field.id)
    if (mapping === undefined) {
      return undefined
    }

    if (mapping.name === 'status') {
      const option = this.findOption(container, field, target.target)
      if (option === undefined) {
        return
      }
      return {
        value: await getCreateStatus(
          this.ctx,
          this.provider,
          this.client,
          container.project,
          option?.name,
          option.description,
          option.color,
          taskType
        ),
        mapping
      }
    }

    if (mapping.name === 'priority') {
      const values: Record<string, IssuePriority> = {
        '': IssuePriority.NoPriority,
        High: IssuePriority.High,
        Medium: IssuePriority.Medium,
        Low: IssuePriority.Low,
        Urgent: IssuePriority.Urgent
      }
      const option = this.findOption(container, field, target.target)
      return { value: values[option?.name ?? ''] ?? IssuePriority.NoPriority, mapping }
    }

    switch (field.field.dataType) {
      case 'DATE':
        return { value: field.date !== undefined ? new Date(field.date).getTime() : null, mapping }
      case 'NUMBER':
        return { value: field.number, mapping }
      case 'TEXT':
        return { value: field.text, mapping }
      case 'SINGLE_SELECT': {
        const option = this.findOption(container, field, target.target)
        return { value: option?.name, mapping }
      }
    }
  }

  async fillProjectV2Fields (
    target: IssueSyncTarget,
    container: ContainerFocus,
    issueData: Record<string, any>,
    taskType: TaskType
  ): Promise<void> {
    for (const f of target.prjData?.fieldValues?.nodes ?? []) {
      const ff = await this.toPlatformField(container, f, target, taskType)
      if (ff === undefined) {
        continue
      }
      const { value, mapping } = ff
      if (value !== undefined) {
        ;(issueData as any)[mapping.name] = value
      }
    }
  }

  async updateIssueValues (
    target: IssueSyncTarget,
    okit: Octokit,
    values: { id: string, value: any, dataType: GithubDataType }[]
  ): Promise<{ error: any, response: any }[]> {
    function getValue (val: { id: string, value: any, dataType: GithubDataType }): string {
      switch (val.dataType) {
        case 'SINGLE_SELECT':
          return `singleSelectOptionId: "${val.value as string}"`
        case 'DATE':
          return `date: "${new Date(val.value).toISOString()}"`
        case 'NUMBER':
          return `number: ${val.value as number}`
        case 'TEXT':
          return `text: "${val.value as string}"`
      }
    }
    const errors: any[] = []
    const itm = ` {
      projectV2Item {
        id
        type
        ${projectValue}
       ${fieldValues}
     }
    }\n`
    let response: any = {}
    if (isGHWriteAllowed()) {
      for (const val of values) {
        const q = `
      mutation updateField($project: ID!, $itemId: ID!) {
        updateProjectV2ItemFieldValue(
          input: {projectId: $project, itemId: $itemId, fieldId: "${val.id}", value: {${getValue(val)}}}
        )
        ${itm}
      }`
        try {
          response = await okit.graphql(q, {
            project: target.target.projectNodeId,
            itemId: target.prjData?.id as string
          })
        } catch (err: any) {
          if (err.errors?.[0]?.type === 'NOT_FOUND') {
            errors.push({ error: err, response })
            return errors
          }
          Analytics.handleError(err)
          // Failed to update one particular value, skip it.
          this.ctx.error('error during field update', {
            error: err,
            response,
            workspace: this.provider.getWorkspaceId().name
          })
          errors.push({ error: err, response })
        }
      }
    }
    return errors
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
    target: IssueSyncTarget,
    existing: WithMarkup<Issue>,
    info: DocSyncInfo,
    issueData: GithubIssueData,
    container: ContainerFocus,
    issueExternal: IssueExternalData,
    account: Ref<Account>,
    accountGH: Ref<Account>,
    syncToProject: boolean
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
    if (!this.client.getHierarchy().hasMixin(existing, container.project.mixinClass)) {
      await this.ctx.withLog(
        'create mixin issue',
        {},
        () =>
          this.client.createMixin<Issue, Issue>(
            existing._id as Ref<GithubIssueP>,
            existing._class,
            existing.space,
            container.project.mixinClass,
            {}
          ),
        { identifier: existing.identifier, url: issueExternal.url }
      )
      // Re iterate to have existing value with mixin inside.
      needUpdate = true
    }
    if (needUpdate) {
      return { needSync: '' }
    }

    const existingIssue = this.client.getHierarchy().as(existing, container.project.mixinClass)
    const previousData: GithubIssueData = info.current ?? ({} as unknown as GithubIssueData)
    const type = await this.provider.getTaskTypeOf(container.project.type, existing._class)
    const stst = await this.provider.getStatuses(type?._id)

    const update = collectUpdate<Issue>(previousData, issueData, Object.keys(issueData))

    const allAttributes = this.client.getHierarchy().getAllAttributes(container.project.mixinClass)
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
        pv = await this.provider.getMarkup(container.container, mdown, this.stripGuestLink)
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

      const fieldsUpdate: { id: string, value: any, dataType: GithubDataType }[] = []

      // Collect field update.
      for (const [k, v] of Object.entries(platformUpdate)) {
        const mapping = target.mappings.filter((it) => it != null).find((it) => it.name === k)
        if (mapping === undefined) {
          continue
        }
        const attr = this.client.getHierarchy().getAttribute(mapping._class, mapping.name)

        if (attr.name === 'status') {
          // Handle status field
          const status = stst.find((it) => it._id === v) as Status
          const optionId = this.findOptionId(container, mapping.githubId, status.name, target)
          if (optionId !== undefined) {
            fieldsUpdate.push({
              id: mapping.githubId,
              dataType: 'SINGLE_SELECT',
              value: optionId
            })
            this.ctx.info('   => prepare issue status update', {
              url: issueExternal.url,
              name: status.name,
              workspace: this.provider.getWorkspaceId().name
            })
            continue
          }
        }
        if (attr.name === 'priority') {
          const values: Record<IssuePriority, string> = {
            [IssuePriority.NoPriority]: '',
            [IssuePriority.High]: 'High',
            [IssuePriority.Medium]: 'Medium',
            [IssuePriority.Low]: 'Low',
            [IssuePriority.Urgent]: 'Urgent'
          }
          // Handle priority field TODO: Add clear of field
          const priorityName = values[v as IssuePriority]
          const optionId = this.findOptionId(container, mapping.githubId, priorityName, target)
          if (optionId !== undefined) {
            fieldsUpdate.push({
              id: mapping.githubId,
              dataType: 'SINGLE_SELECT',
              value: optionId
            })
            this.ctx.info('   => prepare issue priority update', {
              url: issueExternal.url,
              priority: priorityName,
              workspace: this.provider.getWorkspaceId().name
            })
            continue
          }
        }

        const dataType = getType(attr)
        if (dataType === 'SINGLE_SELECT') {
          // Handle status field
          const optionId = this.findOptionId(container, mapping.githubId, v, target)
          if (optionId !== undefined) {
            fieldsUpdate.push({
              id: mapping.githubId,
              dataType: 'SINGLE_SELECT',
              value: optionId
            })
            this.ctx.info(`   => prepare issue field ${attr.label} update`, {
              url: issueExternal.url,
              value: v,
              workspace: this.provider.getWorkspaceId().name
            })
            continue
          }
        }

        if (dataType === undefined) {
          continue
        }
        fieldsUpdate.push({
          id: mapping.githubId,
          dataType,
          value: v
        })
        this.ctx.info(`=> prepare issue field ${attr.label} update`, {
          url: issueExternal.url,
          value: v,
          workspace: this.provider.getWorkspaceId().name
        })
      }
      if (fieldsUpdate.length > 0 && syncToProject && target.prjData !== undefined) {
        const errors = await this.updateIssueValues(target, okit, fieldsUpdate)
        if (errors.length === 0) {
          needExternalSync = true
        }
      }
      // TODO: Add support for labels, milestone, assignees
    }

    // We need remove all readonly field values
    for (const k of Object.keys(update)) {
      // Skip readonly fields
      const attr = this.client.getHierarchy().findAttribute(target.project.mixinClass, k)
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
      issueData.description = await this.provider.getMarkup(
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
        repository: repo._id,
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
          const externalEqual = deepEqual(existing.external, issue)
          if (!externalEqual || existing.externalVersion !== githubExternalSyncVersion) {
            this.ctx.info('Update sync doc', { url: issue.url, workspace: this.provider.getWorkspaceId().name })
            await ops.diffUpdate(
              existing,
              {
                needSync: externalEqual ? existing.needSync : '',
                external: issue,
                externalVersion: githubExternalSyncVersion,
                derivedVersion: '', // Clear derived state to recalculate it.
                externalVersionSince: '',
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

  async getMilestoneIssueTarget (
    project: GithubProject,
    container: IntegrationContainer,
    existingIssue: Issue | undefined,
    external: IssueExternalData
  ): Promise<IssueSyncTarget | undefined> {
    if (existingIssue !== undefined) {
      // Select a milestone project
      if (existingIssue.milestone != null) {
        const milestone = await this.provider.liveQuery.findOne<GithubMilestone>(github.mixin.GithubMilestone, {
          _id: existingIssue.milestone as Ref<GithubMilestone>
        })
        if (milestone === undefined) {
          return
        }
        return {
          project,
          mappings: milestone.mappings ?? [],
          target: milestone,
          prjData: external.projectItems.nodes.find((it) => it.project.id === milestone.projectNodeId)
        }
      }
    }
  }

  getProjectIssueTarget (project: GithubProject, external?: IssueExternalData): IssueSyncTarget {
    return {
      project,
      mappings: project.mappings ?? [],
      target: project,
      prjData: external?.projectItems.nodes.find((it) => it.project.id === project.projectNodeId)
    }
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
    if (
      container?.container === undefined ||
      ((container.project.projectNodeId === undefined ||
        !container.container.projectStructure.has(container.project._id)) &&
        syncConfig.MainProject)
    ) {
      return false
    }

    const issueExternal = info.external as IssueExternalData | undefined

    if (issueExternal === undefined) {
      // No external issue yet, safe delete, since platform document will be deleted a well.
      return true
    }
    const account =
      existing?.createdBy ?? (await this.provider.getAccount(issueExternal.author))?._id ?? core.account.System
    const okit = (await this.provider.getOctokit(account as Ref<PersonAccount>)) ?? container.container.octokit

    if (existing !== undefined && issueExternal !== undefined) {
      let target = await this.getMilestoneIssueTarget(
        container.project,
        container.container,
        existing as Issue,
        issueExternal
      )
      if (target === null) {
        // We need to wait, no milestone data yet.
        return false
      }
      if (target === undefined) {
        target = this.getProjectIssueTarget(container.project, issueExternal)
      }
      const isProjectProjectTarget = target.target.projectNodeId === target.project.projectNodeId
      const supportProjects =
        (isProjectProjectTarget && syncConfig.MainProject) || (!isProjectProjectTarget && syncConfig.SupportMilestones)

      // A target node id
      const targetNodeId: string | undefined = info.targetNodeId as string

      if (targetNodeId !== undefined && supportProjects) {
        const itemNode = issueExternal.projectItems.nodes.find((it) => it.project.id === targetNodeId)
        if (itemNode !== undefined) {
          await this.removeIssueFromProject(okit, targetNodeId, itemNode.id)
        }
        // Clear external project items
        info.external.projectItems = []
      }
    }

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
