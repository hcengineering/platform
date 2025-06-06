import {
  GithubIssueStateReason,
  GithubPullRequestReviewState,
  GithubPullRequestState,
  GithubReviewDecisionState,
  PullRequestMergeable
} from '@hcengineering/github'

export const assigneesField = `
  assignees(first: 10) {
    nodes {
      id
      login
      name
      email
      avatarUrl
    }
  }
`
export const authorField = `
  author {
    login
    ... on User {
      id
      email
      name
    }
    avatarUrl
  }
`
export const labelsField = `
  labels(first: 50) {
    nodes {
      id
      name
      color
      description
    }
  }
`
export const participantsField = `
  participants(first: 50) {
    nodes {
      id
      login
    }
  }
`
export const reactionsField = `
  reactions(first: 50) {
    nodes {
      content
      createdAt
      id
      user {
        login
      }
    }
  }
`

/**
 * @public
 */
export interface UserInfo {
  id: string
  login: string
  name: string
  email?: string
  avatarUrl?: string
}

/**
 * @public
 */
export const issueDetails = (stateReason: boolean): string => `
body
closed
closedAt
${authorField}
${assigneesField}
createdAt
createdViaEmail
id
${labelsField}
locked
number
${participantsField}
state
${stateReason ? 'stateReason' : ''}
title
updatedAt
url
${reactionsField}
lastEditedAt
publishedAt
`

/**
 * @public
 */
export interface IssueExternalData {
  closed: boolean
  closedAt?: string // Date UTCZ
  author: UserInfo
  assignees: {
    nodes: UserInfo[]
  }
  createdAt: string
  body: string
  createdViaEmail?: boolean
  id: string
  labels: {
    nodes: {
      id: string
      name: string
      color: string
      description: string
    }[]
  }
  locked: boolean
  number: number
  participants: {
    nodes: UserInfo[]
  }
  state: 'CLOSED' | 'OPEN' | 'MERGED'
  stateReason?: GithubIssueStateReason | null
  title: string
  updatedAt: string
  url: string
  reactions: {
    nodes: {
      content: string
      createdAt: string
      id: string
      user: {
        login: string
      }
    }[]
  }
  lastEditedAt: string
  publishedAt: string
}

/**
 * @public
 */
export interface GithubCommit {
  additions: number
  authoredDate: string
  authoredByCommitter: boolean
  changedFiles: number
  commitUrl: string
  deletions: number
  id: string
  message: string
  messageBody: string
  oid: string
  pushedDate: string | null
  signature: {
    email?: string
    state: string
  }
  url: string
  committedDate: string | null
  status: {
    state: CommitStatus
    id: string
  }
}
/**
 * @public
 */
export enum GithubPatchStatus {
  ADDED = 'ADDED',
  // The file was added. Git status 'A'.
  DELETED = 'DELETED',
  // The file was deleted. Git status 'D'.
  RENAMED = 'RENAMED',
  // The file was renamed. Git status 'R'.
  COPIED = 'COPIED',
  // The file was copied. Git status 'C'.
  MODIFIED = 'MODIFIED',
  // The file's contents were changed. Git status 'M'.
  CHANGED = 'CHANGED'
  // The file's type was changed. Git status 'T'.
}
/**
 * @public
 */
export enum CommitStatus {
  EXPECTED = 'EXPECTED',
  // Status is expected.
  ERROR = 'ERROR',
  // Status is errored.
  FAILURE = 'FAILURE',
  // Status is failing.
  PENDING = 'PENDING',
  // Status is pending.
  SUCCESS = 'SUCCESS'
  // Status is successful.
}

export type PullRequestReviewState = 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED'

export type AuthorAssociationType =
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'MANNEQUIN'
  | 'MEMBER'
  | 'NONE'
  | 'OWNER'

export type MinimizeReason = 'abuse' | 'off-topic' | 'outdated' | 'resolved' | 'duplicate' | 'spam'

export interface Review {
  id: string
  url: string

  state: PullRequestReviewState
  author: UserInfo

  body: string

  createdAt: string
  updatedAt: string | null
  publishedAt: string | null
  lastEditedAt: string | null
  submittedAt: string | null

  isMinimized: boolean | null
  minimizedReason: MinimizeReason

