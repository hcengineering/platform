import { Analytics } from '@hcengineering/analytics'
import { PersonAccount } from '@hcengineering/contact'
import core, {
  AnyAttribute,
  Class,
  Data,
  Doc,
  DocumentUpdate,
  EnumOf,
  MeasureContext,
  Ref,
  TxOperations,
  generateId
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubFieldMapping,
  GithubIntegrationRepository,
  GithubMilestone,
  GithubProject,
  GithubProjectSyncData
} from '@hcengineering/github'
import { getEmbeddedLabel, translate } from '@hcengineering/platform'
import { LiveQuery } from '@hcengineering/query'
import task from '@hcengineering/task'
import tracker, { Milestone } from '@hcengineering/tracker'
import { RepositoryEvent } from '@octokit/webhooks-types'
import { deepEqual } from 'fast-equals'
import { Octokit } from 'octokit'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  IntegrationContainer,
  IntegrationManager,
  githubExternalSyncVersion,
  githubSyncVersion
} from '../types'
import {
  GithubDataType,
  GithubProjectV2,
  GithubProjectV2Field,
  GithubProjectV2ItemFieldValue,
  IssueExternalData,
  projectV2Field,
  projectV2ItemFields,
  supportedGithubTypes
} from './githubTypes'
import { syncConfig } from './syncConfig'
import {
  collectUpdate,
  errorToObj,
  getPlatformType,
  getType,
  gqlp,
  hashCode,
  isGHWriteAllowed,
  syncRunner
} from './utils'

const githubColors = ['GRAY', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'RED', 'PINK', 'PURPLE']

const categoryColors = {
  [task.statusCategory.UnStarted]: githubColors[0],
  [task.statusCategory.ToDo]: githubColors[3],
  [task.statusCategory.Active]: githubColors[1],
  [task.statusCategory.Won]: githubColors[2],
  [task.statusCategory.Lost]: githubColors[7]
}

interface GithubMilestoneExternalData {
  url: string
  projectNumber: number
  projectId: string
  label: string
  description: string
  updatedAt: string
}

interface MilestoneData {
  label: string
  description: string
}

export class ProjectsSyncManager implements DocSyncManager {
  provider!: IntegrationManager

  externalDerivedSync = false

  constructor (
    readonly ctx: MeasureContext,
    readonly client: TxOperations,
    readonly lq: LiveQuery
  ) {}

  async init (provider: IntegrationManager): Promise<void> {
    this.provider = provider
  }

  async sync (
    existing: Doc | undefined,
    info: DocSyncInfo,
    parent?: DocSyncInfo
  ): Promise<DocumentUpdate<DocSyncInfo> | undefined> {
    const container = await this.provider.getContainer(info.space)
    if (container?.container === undefined) {
      return { needSync: githubSyncVersion }
    }

    const okit = await this.provider.getOctokit(container.project.createdBy as Ref<PersonAccount>)
    if (okit === undefined) {
      this.ctx.info('No Authentication for author, waiting for authentication.', {
        workspace: this.provider.getWorkspaceId().name
      })
      return { needSync: githubSyncVersion, error: 'Need authentication for user' }
    }

    let checkStructure = false

    if (
      existing !== undefined &&
      this.client.getHierarchy().isDerived(existing._class, tracker.class.Milestone) &&
      container.container.type === 'Organization'
    ) {
      // If no external project for milestone exists, let's create it.
      const milestone = existing as Milestone
      if (info.external === undefined) {
        checkStructure = true
        try {
          await this.ctx.withLog(
            'Create Milestone projectV2',
            {},
            () => this.createMilestone(container.container, container.project, okit, milestone, info),
            { label: milestone.label }
          )
        } catch (err: any) {
          this.ctx.error('failed create milestone', err)
          return { needSync: githubSyncVersion, error: errorToObj(err) }
        }
      }

      if (checkStructure) {
        const m = (await this.client.findOne(github.mixin.GithubMilestone, {
          _id: milestone._id as Ref<GithubMilestone>
        })) as GithubMilestone

        let { projectStructure, wasUpdates } = await this.ctx.withLog(
          'update project structure',
          {},
          () =>
            syncRunner.exec(m._id, () =>
              this.updateFieldMappings(container.container, container.project, m, container.project.mixinClass, okit)
            ),
          { label: milestone.label }
        )

        // Retrieve updated field
        if (wasUpdates) {
          projectStructure = (await this.ctx.withLog(
            'update project structure(sync/second step)',
            {},
            () => this.queryProjectStructure(container.container, m),
            {
              label: m.label
            }
          )) as GithubProjectV2
        }
        container.container.projectStructure.set(m._id, projectStructure)
      }
      const milestoneExternal = info.external as GithubMilestoneExternalData

      const messageData: MilestoneData = {
        label: milestoneExternal.label,
        description: await this.provider.getMarkup(container.container, milestoneExternal.description)
      }

      await this.handleDiffUpdateMilestone(existing, info, messageData, container, milestoneExternal)

      return { current: messageData, needSync: githubSyncVersion }
    }

    return { needSync: githubSyncVersion }
  }

