//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { ActivityMessage, ActivityMessageViewlet } from '@hcengineering/activity'
import { Attachment } from '@hcengineering/attachment'
import { Person } from '@hcengineering/contact'
import {
  PersonId,
  AnyAttribute,
  AttachedDoc,
  Class,
  Data,
  Doc,
  Hyperlink,
  Markup,
  Mixin,
  Ref,
  Timestamp
} from '@hcengineering/core'
import { Asset, IntlString, Metadata, Plugin, plugin } from '@hcengineering/platform'
import { Preference } from '@hcengineering/preference'
import task, { ProjectTypeDescriptor, TaskStatusFactory, TaskTypeDescriptor } from '@hcengineering/task'
import { ToDo } from '@hcengineering/time'
import { Component, Issue, Milestone, Project } from '@hcengineering/tracker'
import { AnyComponent } from '@hcengineering/ui'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'

/**
 * @public
 *
 * Define information about bi-directional synchronization with some other source.
 */
export interface DocSyncInfo extends Doc {
  // _id === objectId
  url: string
  objectClass: Ref<Class<Doc>>

  lastGithubUser?: PersonId | null

  // If repository is null, then document is not yet synced.
  repository: Ref<GithubIntegrationRepository> | null
  external?: any // a raw data from external source, it should be mapped to platform document.
  externalVersion?: string
  externalCheckId?: string

  // Will contain derived state if required.
  derivedVersion?: string

  current?: any // a current document being synchronized.
  needSync: string // Will be updated by server trigger, in case of document changes of particular kind.
  githubNumber: number

  lastModified?: number

  // Parent url
  parent?: string

  // If set, issue is marked as deleted.
  deleted?: boolean

  // In case of error will retry in certain amount of time.
  error?: any

  [string: string]: any
}

/**
 * @public
 */
export interface GithubRepositoryRef {
  name: string
  id: string
  prefix: string
}

/**
 * @public
 */
export interface GithubPullRequestFileReview {
  fileName: string
  sha: string
}

/**
 * @public
 *
 * Mixin with extra stuff for issues/pull requests related to github.
 */
export interface GithubIssue extends Issue {
  // Github URL of the issue or Pull request
  url: Hyperlink
  githubNumber: number
  repository: Ref<GithubIntegrationRepository>

  // In case specified, description will be locked on editing until Allow edit button will be clicked on top bar.
  // Button will also show a diff between a real data and updated markdown.
  descriptionLocked?: boolean
}

/**
 * @public
 *
 * Mixin with extra stuff for todo's
 */
export interface GithubTodo extends ToDo {
  // Github URL of the issue or Pull request
  purpose: 'review' | 'fix'

  threadIds?: string[]
}

/**
 * @public
 *
 * Mixin to mark person as github enabled
 */
export interface GithubUser extends Person {
  url: Hyperlink
}

/**
 * @public
 *
 * Mixin to manage github component to repository mapping.
 */
export interface GithubComponent extends Component {
  repository: Ref<GithubIntegrationRepository>
  // If true, component represent repository and could not be removed/edited.
  represent?: boolean
}

/**
 * @public
 */
export enum PullRequestMergeable {
  MERGEABLE = 'MERGEABLE',
  CONFLICTING = 'CONFLICTING',
  UNKNOWN = 'UNKNOWN'
}

export enum GithubPullRequestReviewState {
  Pending,
  Commented,
  Approved,
  ChangesRequested,
  Dismissed
}

export enum GithubPullRequestState {
  open,
  closed,
  merged
}
export enum GithubReviewDecisionState {
  ChangesRequested,
  Approved,
  ReviewRequired
}

export interface LastReviewState {
  user: PersonId
  state: GithubPullRequestReviewState
}
/**
 * @public
 */
export interface GithubPullRequest extends Issue {
  state: GithubPullRequestState
  reviewDecision: GithubReviewDecisionState

  reviewers: Ref<Person>[] | null

  space: Ref<GithubProject>

  head: GithubRepositoryRef
  base: GithubRepositoryRef

  draft: boolean

  mergedAt: Timestamp | null
  closedAt: Timestamp | null

  commits: number

  mergeable: PullRequestMergeable

  latestReviews: LastReviewState[]

  reviews: number

  reviewComments: number
}

/**
 * @public
 */
export interface GitRef {
  url: string
  sha: string
}

/**
 * @public
 */
export interface GithubPullRequestCommit extends AttachedDoc {
  attachedTo: Ref<GithubPullRequest>

  sha: string

  author?: Ref<Person>
  committer?: Ref<Person>

  message: string

  tree: GitRef

  verified: boolean
  reason: string | null
  signature: string | null
  payload: string | null

