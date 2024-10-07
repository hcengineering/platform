import { Person, PersonAccount } from '@hcengineering/contact'
import {
  Account,
  Branding,
  Class,
  Data,
  Doc,
  DocumentUpdate,
  Ref,
  Space,
  Status,
  TxOperations,
  WithLookup,
  WorkspaceIdWithUrl,
  type Blob
} from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import { ProjectType, TaskType } from '@hcengineering/task'
import { MarkupNode } from '@hcengineering/text'
import { User } from '@octokit/webhooks-types'
import {
  DocSyncInfo,
  GithubIntegration,
  GithubIntegrationRepository,
  GithubMilestone,
  GithubProject,
  GithubUserInfo
} from '@hcengineering/github'
import { Octokit } from 'octokit'
import { GithubProjectV2 } from './sync/githubTypes'

/**
 * @public
 */
export const githubSyncVersion = 'v7'

/**
 * @public
 */
export const githubExternalSyncVersion = 'v4'

/**
 * @public
 */
export const githubDerivedSyncVersion = 'v1'

/**
 * @public
 */
export interface Workspace {
  _id: string
  workspace: string
}

/**
 * @public
 */
export interface IntegrationContainer {
  integration: WithLookup<GithubIntegration>
  installationId: number
  installationName: string
  octokit: Octokit

  projectStructure: Map<Ref<GithubProject | GithubMilestone>, GithubProjectV2>

  enabled: boolean
  synchronized: Set<string>

  login: string
  loginNodeId: string
  type: GithubIntegration['type']

  syncLock: Map<Ref<Doc>, Promise<void>>
}

export type UserInfo = Data<GithubUserInfo>

export interface ContainerFocus {
  container: IntegrationContainer
  project: GithubProject
}

export interface IntegrationManager {
  liveQuery: LiveQuery
  getContainer: (space: Ref<Space>) => Promise<ContainerFocus | undefined>
  getAccount: (user?: UserInfo | null) => Promise<PersonAccount | undefined>
  getAccountU: (user: User) => Promise<PersonAccount | undefined>
  getOctokit: (account: Ref<PersonAccount>) => Promise<Octokit | undefined>
  getMarkup: (
    container: IntegrationContainer,
    text?: string | null,
    preprocessor?: (nodes: MarkupNode) => Promise<void>
  ) => Promise<string>
  getMarkdown: (text?: string | null, preprocessor?: (nodes: MarkupNode) => Promise<void>) => Promise<string>
  sync: () => void
  getGithubLogin: (container: IntegrationContainer, account: Ref<Person>) => Promise<UserInfo | undefined>

  uploadFile: (patch: string, file?: string, contentType?: string) => Promise<Blob | undefined>

  getStatuses: (type: Ref<TaskType> | undefined) => Promise<Status[]>
  getProjectStatuses: (type: Ref<ProjectType> | undefined) => Promise<Status[]>
  getProjectType: (type: Ref<ProjectType>) => Promise<ProjectType | undefined>
  getTaskType: (type: Ref<TaskType>) => Promise<TaskType | undefined>

  getTaskTypeOf: (project: Ref<ProjectType>, ofClass: Ref<Class<Doc>>) => Promise<TaskType | undefined>

  handleEvent: <T>(
    requestClass: Ref<Class<Doc>>,
    integrationId: number | undefined,
    repo: GithubIntegrationRepository,
    event: T
  ) => Promise<void>

  doSyncFor: (docs: DocSyncInfo[], project: GithubProject) => Promise<void>
  getWorkspaceId: () => WorkspaceIdWithUrl
  getBranding: () => Branding | null

  getProjectAndRepository: (
    repositoryId: string
  ) => Promise<{ project?: GithubProject, repository?: GithubIntegrationRepository }>

  checkMarkdownConversion: (
    container: IntegrationContainer,
    body: string
  ) => Promise<{ markdownCompatible: boolean, markdown: string }>

  isPlatformUser: (account: Ref<PersonAccount>) => Promise<boolean>

  getProjectRepositories: (space: Ref<Space>) => Promise<GithubIntegrationRepository[]>

  getRepositoryById: (ref?: Ref<GithubIntegrationRepository> | null) => Promise<GithubIntegrationRepository | undefined>
}

export type ExternalSyncField = 'externalVersion' | 'derivedVersion'

/**
 * @public
 *
 * Will perform synchronization of document and external document.
 */
export interface DocSyncManager {
  // Initialize the mapper.
  init: (provider: IntegrationManager) => Promise<void>
  // Perform synchronization of document with external source.
  sync: (
    existing: Doc | undefined,
    info: DocSyncInfo,
    parent: DocSyncInfo | undefined,
    derivedClient: TxOperations
  ) => Promise<DocumentUpdate<DocSyncInfo> | undefined>

  handleDelete: (
    existing: Doc | undefined,
    info: DocSyncInfo,
    derivedClient: TxOperations,
    deleteExisting: boolean,
    parent?: DocSyncInfo
  ) => Promise<boolean>

  // Perform synchronization with external source.
  externalFullSync: (
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    projects: GithubProject[],
    repositories: GithubIntegrationRepository[]
  ) => Promise<void>

  // Perform synchronization with external source.
  externalSync: (
    integration: IntegrationContainer,
    derivedClient: TxOperations,
    kind: ExternalSyncField,
    syncDocs: DocSyncInfo[],
    repository: GithubIntegrationRepository,
    project: GithubProject
  ) => Promise<void>

  handleEvent: <T>(integration: IntegrationContainer, derivedClient: TxOperations, event: T) => Promise<void>

  externalDerivedSync: boolean

  repositoryDisabled: (integration: IntegrationContainer, repo: GithubIntegrationRepository) => void
}

/**
 * @public
 */
export interface GithubIntegrationRecord {
  installationId: number
  workspace: string
  accountId: Ref<Account>
}

/**
 * @public
 */
export interface GithubUserRecord {
  _id: string // login
  code?: string | null
  token?: string
  expiresIn?: number | null // seconds
  refreshToken?: string | null
  refreshTokenExpiresIn?: number | null
  authorized?: boolean
  state?: string
  scope?: string
  error?: string | null

  accounts: Record<string, Ref<Account>>
}