  private async createMilestone (
    integration: IntegrationContainer,
    project: GithubProject,
    okit: Octokit,
    milestone: Milestone,
    info: DocSyncInfo | undefined
  ): Promise<void> {
    if (integration.type !== 'Organization') {
      return
    }
    const response = await this.createProjectV2(integration, okit, milestone.label)

    if (response !== undefined) {
      const data: GithubMilestoneExternalData = {
        projectId: response.projectNodeId,
        projectNumber: response.projectNumber,
        url: response.url,
        label: milestone.label,
        description: '',
        updatedAt: new Date().toISOString()
      }

      if (info !== undefined) {
        info.external = data
      }

      await this.client.createMixin<Milestone, GithubMilestone>(
        milestone._id,
        milestone._class,
        milestone.space,
        github.mixin.GithubMilestone,
        {
          mappings: [],
          url: response.url,
          projectNodeId: response.projectNodeId,
          projectNumber: response.projectNumber,
          githubProjectName: milestone.label
        }
      )

      const derivedClient = new TxOperations(this.client, core.account.System, true)

      if (info !== undefined) {
        await derivedClient.update(info, {
          external: data,
          needSync: ''
        })

        // We also need to notify all issues with milestone set to this milestone.
        const milestonedIds = await this.client.findAll(
          tracker.class.Issue,
          { milestone: milestone._id },
          { projection: { _id: 1 } }
        )
        while (milestonedIds.length > 0) {
          const part = milestonedIds.splice(0, 100)
          const docInfos = await this.client.findAll(
            github.class.DocSyncInfo,
            { _id: { $in: part.map((it) => it._id as unknown as Ref<DocSyncInfo>) } },
            { projection: { _id: 1 } }
          )
          if (docInfos.length > 0) {
            const ops = derivedClient.apply()
            for (const d of docInfos) {
              await ops.update(d, { needSync: '' })
            }
            await ops.commit()
          }
        }
      }
    }
  }

  async handleDiffUpdateMilestone (
    existing: Doc,
    info: DocSyncInfo,
    issueData: MilestoneData,
    container: ContainerFocus,
    issueExternal: GithubMilestoneExternalData
  ): Promise<DocumentUpdate<DocSyncInfo>> {
    const existingMilestone = existing as Milestone
    const previousData: MilestoneData = info.current ?? ({} as unknown as MilestoneData)

    const update = collectUpdate<Milestone>(previousData, issueData, Object.keys(issueData))

    const allAttributes = this.client.getHierarchy().getAllAttributes(tracker.class.Milestone)
    const platformUpdate = collectUpdate<Milestone>(previousData, existingMilestone, Array.from(allAttributes.keys()))

    const okit =
      (await this.provider.getOctokit(existing.modifiedBy as Ref<PersonAccount>)) ?? container.container.octokit

    // Remove current same values from update
    for (const [k, v] of Object.entries(update)) {
      if ((existingMilestone as any)[k] === v) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (update as any)[k]
      }
    }

    for (const [k, v] of Object.entries(update)) {
      const pv = (platformUpdate as any)[k]
      if (pv != null && pv !== v) {
        // We have conflict of values.
        this.ctx.error('conflict', { identifier: existingMilestone._id, k, v, pv })

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (update as any)[k]
        continue
      }
    }