  parents: GitRef[]
}

/**
 * @public
 */
export interface GithubReview extends ActivityMessage {
  state: GithubPullRequestReviewState
  body: Markup

  // Urls of comments
  comments: string[]
}

/**
 * @public
 */
export interface GithubReviewViewlet extends ActivityMessageViewlet {
  label?: IntlString
}

export type MinimizeReason = 'abuse' | 'off-topic' | 'outdated' | 'resolved' | 'duplicate' | 'spam'

/**
 * @public
 */
export interface GithubPullRequestReview extends AttachedDoc {
  attachedTo: Ref<GithubPullRequest>

  author: Ref<Person>
  files: GithubPullRequestFileReview[]
}

/**
 * @public
 */
export interface GithubReviewThread extends ActivityMessage {
  threadId: string
  line: number
  startLine: number
  isOutdated: boolean
  isResolved: boolean
  diffSide: 'LEFT' | 'RIGHT'
  isCollapsed: boolean
  originalLine: number
  originalStartLine: number | null
  path: string
  startDiffSide: 'LEFT' | 'RIGHT' | null
  resolvedBy: PersonId | null
}

export interface GithubReviewComment extends AttachedDoc {
  attachedTo: Ref<GithubPullRequest> // Attached to review thread.
  url: string // Used to identify comment for review, etc.
  reviewThreadId: string
  reviewUrl: string // A review url.

  body: Markup

  outdated: boolean

  includesCreatedEdit: boolean
  isMinimized: boolean
  minimizedReason: MinimizeReason | null

  line: number | null
  startLine: number | null
  originalLine: number | null
  originalStartLine: number | null
  diffHunk: string | null
  path: string

  replyToUrl?: string
}

/**
 * @public
 */
export interface GithubPatch extends Attachment {}

/**
 * @public
 */
export enum GithubIssueState {
  Opened = 'open',
  Closed = 'closed'
}
/**
 * @public
 */
export enum GithubIssueStateReason {
  Completed = 'COMPLETED',
  Reopened = 'REOPENED',
  NotPlanned = 'NOT_PLANNED'
}

export interface IntegrationRepositoryData {
  id: number
  name: string
  owner: GithubUserInfo
  url: string
  nodeId: string
}

/**
 * @public
 */
export interface GithubIntegrationRepository extends AttachedDoc {
  name: string
  repositoryId: number
  deleted?: boolean

  // In case synchronization was configured.
  githubProject?: Ref<GithubProject> | null

  // Debug only
  enabled: boolean

  id?: number
  owner?: Data<GithubUserInfo>
  url?: string
  htmlURL?: string
  nodeId?: string

  description?: string
  fork: boolean
  forks: number
  private: boolean
  stargazers: number

  hasIssues: boolean
  hasProjects: boolean
  hasDownloads: boolean
  hasPages: boolean
  hasWiki: boolean
  hasDiscussions: boolean

  openIssues: number
  watchers: number

  archived: boolean

  size: number

  language?: string

  visibility?: string

  updatedAt?: Timestamp

  resourcePath?: string
}

/**
 * @public
 */
export interface GithubIntegration extends Doc {
  requestId?: string
  // Unique identifier for the installation id, will be filled after installation redirect.
  installationId: number
  clientId: string

  // Technical details, will be filled by github integration service.
  name: string // Organization or individual user name
  nodeId: string

  // If alive, platform perform live synchronization of repository.
  alive: boolean

  repositories: number

  // Organization or
  type?: 'User' | 'Organization' | 'Bot'
  byUser?: string
}
/**
 * @public
 */
export interface GithubAuthentication extends Preference {
  login: string

  avatar?: string
  email?: string
  bio?: string
  blog?: string
  company?: string
  createdAt: Date
  updatedAt: Date
  followers: number
  following: number
  gravatarId?: string
  location?: string
  url: string
  name?: string
  nodeId: string

  repositories: number
  openIssues: number
  closedIssues: number
  openPRs: number
  mergedPRs: number
  closedPRs: number
  repositoryDiscussions: number
  starredRepositories: number

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
      descriptionHTML: string | undefined
      location: string | undefined
      websiteUrl: string | undefined
    }[]
  }

  error?: string | null
  authRequestTime?: Timestamp
}

/**
 * @public
 */
export interface GithubUserInfo extends Doc {
  login: string
  id: string
  email?: string
  name?: string
  avatarUrl?: string
}

/**
 * @public
 */
export interface GithubFieldMapping {
  // Platform field
  _id: Ref<AnyAttribute>
  name: string
  _class: Ref<Class<Doc>>

  // Github information
  githubId: string // It could be fieldName or fieldId
}