  authorAssociation: AuthorAssociationType

  comments: {
    totalCount: number
    nodes: {
      url: string
    }[]
  }
}

export interface ReviewThread {
  id: string
  line: number
  subjectType: 'LINE' | 'FILE'
  startLine: number
  isOutdated: boolean
  isResolved: boolean
  diffSide: 'LEFT' | 'RIGHT'
  isCollapsed: boolean
  originalLine: number
  originalStartLine: number | null
  path: string
  startDiffSide: 'LEFT' | 'RIGHT' | null
  resolvedBy: UserInfo | null
  comments: {
    totalCount: number
    nodes: ReviewComment[]
  }
}
export interface ReviewComment {
  id: string
  url: string
  body: string
  createdAt: string
  updatedAt: string | null
  publishedAt: string | null
  draftedAt: string | null
  lastEditedAt: string | null
  outdated: boolean
  includesCreatedEdit: boolean
  isMinimized: boolean
  minimizedReason: MinimizeReason
  line: number | null
  startLine: number | null
  originalLine: number | null
  originalStartLine: number | null
  diffHunk: string | null
  path: string
  replyTo: {
    url: string
  } | null
  author: UserInfo

  pullRequestReview: {
    url: string
    state: PullRequestReviewState
    author: UserInfo
  }
}
/**
 * @public
 */
export interface PullRequestExternalData extends IssueExternalData {
  isDraft: boolean
  additions: number
  deletions: number
  changedFiles: number
  commits: {
    nodes: {
      commit: GithubCommit
    }[]
  }
  headRefName: string
  headRefOid: string

  merged: boolean
  mergedAt?: string | null
  mergeable: PullRequestMergeable
  mergedBy?: UserInfo
  state: 'OPEN' | 'CLOSED' | 'MERGED'

  reviewDecision: 'CHANGES_REQUESTED' | 'APPROVED' | 'REVIEW_REQUIRED'
  headRef: {
    name: string
    id: string
    prefix: string
  }
  baseRef: {
    name: string
    id: string
    prefix: string
  }
  reviews: {
    totalCount: number
    nodes: Review[]
  }
  reviewThreads: {
    totalCount: number
    nodes: ReviewThread[]
  }

  latestReviews: {
    totalCount: number
    nodes: Review[]
  }
  reviewRequests: {
    totalCount: number
    nodes: {
      requestedReviewer: UserInfo
    }[]
  }
  files: {
    totalCount: number
    nodes: {
      additions: number
      changeType: GithubPatchStatus
      deletions: number
      path: string
    }[]
  }
}

/**
 * @public
 */
export const pullRequestCommits = `
commits(first: 50) {
  nodes {
    commit {
      additions
      authoredDate
      authoredByCommitter
      changedFiles
      commitUrl
      deletions
      id
      message
      messageBody
      oid
      pushedDate
      signature {
        email
        state
      }
      url
      committedDate
      status {
        state
        id
      }
    }
  }
}`

export const reviewDetailsNoComments = `
    state
    author {
      login
      url
      ... on User {
        id
        email
        avatarUrl
        login
        name
      }
    }
    url
    body
    createdAt
    updatedAt
    id
    isMinimized
    minimizedReason
    authorAssociation
    lastEditedAt
    publishedAt
    resourcePath
    submittedAt`

export const reviewDetails = `
    ${reviewDetailsNoComments}
    comments(first: 50) {
      nodes {
        url
      }
    }
`

export const reviewsDescr = `
reviews(first: 50, states:[PENDING, COMMENTED, APPROVED, CHANGES_REQUESTED, DISMISSED]) {
  totalCount
  nodes {
    ${reviewDetails}
  }
}
`

export const reviewCommentDetails = `
id
url
body
createdAt
updatedAt
publishedAt
draftedAt
outdated
lastEditedAt
includesCreatedEdit
isMinimized
minimizedReason
line
startLine
originalLine
originalStartLine
diffHunk
path
pullRequestReview {
  url
  state
  author {
    login
    url
    ... on User {
      id
      email
      avatarUrl
      login
      name
    }
  }
}
replyTo {
  url
}
author {
 avatarUrl
  login
  resourcePath
  url
}
`

