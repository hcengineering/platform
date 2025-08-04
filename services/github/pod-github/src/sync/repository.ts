//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import core, {
  Doc,
  DocData,
  DocumentUpdate,
  MeasureContext,
  TxOperations,
  generateId,
  withContext
} from '@hcengineering/core'
import github, { DocSyncInfo, GithubIntegrationRepository, GithubProject } from '@hcengineering/github'
import { Endpoints } from '@octokit/types'
import {
  Repository,
  RepositoryEvent,
  type InstallationCreatedEvent,
  type InstallationUnsuspendEvent
} from '@octokit/webhooks-types'
import { App } from 'octokit'
import { DocSyncManager, ExternalSyncField, IntegrationContainer, IntegrationManager } from '../types'
import { collectUpdate } from './utils'

const syncReposKey = 'repo_sync'

export class RepositorySyncMapper implements DocSyncManager {
  constructor (
    private readonly client: TxOperations,
    private readonly app: App
  ) {}

  externalDerivedSync = false

  provider!: IntegrationManager

  // Initialize the mapper.
  async init (provider: IntegrationManager): Promise<void> {
    this.provider = provider
  }

  // Perform synchronization of document with external source.

  @withContext('repository-sync')
  async sync (
    ctx: MeasureContext,
    existing: Doc | undefined,
    info: DocSyncInfo
  ): Promise<DocumentUpdate<DocSyncInfo> | undefined> {
    return {}
  }

  async reloadRepositories (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    repositories?: InstallationCreatedEvent['repositories'] | InstallationUnsuspendEvent['repositories']
  ): Promise<void> {
    integration.synchronized.delete(syncReposKey)

    if (repositories !== undefined) {
      // We have a list of repositories, so we could create them if they are missing.
      // Need to find all repositories, not only active, so passed repositories are not work.
      const allRepositories = await this.provider.liveQuery.findAll(github.class.GithubIntegrationRepository, {
        attachedTo: integration.integration._id
      })

      const allRepos: GithubIntegrationRepository[] = [...allRepositories]
      for (const repository of repositories) {
        const integrationRepo: GithubIntegrationRepository | undefined = allRepos.find(
          (it) => it.repositoryId === repository.id
        )

        if (integrationRepo === undefined) {
          // No integration repository found, we need to push one.
          await this.client.addCollection(
            github.class.GithubIntegrationRepository,
            integration.integration.space,
            integration.integration._id,
            integration.integration._class,
            'repositories',
            {
              nodeId: repository.node_id,
              name: repository.name,
              url: integration.installationName + '/' + repository.name,
              repositoryId: repository.id,
              enabled: true,
              deleted: false,
              archived: false,
              fork: false,
              forks: 0,
              hasDiscussions: false,
              hasDownloads: false,
              hasIssues: false,
              hasPages: false,
              hasProjects: false,
              hasWiki: false,
              openIssues: 0,
              private: repository.private,
              size: 0,
              stargazers: 0,
              watchers: 0,
              visibility: repository.private ? 'private' : 'public'
            },
            undefined, // id
            Date.now(),
            integration.integration.createdBy
          )
          ctx.info('Creating repository info document...', {
            url: repository.full_name,
            workspace: this.provider.getWorkspaceId()
          })
        }
      }
    }
  }

  @withContext('repository-handleEvent')
  async handleEvent<T>(
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    evt: T
  ): Promise<void> {
    const event = evt as RepositoryEvent

    const account = (await this.provider.getAccountU(event.sender)) ?? core.account.System
    switch (event.action) {
      case 'created': {
        await this.client.addCollection(
          github.class.GithubIntegrationRepository,
          integration.integration.space,
          integration.integration._id,
          integration.integration._class,
          'repositories',
          {
            ...this.getRData(event.repository),
            name: event.repository.name,
            repositoryId: event.repository.id,
            enabled: true
          },
          generateId(),
          Date.now(),
          account
        )
        ctx.info('Creating repository info document...', {
          url: event.repository.url,
          workspace: this.provider.getWorkspaceId()
        })
        break
      }
      case 'renamed': {
        const githubRepo = await this.client.findOne(github.class.GithubIntegrationRepository, {
          repositoryId: event.repository.id
        })
        if (githubRepo !== undefined) {
          await this.client.update(
            githubRepo,
            {
              name: event.repository.name
            },
            false,
            Date.now(),
            account
          )
          githubRepo.name = event.repository.name
          const allProjects = await this.client.findAll(github.mixin.GithubProject, { repositories: githubRepo?._id })
          for (const prj of allProjects) {
            // We need to force sync
            await this.handleRepoRename(ctx, integration, prj, githubRepo)
          }
        }

        break
      }
      case 'deleted':
      case 'transferred': {
        // TODO: Add remove of component
        const githubRepo = await this.client.findOne(github.class.GithubIntegrationRepository, {
          integration: integration.integration._id,
          name: event.repository.name
        })
        if (githubRepo !== undefined) {
          await this.client.update(
            githubRepo,
            {
              enabled: true,
              deleted: true
            },
            false,
            Date.now(),
            account
          )
        }
      }
    }
  }

  async handleDelete (
    ctx: MeasureContext,
    existing: Doc | undefined,
    info: DocSyncInfo,
    derivedClient: TxOperations,
    deleteExisting: boolean
  ): Promise<boolean> {
    return false
  }