    if (container !== undefined && okit !== undefined) {
      if (platformUpdate.label !== undefined || platformUpdate.description !== undefined) {
        await this.updateProjectV2(okit, issueExternal.projectId, {
          title: platformUpdate.label,
          readme:
            platformUpdate.description !== undefined
              ? await this.provider.getMarkdown(platformUpdate.description)
              : undefined
        })
      }
    }

    if (Object.keys(update).length > 0) {
      // We have some fields to update of existing from external
      await this.client.update(existingMilestone, update, false, new Date(issueExternal.updatedAt).getTime())
    }

    // We need to trigger external version retrieval, via sync or event, to prevent move sync operations from platform before we will be sure all is updated on github.
    return { current: issueData, needSync: githubSyncVersion }
  }

  async handleEvent<T>(integration: IntegrationContainer, derivedClient: TxOperations, evt: T): Promise<void> {
    const event = evt as RepositoryEvent

    const { project, repository } = await this.provider.getProjectAndRepository(event.repository.node_id)

    if (project === undefined || repository === undefined) {
      this.ctx.error('Unable to find project and repository for event', {
        name: event.repository.name,
        workspace: this.provider.getWorkspaceId().name
      })
      return
    }

    if (project !== undefined) {
      const projectStructure = (await this.ctx.withLog(
        'update project structure(handleEvent)',
        { prj: project.name },
        () => this.queryProjectStructure(integration, project)
      )) as GithubProjectV2

      integration.projectStructure.set(project._id, projectStructure)
    }
  }

  async handleDelete (
    existing: Doc | undefined,
    info: DocSyncInfo,
    derivedClient: TxOperations,
    deleteExisting: boolean
  ): Promise<boolean> {
    return false
  }

  async externalSync (
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    kind: ExternalSyncField,
    syncDocs: DocSyncInfo[],
    repository: GithubIntegrationRepository,
    project: GithubProject
  ): Promise<void> {
    for (const d of syncDocs) {
      if (d.objectClass === tracker.class.Milestone) {
        // no external data for doc
        await derivedClient.update<DocSyncInfo>(d, {
          externalVersion: githubExternalSyncVersion
        })
      }
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
    for (const prj of projects) {
      if (this.provider.isClosing()) {
        break
      }
      // Wait global project sync
      await integration.syncLock.get(prj._id)

      const syncKey = `project_structure${prj._id}`
      if (
        prj === undefined ||
        integration.synchronized.has(syncKey) ||
        integration.octokit === undefined ||
        integration.integration.createdBy === undefined
      ) {
        continue
      }

      const okit = await this.provider.getOctokit(integration.integration.createdBy as Ref<PersonAccount>)
      if (okit === undefined) {
        this.ctx.info('No Authentication for author, waiting for authentication.', {
          workspace: this.provider.getWorkspaceId().name
        })
        continue
      }

      // Check if project skill exists, on github
      if (syncConfig.MainProject && integration.type === 'Organization') {
        if (prj.projectNumber === undefined) {
          try {
            await this.ctx.withLog('Create projectV2', { prj: prj.name }, async () => {
              const response = await this.createProjectV2(integration, okit, prj.name)
              if (response !== undefined) {
                prj.projectNumber = response.projectNumber
                prj.projectNodeId = response.projectNodeId

                await this.client.update(prj, response)
              }
            })
          } catch (err: any) {
            this.ctx.error('failed to create project', { prj: prj.name })
            continue
          }
        }

        try {
          let { projectStructure, wasUpdates } = await this.ctx.withLog(
            'update project structure',
            { prj: prj.name },
            () => this.updateFieldMappings(integration, prj, prj, prj.mixinClass, okit)
          )

          // Check if we have any changes in project, during our inactivity.
          await this.ctx.withLog('check project v2 changes:', { prj: prj.name }, () =>
            this.checkChanges(projectStructure, prj, prj._id, integration, derivedClient)
          )

          // Retrieve updated field
          if (wasUpdates) {
            projectStructure = (await this.ctx.withLog('update project structure(second pass)', { prj: prj.name }, () =>
              this.queryProjectStructure(integration, prj)
            )) as GithubProjectV2
          }

          integration.projectStructure.set(prj._id, projectStructure)
        } catch (err: any) {
          this.ctx.error('filed to query project structure', err)
        }
      }

      if (syncConfig.SupportMilestones && integration.type === 'Organization') {
        // Check project milestones and sync their structure as well.
        const milestones = (await this.provider.liveQuery.queryFind(github.mixin.GithubMilestone, {})).filter(
          (it) => it.space === prj._id
        )
        for (const m of milestones) {
          if (this.provider.isClosing()) {
            break
          }
          try {
            let { projectStructure, wasUpdates } = await this.ctx.withLog(
              'update project structure',
              { prj: m.label },
              () =>
                syncRunner.exec(
                  m._id,
                  async () => await this.updateFieldMappings(integration, prj, m, prj.mixinClass, okit)
                )
            )

            // Check if we have any changes in project, during our inactivity.
            await this.ctx.withLog('check project v2 changes', { prj: prj.name }, () =>
              this.checkChanges(projectStructure, m, prj._id, integration, derivedClient)
            )

            // Retrieve updated field
            if (wasUpdates) {
              projectStructure = (await this.ctx.withLog(
                'update project structure(second pass)',
                { prj: prj.name },
                () => this.queryProjectStructure(integration, m)
              )) as GithubProjectV2
            }

            integration.projectStructure.set(m._id, projectStructure)
          } catch (err: any) {
            this.ctx.error('filed to query project structure', err)
          }
        }
      }

      integration.synchronized.add(syncKey)
    }
  }

  private async checkChanges (
    projectStructure: GithubProjectV2,
    prj: GithubProject | GithubMilestone,
    space: Ref<GithubProject>,
    integration: IntegrationContainer,
    derivedClient: TxOperations
  ): Promise<void> {
    if (projectStructure.projectV2.updatedAt !== prj.githubUpdatedAt) {
      // ok, we need to synchronize all project items.
      const { query, params, root } = this.queryProject(integration, prj)
      const i = integration.octokit.graphql.paginate.iterator(query, params)

      // We need to collect a list of all uris of documents, and check if we have some missing ones.
      const checkId = generateId()
      try {
        for await (const data of i) {
          const items: {
            id: string
            type: string
            updatedAt: string
            fieldValues: {
              nodes: GithubProjectV2ItemFieldValue[]
            }
            content: {
              id: string
              url: string
            }
          }[] = data[root].projectV2.items.nodes

          const syncInfos = await this.client.findAll<DocSyncInfo>(github.class.DocSyncInfo, {
            space,
            objectClass: tracker.class.Issue,
            url: { $in: items.map((it) => (it.content.url ?? '').toLowerCase()) }
          })

          for (const item of items) {
            let needSync = false
            const itemSyncData = syncInfos.find((it) => it.url === item.content.url.toLocaleLowerCase())
            if (itemSyncData !== undefined) {
              // We had item already, let's check our project field content and request update.
              const external = itemSyncData.external as IssueExternalData
              const dataIdx = external.projectItems.nodes.findIndex((it) => it.project.id === prj.projectNodeId)
              if (dataIdx !== -1) {
                const data = external.projectItems.nodes[dataIdx]
                if (!deepEqual(data?.fieldValues.nodes, item.fieldValues.nodes)) {
                  // TODO: replace value
                  data.fieldValues = item.fieldValues
                  needSync = true
                }
              } else {
                // No project information
                needSync = true
              }
              // Mark all our existing sync documents, so we could find any missing ones.
              await derivedClient.update(
                itemSyncData,
                needSync
                  ? {
                      external: itemSyncData.external,
                      externalCheckId: checkId,
                      needSync: ''
                    }
                  : { externalCheckId: checkId }
              )
            }
          }

          this.provider.sync()
        }
      } catch (err: any) {
        this.ctx.error('filed in checkChanges', err)
        Analytics.handleError(err)
      }

      while (true) {
        // Find all missing items
        const missingInfos = await this.client.findAll<DocSyncInfo>(
          github.class.DocSyncInfo,
          {
            space,
            objectClass: tracker.class.Issue,
            externalCheckId: { $ne: checkId },
            targetNodeId: prj.projectNodeId,
            external: { $exists: true } // Skip not created items yet
          },
          { limit: 50 }
        )
        for (const u of missingInfos) {
          // We need to sync
          const udata = u.external as IssueExternalData
          if (udata.projectItems !== undefined) {
            udata.projectItems = {
              nodes: (udata.projectItems?.nodes ?? []).filter((it) => it.project.id !== prj.projectNodeId)
            }
          }
          await derivedClient.update(u, { needSync: '', external: u.external, externalCheckId: checkId })
        }
        if (missingInfos.length === 0) {
          break
        }
      }
      this.provider.sync()

      await this.client.update(prj, {
        githubUpdatedAt: projectStructure.projectV2.updatedAt
      })
    }
  }

  updateSet = new Map<string, Promise<void>>()

  private async updateFieldMappings (
    integration: IntegrationContainer,
    prj: GithubProject,
    target: GithubProject | GithubMilestone,
    mixinClass: Ref<Class<Doc>>,
    okit: Octokit
  ): Promise<{ projectStructure: GithubProjectV2, wasUpdates: boolean, mappings: GithubFieldMapping[] }> {
    let projectStructure = await this.queryProjectStructure(integration, target)
    let mappings = target.mappings

    if (projectStructure === undefined) {
      if (this.client.getHierarchy().isDerived(tracker.class.Project, target._class)) {
        // We need to re-create project.
        const project = target as GithubProject
        await this.ctx.withLog(
          'Create projectV2',
          { name: 'name' in target ? target.name : target.label },
          async () => {
            const response = await this.createProjectV2(integration, okit, project.name)
            if (response !== undefined) {
              target.projectNumber = response.projectNumber
              target.projectNodeId = response.projectNodeId
            }

            mappings = []
            await this.client.update(target, { ...response, mappings: [] })
          }
        )
      } else {
        const milestone = target as GithubMilestone
        try {
          await this.ctx.withLog('Create Milestone projectV2', { label: milestone.label }, async () => {
            await this.createMilestone(integration, prj, okit, milestone, undefined)
            mappings = []
          })
        } catch (err: any) {
          Analytics.handleError(err)
          this.ctx.error('Error', { err })
        }
      }
      projectStructure = (await this.queryProjectStructure(integration, target)) as GithubProjectV2
    }

    const h = this.client.getHierarchy()
    const allFields = h.getOwnAttributes(mixinClass)

    const githubFields: GithubProjectV2Field[] = projectStructure.projectV2.fields.edges

    const mHash = JSON.stringify(mappings)
    // Create any platform field into matching github field
    for (const [, f] of allFields.entries()) {
      const existingField = (mappings ?? []).find((it) => it._id === f._id)
      if (f.hidden === true) {
        continue
      }
      if (f.isCustom === true && existingField === undefined) {
        await this.createUpdateSimpleAttribute(f, githubFields, okit, target, mappings)
      }
    }
    const statusF = h.getAttribute(tracker.class.Issue, 'status')
    const f = await this.createUpdateStatus(githubFields, statusF, okit, target, prj)
    if (f !== undefined) {
      await this.pushMapping(target, mappings, statusF, f)
    }
    const priorityF = h.getAttribute(tracker.class.Issue, 'priority')
    const pf = await this.createUpdatePriority(githubFields, priorityF, okit, target)
    if (pf !== undefined) {
      await this.pushMapping(target, mappings, priorityF, pf)
    }

    await this.createUpdateSimpleAttribute(
      h.getAttribute(tracker.class.Issue, 'estimation'),
      githubFields,
      okit,
      target,
      mappings
    )

    await this.createUpdateSimpleAttribute(
      h.getAttribute(tracker.class.Issue, 'reportedTime'),
      githubFields,
      okit,
      target,
      mappings
    )

    await this.createUpdateSimpleAttribute(
      h.getAttribute(tracker.class.Issue, 'remainingTime'),
      githubFields,
      okit,
      target,
      mappings
    )

    for (const fieldNode of githubFields) {
      const existingField = (target.mappings ?? []).find((it) => it.githubId === fieldNode.node.id)
      if (existingField !== undefined) {
        continue
      }

      if (supportedGithubTypes.has(fieldNode.node.dataType)) {
        // try to find existing attribute
        let matchedField: AnyAttribute | undefined
        for (const [k, attr] of allFields) {
          if (attr.type._class !== getPlatformType(fieldNode.node.dataType)) {
            // Skip non matched fields.
            continue
          }
          if (k.toLowerCase() === fieldNode.node.name.toLowerCase()) {
            matchedField = attr
            break
          }
          const labelValue = await translate(attr.label, {})
          if (labelValue.toLowerCase() === fieldNode.node.name.toLowerCase()) {
            matchedField = attr
            break
          }
        }

        if (matchedField !== undefined) {
          // Ok we have field matched.
          await this.pushMapping(
            prj,
            mappings,
            { _id: matchedField._id, name: matchedField.name, attributeOf: matchedField.attributeOf },
            fieldNode
          )
          continue
        }

        if (fieldNode.node.dataType === 'SINGLE_SELECT') {
          // TODO: Add enum update's
          await this.createEnumAttribute(fieldNode, target, mappings, mixinClass)
        } else if (fieldNode.node.dataType === 'NUMBER') {
          await this.createSimpleAttribute(fieldNode, target, mappings, '0', mixinClass)
        } else if (fieldNode.node.dataType === 'TEXT') {
          await this.createSimpleAttribute(fieldNode, target, mappings, '', mixinClass)
        } else if (fieldNode.node.dataType === 'DATE') {
          await this.createSimpleAttribute(fieldNode, target, mappings, '', mixinClass)
        } else if (fieldNode.node.dataType === 'ITERATION') {
          // TODO: Handle Iteration data type.
        }
      }
    }
    return { projectStructure, wasUpdates: mHash !== JSON.stringify(target.mappings), mappings }
  }

  private async createUpdateSimpleAttribute (
    field: AnyAttribute,
    githubFields: GithubProjectV2Field[],
    okit: Octokit,
    target: GithubProject | GithubMilestone,
    mappings: GithubFieldMapping[]
  ): Promise<void> {
    const v = await this.createUpdateCustomField(githubFields, field, okit, target)
    if (v !== undefined) {
      await this.pushMapping(target, mappings, field, v)
    }
  }

  private async createEnumAttribute (
    fieldNode: GithubProjectV2Field,
    prj: GithubProject | GithubMilestone,
    mappings: GithubFieldMapping[],
    mixinClass: Ref<Class<Doc>>
  ): Promise<void> {
    const enumValues = (fieldNode.node.options ?? []).map((it) => it.name)
    const enumId = await this.client.createDoc(core.class.Enum, core.space.Model, {
      name: `Github_${'name' in prj ? prj.name : prj.label}_${fieldNode.node.name}`,
      enumValues
    })
    const enumType: EnumOf = {
      _class: core.class.EnumOf,
      of: enumId,
      label: getEmbeddedLabel(fieldNode.node.name)
    }
    const data: Data<AnyAttribute> = {
      attributeOf: mixinClass,
      name: fieldNode.node.id,
      label: getEmbeddedLabel(fieldNode.node.name),
      isCustom: true,
      type: enumType,
      defaultValue: enumValues[0]
    }
    // Create new attribute
    const attrId = await this.client.createDoc(
      core.class.Attribute,
      core.space.Model,
      data,
      undefined,
      Date.now(),
      prj.createdBy
    )
    await this.pushMapping(prj, mappings, { _id: attrId, name: data.name, attributeOf: data.attributeOf }, fieldNode)
  }

  private async createSimpleAttribute (
    fieldNode: GithubProjectV2Field,
    prj: GithubProject | GithubMilestone,
    mappings: GithubFieldMapping[],
    defaultValue: string,
    mixinClass: Ref<Class<Doc>>
  ): Promise<void> {
    const data: Data<AnyAttribute> = {
      attributeOf: mixinClass,
      name: fieldNode.node.id, // Use github field id as name
      label: getEmbeddedLabel(fieldNode.node.name),
      isCustom: true,
      type: {
        _class: getPlatformType(fieldNode.node.dataType),
        label: getEmbeddedLabel(fieldNode.node.name)
      },
      defaultValue
    }
    // Create new attribute
    const attrId = await this.client.createDoc(
      core.class.Attribute,
      core.space.Model,
      data,
      undefined,
      Date.now(),
      prj.createdBy
    )
    await this.pushMapping(prj, mappings, { _id: attrId, name: data.name, attributeOf: data.attributeOf }, fieldNode)
  }

  private async pushMapping (
    prj: GithubProject | GithubMilestone,
    mappings: GithubFieldMapping[],
    f: Pick<AnyAttribute, '_id' | 'name' | 'attributeOf'>,
    node: GithubProjectV2Field
  ): Promise<void> {
    const field = mappings.find((it) => it._id === f._id)
    if (field !== undefined) {
      return
    }
    const m = {
      _id: f._id,
      name: f.name,
      _class: f.attributeOf,
      githubId: node.node.id
    }
    mappings.push(m)
    await this.client.update(prj, {
      $push: {
        mappings: m
      }
    })
  }

  private async createUpdateStatus (
    githubFields: GithubProjectV2Field[],
    statusAttr: AnyAttribute,
    okit: Octokit,
    prj: GithubProject | GithubMilestone,
    project: GithubProject
  ): Promise<GithubProjectV2Field | undefined> {
    // TODO: A support of field upgrade
    const githubAttr = githubFields
      .map((it) => it)
      .find(
        (it) =>
          it.node.name.toLowerCase() === 'uber' + statusAttr.name.toLowerCase() && it.node.dataType === 'SINGLE_SELECT'
      )
    if (githubAttr !== undefined) {
      return githubAttr
    }

    // Let's find all platform status fields
    const statusFields = await this.provider.getProjectStatuses(project.type)

    const opts: { name: string, color: string, description: string }[] = []
    for (const fi of statusFields) {
      opts.push({
        name: fi.name,
        description: fi.description ?? '',
        color: categoryColors[fi.category ?? task.statusCategory.UnStarted]
      })
    }

    if (isGHWriteAllowed()) {
      const fieldUpdateResponse: any = await okit.graphql(
        `mutation createProjectField {
        ${this.addProjectField(
          prj.projectNodeId as string,
          'Uber' + statusAttr.name[0].toUpperCase() + statusAttr.name.slice(1),
          'SINGLE_SELECT',
          opts
        )}
        }
      `
      )
      return { node: fieldUpdateResponse.createProjectV2Field.projectV2Field as GithubProjectV2Field['node'] }
    }
  }

  private async createUpdateCustomField (
    githubFields: GithubProjectV2Field[],
    attr: AnyAttribute,
    okit: Octokit,
    prj: GithubProject | GithubMilestone
  ): Promise<GithubProjectV2Field | undefined> {
    const attrType = getType(attr)
    if (attrType === undefined) {
      return undefined
    }
    // TODO: A support of field upgrade
    let githubAttr = githubFields
      .map((it) => it)
      .find((it) => it.node.name.toLowerCase() === attr.name.toLowerCase() && it.node.dataType === attrType)
    if (githubAttr !== undefined) {
      return githubAttr
    }

    // Find using label

    const labelValue = await translate(attr.label, {})

    githubAttr = githubFields
      .map((it) => it)
      .find((it) => it.node.name.toLowerCase() === labelValue.toLowerCase() && it.node.dataType === attrType)

    if (githubAttr !== undefined) {
      return githubAttr
    }

    let opts: { name: string, color: string, description: string }[] | undefined

    if (attrType === 'SINGLE_SELECT') {
      const typeOf = attr.type as EnumOf
      const enumClass = await this.client.findOne(core.class.Enum, { _id: typeOf.of })
      opts = []
      for (const fi of enumClass?.enumValues ?? []) {
        opts.push({
          name: fi,
          description: '',
          color: githubColors[Math.abs(hashCode(fi)) % githubColors.length]
        })
      }
    }

    if (isGHWriteAllowed()) {
      const fieldUpdateResponse: any = await okit.graphql(
        `mutation createProjectField {
        ${this.addProjectField(
          prj.projectNodeId as string,
          labelValue[0].toUpperCase() + labelValue.slice(1),
          attrType,
          opts
        )}
        }
      `
      )
      return { node: fieldUpdateResponse.createProjectV2Field.projectV2Field as GithubProjectV2Field['node'] }
    }
  }

  private async createUpdatePriority (
    githubFields: GithubProjectV2Field[],
    attr: AnyAttribute,
    okit: Octokit,
    prj: GithubProject | GithubMilestone
  ): Promise<GithubProjectV2Field | undefined> {
    // TODO: A support of field upgrade
    const githubAttr = githubFields
      .map((it) => it)
      .find((it) => it.node.name.toLowerCase() === attr.name.toLowerCase() && it.node.dataType === 'SINGLE_SELECT')
    if (githubAttr !== undefined) {
      return githubAttr
    }

    const opts: { name: string, color: string, description: string }[] = []

    for (const fi of ['Urgent', 'High', 'Medium', 'Low']) {
      opts.push({
        name: fi,
        description: '',
        color: githubColors[Math.abs(hashCode(fi)) % githubColors.length]
      })
    }
    if (isGHWriteAllowed()) {
      const fieldUpdateResponse: any = await okit.graphql(
        `mutation createProjectField {
        ${this.addProjectField(
          prj.projectNodeId as string,
          attr.name[0].toUpperCase() + attr.name.slice(1),
          'SINGLE_SELECT',
          opts
        )}
        }
      `
      )
      return { node: fieldUpdateResponse.createProjectV2Field.projectV2Field as GithubProjectV2Field['node'] }
    }
  }

  private async queryProjectStructure (
    integration: IntegrationContainer,
    prj: GithubProjectSyncData
  ): Promise<GithubProjectV2 | undefined> {
    const root = `${integration.type === 'Organization' ? 'organization' : 'user'}`
    return (
      (await integration.octokit?.graphql(
        `
        query projectStructureQuery($login: String!, $prjNumber: Int!) {
          ${root}(login: $login) {
            projectV2(number: $prjNumber) {
              id
              updatedAt
              title
              readme
              fields(last: 100) {
                edges {
                  node {
                    ${projectV2Field}
                  }
                }
              }
            }
          }
        }`,
        {
          login: integration.login,
          prjNumber: prj.projectNumber
        }
      )) as any
    )[root]
  }

  private queryProject (
    integration: IntegrationContainer,
    prj: GithubProjectSyncData
  ): { query: string, params: any, root: string } {
    const root = `${integration.type === 'Organization' ? 'organization' : 'user'}`
    return {
      query: `
      query queryProjectContents($login: String!, $prjNumber: Int!, $cursor: String) {
        ${root}(login: $login) {
          projectV2(number: $prjNumber) {
            items(first: 99, after: $cursor) {
              nodes {
                id
                type
                updatedAt
                fieldValues(first: 50) {
                  nodes {
                    ${projectV2ItemFields}
                  }
                }
                content {
                  ... on Issue {
                    id
                    url
                  }
                  ... on PullRequest {
                    id
                    url
                  }
                }
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
      }
        `,
      params: {
        login: integration.login,
        prjNumber: prj.projectNumber
      },
      root
    }
  }

  private async createProjectV2 (
    integration: IntegrationContainer,
    octokit: Octokit,
    prjName: string
  ): Promise<{ projectNumber: number, projectNodeId: string, url: string } | undefined> {
    if (isGHWriteAllowed()) {
      const response: any = await octokit.graphql(
        `
      mutation createProjectV2($owner: ID!, $title: String!) {
        createProjectV2(input: {ownerId: $owner, title: $title}) {
          projectV2 {
            url
            id
            number
          }
        }
      }`,
        {
          owner: integration.loginNodeId,
          title: prjName
        }
      )

      return {
        projectNumber: response.createProjectV2.projectV2.number,
        projectNodeId: response.createProjectV2.projectV2.id,
        url: response.createProjectV2.projectV2.url
      }
    }
  }

  private async updateProjectV2 (
    octokit: Octokit,
    projectId: string,
    options: {
      title?: string
      shortDescription?: string
      readme?: string
    }
  ): Promise<void> {
    if (isGHWriteAllowed()) {
      await octokit.graphql(
        `
      mutation createProjectV2($projectID: ID!) {
        updateProjectV2(input: {
          projectId: $projectID
          ${gqlp(options)}
        }) {
          projectV2 {
            url
            id
            number
          }
        }
      }`,
        {
          projectID: projectId
        }
      )
    }
  }

  private addProjectField (
    projectId: string,
    name: string,
    type: GithubDataType,
    options?: {
      name: string
      color: string
      description: string
    }[]
  ): string {
    return `
        createProjectV2Field(
          input: {
            dataType: ${type}, 
            name: "${name}",
            ${
              options !== undefined
                ? `singleSelectOptions: [
                  ${options
                    .map((it) => `{name: "${it.name}", color: ${it.color}, description: "${it.description}"}`)
                    .join(', ')}], `
                : ''
            } 
            projectId: "${projectId}"
          }
        ) {
          projectV2Field {
            ${projectV2Field}          
          }
        }
      \n`
  }
}
