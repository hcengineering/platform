import { Analytics } from '@hcengineering/analytics'
import { Doc, DocumentUpdate, MeasureContext, TxOperations } from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import { DocSyncInfo, GithubIntegrationRepository, GithubProject } from '@hcengineering/github'
import { Octokit } from 'octokit'
import { DocSyncManager, ExternalSyncField, IntegrationContainer, IntegrationManager } from '../types'
import { UserInfo } from './githubTypes'

export class UsersSyncManager implements DocSyncManager {
  provider!: IntegrationManager

  constructor (
    readonly ctx: MeasureContext,
    readonly client: TxOperations,
    readonly lq: LiveQuery
  ) {}

  externalDerivedSync = false

  async init (provider: IntegrationManager): Promise<void> {
    this.provider = provider
  }

  async sync (
    ctx: MeasureContext,
    existing: Doc | undefined,
    info: DocSyncInfo,
    parent?: DocSyncInfo
  ): Promise<DocumentUpdate<DocSyncInfo> | undefined> {
    return {}
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

  async handleEvent<T>(
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    evt: T
  ): Promise<void> {}

  async externalSync (
    ctx: MeasureContext,
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    kind: ExternalSyncField,
    syncDocs: DocSyncInfo[],
    repo: GithubIntegrationRepository,
    prj: GithubProject
  ): Promise<void> {}

  repositoryDisabled (ctx: MeasureContext, integration: IntegrationContainer, repo: GithubIntegrationRepository): void {
    integration.synchronized.delete(`${repo._id}:users`)
  }

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
      const syncKey = `${repo._id}:users`
      if (
        repo.githubProject === undefined ||
        !repo.enabled ||
        integration.synchronized.has(syncKey) ||
        integration.octokit === undefined ||
        repo.nodeId === undefined
      ) {
        continue
      }

      await this.syncUsers('assignableUsers', integration, repo)
      await this.syncUsers('mentionableUsers', integration, repo)

      integration.synchronized.add(syncKey)
    }
  }

  async syncUsers (key: string, integration: IntegrationContainer, repo: GithubIntegrationRepository): Promise<void> {
    const assignableUsersIterator = integration.octokit.graphql.paginate.iterator(
      `query listUsers($name: String!, $owner: String!, $cursor: String) {
        repository(name: $name, owner: $owner) {
          ${key}(first: 50, after: $cursor) {
            nodes {
              id
              email
              avatarUrl
              login
              name
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
    try {
      for await (const data of assignableUsersIterator) {
        if (this.provider.isClosing()) {
          break
        }
        const users: UserInfo[] = data.repository[key]?.nodes ?? []
        for (const d of users) {
          if (d.login !== undefined) {
            try {
              await this.provider.getAccount(d)
              continue
            } catch (err: any) {
              this.ctx.error('Error', { err })
              Analytics.handleError(err)
            }
          }
        }
      }
    } catch (err: any) {
      this.ctx.error('Error', { err })
      Analytics.handleError(err)
    }
  }
}

export async function fetchViewerDetails (okit: Octokit): Promise<{
  viewer: {
    followers: {
      totalCount: number
    }
    following: {
      totalCount: number
    }
    repositories: {
      totalCount: number
    }
    openIssues: {
      totalCount: number
    }
    closedIssues: {
      totalCount: number
    }
    openPRs: {
      totalCount: number
    }
    mergedPRs: {
      totalCount: number
    }
    closedPRs: {
      totalCount: number
    }
    repositoryDiscussions: {
      totalCount: number
    }
    repositoriesContributedTo: {
      totalCount: number
    }
    starredRepositories: {
      totalCount: number
    }

    id: string
    login: string
    email: string | undefined
    url: string | undefined
    name: string | undefined
    bio: string | undefined
    location: string | undefined
    company: string | undefined
    avatarUrl: string | undefined
    createdAt: string | undefined
    updatedAt: string | undefined
    organizations: {
      totalCount: number
      nodes: {
        url: string
        avatarUrl: string | undefined
        name: string | undefined
        description: string | undefined
        archivedAt: string | undefined
        email: string | undefined
        viewerIsAMember: boolean
        updatedAt: string | undefined
        resourcePath: string | undefined
        descriptionHTML: string | undefined
        location: string | undefined
        websiteUrl: string | undefined
      }[]
    }
  }
}> {
  const request = `
  {
    viewer {
      followers(first:0) {
        totalCount
      }
      following(first:0) {
        totalCount
      }
      repositories(first:0) {
        totalCount
      }
      openIssues:issues(first:0, states:[OPEN]) {
        totalCount
      }
      closedIssues:issues (first:0, states:[CLOSED]) {
        totalCount
      }

      openPRs: pullRequests(first:0, states:OPEN) {
        totalCount
      }
      mergedPRs: pullRequests(first:0, states:MERGED) {
        totalCount
      }
      closedPRs: pullRequests(first:0, states:CLOSED) {
        totalCount
      }
      repositoryDiscussions(first:0) {
        totalCount
      }
      repositoriesContributedTo(first:0) {
        totalCount
      }
      starredRepositories(first:0) {
        totalCount
      }

      id
      login
      email
      url
      name
      bio
      location
      company
      avatarUrl
      createdAt
      updatedAt
      organizations(first: 50) {
        totalCount
        nodes {
          url
          avatarUrl
          name
          resourcePath
          description
          archivedAt
          email
          viewerIsAMember
          archivedAt
          updatedAt
          description
          descriptionHTML
          location
          websiteUrl
        }
      }
    }
  }
  `
  return await okit.graphql(request)
}