  getRData (
    repository: Repository | Endpoints['GET /installation/repositories']['response']['data']['repositories'][0]
  ): Omit<DocData<GithubIntegrationRepository>, 'name' | 'repositoryId' | 'deleted' | 'githubProjects' | 'enabled'> {
    return {
      nodeId: repository.node_id,
      url: repository.url,
      htmlURL: repository.html_url,
      owner: {
        id: repository.owner.node_id,
        login: repository.owner.login,
        avatarUrl: repository.owner.avatar_url,
        email: repository.owner.email ?? undefined,
        name: repository.owner.name ?? undefined
      },
      description: repository.description ?? undefined,
      fork: repository.fork,
      forks: repository.forks,
      private: repository.private,
      stargazers: repository.stargazers_count,

      hasIssues: repository.has_issues,
      hasProjects: repository.has_projects,
      hasDownloads: repository.has_downloads,
      hasPages: repository.has_pages,
      hasWiki: repository.has_wiki,
      hasDiscussions: repository.has_discussions ?? false,

      openIssues: repository.open_issues,
      watchers: repository.watchers_count,
      archived: repository.archived,
      size: repository.size,
      language: repository.language ?? undefined,
      resourcePath: repository.full_name,

      visibility: repository.visibility,
      updatedAt: new Date(repository.updated_at ?? repository.created_at ?? Date.now()).getTime()
    }
  }

  @withContext('repository-externalSync')
  async externalSync (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    kind: ExternalSyncField,
    syncDocs: DocSyncInfo[],
    repo: GithubIntegrationRepository,
    prj: GithubProject
  ): Promise<void> {}

  repositoryDisabled (ctx: MeasureContext, integration: IntegrationContainer, repo: GithubIntegrationRepository): void {}

  @withContext('repository-externalFullSync')
  async externalFullSync (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    projects: GithubProject[],
    repositories: GithubIntegrationRepository[]
  ): Promise<void> {
    const inst = integration.octokit
    if (inst === undefined || integration.octokit === undefined) {
      ctx.info('no installation found', { workspace: this.provider.getWorkspaceId() })
      return
    }

    if (integration.synchronized.has(syncReposKey)) {
      return
    }
    ctx.info('Checking github installation repositories...', {
      installationId: integration.installationId,
      workspace: this.provider.getWorkspaceId()
    })

    const iterable = this.app.eachRepository.iterator({ installationId: integration.installationId })

    // Need to find all repositories, not only active, so passed repositories are not work.
    const allRepositories = await this.provider.liveQuery.findAll(github.class.GithubIntegrationRepository, {
      attachedTo: integration.integration._id
    })

    let allRepos: GithubIntegrationRepository[] = [...allRepositories]

    const githubRepos:
    | Repository
    | Endpoints['GET /installation/repositories']['response']['data']['repositories'][0][] = []
    for await (const { repository } of iterable) {
      githubRepos.push(repository)
    }

    for (const repository of githubRepos) {
      const integrationRepo: GithubIntegrationRepository | undefined = allRepos.find(
        (it) => it.repositoryId === repository.id
      )

      const rdata = this.getRData(repository)
      if (integrationRepo === undefined) {
        // No integration repository found, we need to push one.
        await this.client.addCollection(
          github.class.GithubIntegrationRepository,
          integration.integration.space,
          integration.integration._id,
          integration.integration._class,
          'repositories',
          {
            ...rdata,
            name: repository.name,
            repositoryId: repository.id,
            enabled: true,
            deleted: false
          },
          undefined, // id
          Date.now(),
          integration.integration.createdBy
        )
        ctx.info('Creating repository info document...', {
          url: repository.url,
          workspace: this.provider.getWorkspaceId()
        })
      } else {
        allRepos = allRepos.filter((it) => it._id !== integrationRepo._id)
        const diff = collectUpdate(
          integrationRepo,
          {
            name: repository.name,
            ...rdata
          },
          ['name', ...Object.keys(rdata)]
        )
        if (Object.keys(diff).length > 0) {
          ctx.info('processing repository diff update...', {
            repository: repository.name,
            ...diff,
            workspace: this.provider.getWorkspaceId()
          })
          await this.client.diffUpdate(
            integrationRepo,
            {
              name: repository.name,
              ...rdata
            },
            new Date().getTime(),
            integration.integration.createdBy
          )
        }
      }
    }

    // Ok we have repos removed from integration, we need to delete them.
    for (const repo of allRepos) {
      // Mark as archived
      await this.client.update(repo, { archived: true })
    }

    // We need to delete and disconnect missing repositories.

    integration.synchronized.add(syncReposKey)
  }

  // Perform a synchronization of a single repository.
  async handleRepoRename (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    prj: GithubProject,
    repo: GithubIntegrationRepository
  ): Promise<void> {
    // We need to update urls for all sync documents belong to this repository.

    const derivedClient = new TxOperations(this.client, core.account.System, true)
    const processingId = generateId()

    // Wait previous sync to finish
    await integration.syncLock.get(prj._id)

    /**
     Variants:
     "https://api.github.com/repos/hcengineering/anticrm/issues/comments/1679316918"
     "https://github.com/hcengineering/uberflow/pull/195"
     * */
    ctx.info('handle repository rename', { repo, workspace: this.provider.getWorkspaceId() })
    const update = async (): Promise<void> => {
      while (true) {
        const docs = await this.client.findAll(
          github.class.DocSyncInfo,
          { _class: github.class.DocSyncInfo, repository: repo._id, processingId: { $ne: processingId } },
          { limit: 1000 }
        )
        const ops = derivedClient.apply()
        if (docs.length === 0) {
          break
        }
        for (const d of docs) {
          const ul = d.url.split('/')
          if (ul[2] === 'api.github.com') {
            ul[5] = repo.name
          } else {
            ul[4] = repo.name
          }
          // We need to mark sync is required, to perform github
          await ops.diffUpdate(d, { url: ul.join('/'), processingId, needSync: '', externalVersion: '' })
        }
        await ops.commit()
        this.provider.sync()
      }
    }
    const p = update()
    integration.syncLock.set(prj._id, p)
    await p
    integration.syncLock.delete(prj._id)
  }
}