/**
 * @public
 */
export interface GithubProjectSyncData {
  // Project NodeId
  projectNodeId?: string
  projectNumber?: number

  githubProjectName?: string

  // Mapping of all fields in this project.
  mappings: GithubFieldMapping[]

  // Update mapping
  githubUpdatedAt?: string
}

/**
 * @public
 *
 * Mixin to ordinary project, to allow github repository mapping into it.
 */
export interface GithubProject extends Project, GithubProjectSyncData {
  integration: Ref<GithubIntegration>

  // A list of mapped repositories we synchronized into this project.
  repositories: Ref<GithubIntegrationRepository>[]

  // Mixin to store all github custom attributes in
  mixinClass: Ref<Class<GithubIssue>>
}

/**
 * @public
 *
 * Mixin for milestone to represent a github project for it.
 */
export interface GithubMilestone extends Milestone, GithubProjectSyncData {
  // A link to github project.
  url: Hyperlink
}

export interface GithubPullRequestReviewThread extends Doc {
  githubId: string
  line: number
  startLine: number
  isOutdated: boolean
  isResolved: boolean
  diffSide: 'LEFT' | 'RIGHT'
  isCollapsed: boolean
  originalLine: number
  originalLineStart: number
  path: string
}

/**
 * @public
 */

export const githubPullRequestStates: TaskStatusFactory[] = [
  { category: task.statusCategory.Active, statuses: [['Review in progress', PaletteColorIndexes.Cerulean]] },
  { category: task.statusCategory.Won, statuses: [['Merged', PaletteColorIndexes.Grass]] },
  { category: task.statusCategory.Lost, statuses: [['Canceled', PaletteColorIndexes.Coin]] }
]

export function makeQuery (obj: Record<string, string | number | boolean | undefined>): string {
  return Object.keys(obj)
    .filter((it) => it[1] != null)
    .map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] as string | number | boolean)
    })
    .join('&')
}

/**
 * @public
 */
export const githubId = 'github' as Plugin

export default plugin(githubId, {
  class: {
    DocSyncInfo: '' as Ref<Class<DocSyncInfo>>,
    GithubIntegration: '' as Ref<Class<GithubIntegration>>,
    GithubPullRequest: '' as Ref<Class<GithubPullRequest>>,
    GithubAuthentication: '' as Ref<Class<GithubAuthentication>>,
    GithubIntegrationRepository: '' as Ref<Class<GithubIntegrationRepository>>,
    GithubPatch: '' as Ref<Class<GithubPatch>>,
    GithubUserInfo: '' as Ref<Class<GithubUserInfo>>,

    GithubPullRequestReview: '' as Ref<Class<GithubPullRequestReview>>,
    GithubReview: '' as Ref<Class<GithubReview>>,
    GithubReviewThread: '' as Ref<Class<GithubReviewThread>>,
    GithubReviewComment: '' as Ref<Class<GithubReviewComment>>
  },
  mixin: {
    GithubIssue: '' as Ref<Mixin<GithubIssue>>,
    GithubProject: '' as Ref<Mixin<GithubProject>>,
    GithubMilestone: '' as Ref<Mixin<GithubMilestone>>,
    GithubComponent: '' as Ref<Mixin<GithubComponent>>,
    GithubUser: '' as Ref<Mixin<GithubUser>>,
    GithubTodo: '' as Ref<Mixin<GithubTodo>>
  },
  icon: {
    Github: '' as Asset,
    GithubRepository: '' as Asset,
    PullRequest: '' as Asset,
    PullRequestMerged: '' as Asset,
    PullRequestClosed: '' as Asset,
    Forks: '' as Asset
  },
  component: {
    ConnectApp: '' as AnyComponent
  },
  metadata: {
    GithubApplication: '' as Metadata<string>,
    GithubClientID: '' as Metadata<string>,
    GithubURL: '' as Metadata<string>
  },
  descriptors: {
    PullRequest: '' as Ref<TaskTypeDescriptor>,
    GithubProject: '' as Ref<ProjectTypeDescriptor>
  },
  string: {
    Issue: '' as IntlString,
    PullRequest: '' as IntlString,
    IssueConnectedActivityInfo: '' as IntlString,
    PullRequestConnectedActivityInfo: '' as IntlString,
    PullRequestMergedActivityInfo: '' as IntlString,
    AuthenticatedWithGithub: '' as IntlString,
    AuthenticationRevokedGithub: '' as IntlString,
    AuthenticatedWithGithubEmployee: '' as IntlString,
    AuthenticatedWithGithubRequired: '' as IntlString,
    Suspended: '' as IntlString
  }
})