export const reviewThreadDetails = `
id
subjectType
line
startLine
isOutdated
isResolved
diffSide
isCollapsed
originalLine
originalStartLine
path
startDiffSide
resolvedBy {
  url
  login
  id
  name
  email
  avatarUrl
}
comments(first: 50) {
  totalCount
  nodes {
   ${reviewCommentDetails}
  }
}
`

export const reviewRequestsDescr = `
reviewThreads(first: 90) {
  totalCount
  nodes {
    __typename
   ${reviewThreadDetails}
  }
}
`

/**
 * @public
 */
export const pullRequestDetails = `
${issueDetails(false)}
isDraft
additions
deletions
changedFiles
${pullRequestCommits}
headRefName
headRefOid
merged
mergedAt
mergeable
state
reviewDecision
headRef {
  name
  id
  prefix
}
baseRef {
   name
  id
  prefix
}
mergedBy {
  login
  url
  ... on User {
    id
    email
    avatarUrl
    login
    name
  }
}
${reviewsDescr}
${reviewRequestsDescr}
latestReviews(first: 50) {
  totalCount
  nodes {
    ${reviewDetailsNoComments}
  }
}
reviewRequests(first: 50) {
  totalCount
  nodes {
    requestedReviewer {
      __typename
      ... on User {
        login
        avatarUrl
        name
        email
      }
    }
  }
}
files(first: 100) {
  totalCount
  nodes {
    additions
    changeType
    deletions
    path
  }
}
`

/**
 * @public
 */
export const projectValue = `project {
  id
  url
  number
}`

/**
 * @public
 */
export const fieldValues = `fieldValues(first: 50) {
  nodes {
    ... on ProjectV2ItemFieldDateValue {
      id
      date
      field {
        ... on ProjectV2Field {
          id
          name
          dataType
        }
      }
    }
    ... on ProjectV2ItemFieldNumberValue {
      id
      number
      field {
        ... on ProjectV2Field {
          id
          name
          dataType
        }
      }
    }
    ... on ProjectV2ItemFieldSingleSelectValue {
      id
      name
      color
      description
      optionId
      field {
        ... on ProjectV2SingleSelectField {
          id
          name
          dataType
        }
      }
    }
    ... on ProjectV2ItemFieldTextValue {
      id
      text
      field {
        ... on ProjectV2Field {
          id
          name
          dataType
        }
      }
    }
  }
}`

/**
 * @public
 */
export const supportedGithubTypes = new Set(['TEXT', 'NUMBER', 'DATA', 'SINGLE_SELECT'])

export function toPRState (state: PullRequestExternalData['state']): GithubPullRequestState {
  switch (state) {
    case 'OPEN':
      return GithubPullRequestState.open
    case 'CLOSED':
      return GithubPullRequestState.closed
    case 'MERGED':
      return GithubPullRequestState.merged
  }
}
export function toReviewState (state: PullRequestReviewState): GithubPullRequestReviewState {
  switch (state) {
    case 'PENDING':
      return GithubPullRequestReviewState.Pending
    case 'COMMENTED':
      return GithubPullRequestReviewState.Commented
    case 'APPROVED':
      return GithubPullRequestReviewState.Approved
    case 'CHANGES_REQUESTED':
      return GithubPullRequestReviewState.ChangesRequested
    case 'DISMISSED':
      return GithubPullRequestReviewState.Dismissed
  }
}
export function toReviewDecision (reviewDecision: PullRequestExternalData['reviewDecision']): GithubReviewDecisionState {
  switch (reviewDecision) {
    case 'APPROVED':
      return GithubReviewDecisionState.Approved
    case 'REVIEW_REQUIRED':
      return GithubReviewDecisionState.ReviewRequired
    case 'CHANGES_REQUESTED':
      return GithubReviewDecisionState.ChangesRequested
  }
}

export function getUpdatedAtReviewThread (review: ReviewThread): number {
  const value = review.comments.nodes
    .map((it) => it.updatedAt)
    .filter((it) => it != null)
    .map((it) => new Date(it).getTime())
    .reduce((prev, it) => (it > prev ? it : prev), 0)
  if (value === 0) {
    return Date.now()
  }
  return value
}
