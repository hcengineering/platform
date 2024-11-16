//
// Copyright © 2023 Hardcore Engineering Inc.
//

import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeAny,
  TypeBoolean,
  TypeDate,
  TypeHyperlink,
  TypeMarkup,
  TypeNumber,
  TypeRecord,
  TypeRef,
  TypeString,
  UX,
  type Builder
} from '@hcengineering/model'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import github from './plugin'

import {
  DateRangeMode,
  IndexKind,
  type Account,
  type Class,
  type Data,
  type Doc,
  type Domain,
  type Hyperlink,
  type Markup,
  type Ref,
  type Timestamp
} from '@hcengineering/core'

import { type Person } from '@hcengineering/contact'
import contact, { TContact } from '@hcengineering/model-contact'
import presentation from '@hcengineering/model-presentation'
import tracker, { TComponent, TIssue, TMilestone, TProject, issuesOptions } from '@hcengineering/model-tracker'
import view, { classPresenter } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { getEmbeddedLabel } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import tags from '@hcengineering/tags'
import task from '@hcengineering/task'
import {
  type DocSyncInfo,
  type GithubAuthentication,
  type GithubComponent,
  type GithubFieldMapping,
  type GithubIntegration,
  type GithubIntegrationRepository,
  type GithubIssue,
  type GithubMilestone,
  type GithubPatch,
  type GithubProject,
  type GithubPullRequest,
  type GithubPullRequestFileReview,
  type GithubPullRequestReview,
  type GithubPullRequestReviewState,
  type GithubPullRequestState,
  type GithubRepositoryRef,
  type GithubReview,
  type GithubReviewComment,
  type GithubReviewDecisionState,
  type GithubReviewThread,
  type GithubTodo,
  type GithubUser,
  type GithubUserInfo,
  type LastReviewState,
  type MinimizeReason,
  type PullRequestMergeable
} from '@hcengineering/github'

import { generateClassNotificationTypes } from '@hcengineering/model-notification'

import { type ActivityMessageControl } from '@hcengineering/activity'
import activity, { TActivityMessage } from '@hcengineering/model-activity'
import attachment, { TAttachment } from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import { TPreference } from '@hcengineering/model-preference'
import { TToDO } from '@hcengineering/model-time'
import notification from '@hcengineering/notification'
import { DOMAIN_PREFERENCE } from '@hcengineering/preference'
import time from '@hcengineering/time'

export { githubId } from '@hcengineering/github'
export { githubOperation, githubOperationPreTime } from './migration'
export { default } from './plugin'
export const DOMAIN_GITHUB = 'github' as Domain
export const DOMAIN_GITHUB_COMMENTS = 'github_comments' as Domain

@Model(github.class.DocSyncInfo, core.class.Doc, DOMAIN_GITHUB)
export class TDocSyncInfo extends TDoc implements DocSyncInfo {
  // _id === objectId
  @Prop(TypeNumber(), getEmbeddedLabel('Github number'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    githubNumber!: number

  @Prop(TypeString(), getEmbeddedLabel('URL'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    url!: string

  @Prop(TypeString(), getEmbeddedLabel('Parent URL'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    parent!: string

  @Prop(TypeNumber(), getEmbeddedLabel('ID'))
  @ReadOnly()
    id!: number

  @Prop(TypeString(), getEmbeddedLabel('ObjectClass'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>

  external!: Record<string, any>

  @Prop(TypeString(), getEmbeddedLabel('Sync request'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    needSync!: string

  @Prop(TypeString(), getEmbeddedLabel('External Sync request'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    externalVersion!: string

  @Prop(TypeString(), getEmbeddedLabel('Derived request'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    derivedVersion!: string

  @Prop(TypeRef(github.class.GithubIntegrationRepository), getEmbeddedLabel('Repository'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    repository!: Ref<GithubIntegrationRepository> | null

  @Prop(TypeString(), getEmbeddedLabel('Deleted flag'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    deleted!: boolean
}

@Model(github.class.GithubUserInfo, core.class.Doc, DOMAIN_GITHUB)
export class TGithubUserInfo extends TDoc implements GithubUserInfo {
  @Prop(TypeString(), getEmbeddedLabel('ID'))
  @ReadOnly()
    id!: string

  @Prop(TypeString(), getEmbeddedLabel('login'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    login!: string

  @Prop(TypeString(), getEmbeddedLabel('email'))
  @ReadOnly()
  @Index(IndexKind.Indexed)
    email!: string

  @Prop(TypeString(), getEmbeddedLabel('name'))
  @ReadOnly()
    name!: string

  @Prop(TypeString(), getEmbeddedLabel('avatarUrl'))
  @ReadOnly()
    avatarUrl!: string
}

@Model(github.class.GithubIntegration, core.class.Doc, DOMAIN_GITHUB)
@UX(github.string.Integrations)
export class TGithubIntegration extends TDoc implements GithubIntegration {
  // Unique identifier for the installation id, will be filled after installation redirect.
  installationId!: number
  clientId!: string

  // Technical details, will be filled by github integration service.
  @Prop(TypeString(), getEmbeddedLabel('Name'))
  @ReadOnly()
    name!: string // Organization or individual user name

  nodeId!: string

  @Prop(TypeBoolean(), getEmbeddedLabel('Alive'))
  @ReadOnly()
    alive!: boolean

  @Prop(Collection(github.class.GithubIntegrationRepository), getEmbeddedLabel('Repositories'))
  @ReadOnly()
    repositories!: number

  @Prop(TypeBoolean(), getEmbeddedLabel('User Project'))
    useProject!: boolean
}

@Model(github.class.GithubIntegrationRepository, core.class.AttachedDoc, DOMAIN_GITHUB)
export class TGithubIntegrationRepository extends TAttachedDoc implements GithubIntegrationRepository {
  @Prop(TypeString(), getEmbeddedLabel('Name'))
  @ReadOnly()
    name!: string

  @Prop(TypeNumber(), getEmbeddedLabel('Repository ID'))
  @ReadOnly()
    repositoryId!: number

  @Prop(TypeBoolean(), getEmbeddedLabel('Alive'))
  @ReadOnly()
    enabled!: boolean

  @Prop(TypeRef(github.mixin.GithubProject), getEmbeddedLabel('Repository'))
  @ReadOnly()
    githubProject!: Ref<GithubProject> | null

  @Prop(TypeNumber(), getEmbeddedLabel('ID'))
  @ReadOnly()
    id?: number

  @Prop(TypeRecord(), getEmbeddedLabel('Owner'))
  @ReadOnly()
    owner?: Data<GithubUserInfo>

  @Prop(TypeString(), getEmbeddedLabel('URL'))
  @ReadOnly()
    url?: string

  @Prop(TypeString(), getEmbeddedLabel('HTMLURL'))
  @ReadOnly()
    htmlURL?: string

  @Prop(TypeString(), getEmbeddedLabel('NodeID'))
  @ReadOnly()
    nodeId?: string

  @Prop(TypeString(), getEmbeddedLabel('Description'))
  @ReadOnly()
    description?: string

  @Prop(TypeBoolean(), getEmbeddedLabel('Is Fork'))
  @ReadOnly()
    fork!: boolean

  @Prop(TypeNumber(), getEmbeddedLabel('Forks'))
  @ReadOnly()
    forks!: number

  @Prop(TypeBoolean(), getEmbeddedLabel('Private'))
  @ReadOnly()
    private!: boolean

  @Prop(TypeNumber(), getEmbeddedLabel('Stars'))
  @ReadOnly()
    stargazers!: number

  @Prop(TypeBoolean(), getEmbeddedLabel('Has Issues'))
  @ReadOnly()
    hasIssues!: boolean

  @Prop(TypeBoolean(), getEmbeddedLabel('Has Projects'))
  @ReadOnly()
    hasProjects!: boolean

  @Prop(TypeBoolean(), getEmbeddedLabel('Has Downloads'))
  @ReadOnly()
    hasDownloads!: boolean

  @Prop(TypeBoolean(), getEmbeddedLabel('Has Pages'))
  @ReadOnly()
    hasPages!: boolean

  @Prop(TypeBoolean(), getEmbeddedLabel('Has Wiki'))
  @ReadOnly()
    hasWiki!: boolean

  @Prop(TypeBoolean(), getEmbeddedLabel('Has Discussions'))
  @ReadOnly()
    hasDiscussions!: boolean

  @Prop(TypeNumber(), getEmbeddedLabel('Open Issues'))
  @ReadOnly()
    openIssues!: number

  @Prop(TypeNumber(), getEmbeddedLabel('Watchers'))
  @ReadOnly()
    watchers!: number

  @Prop(TypeBoolean(), getEmbeddedLabel('Archived'))
  @ReadOnly()
    archived!: boolean

  @Prop(TypeNumber(), getEmbeddedLabel('Size'))
  @ReadOnly()
    size!: number

  @Prop(TypeString(), getEmbeddedLabel('Language'))
  @ReadOnly()
    language?: string

  @Prop(TypeString(), getEmbeddedLabel('Visibility'))
  @ReadOnly()
    visibility?: string
}

@Model(github.class.GithubAuthentication, core.class.Doc, DOMAIN_PREFERENCE)
export class TGithubAuthentication extends TPreference implements GithubAuthentication {
  code!: string
  token!: string
  expiresIn!: number // seconds
  refreshToken!: string
  refreshTokenExpiresIn!: number
  login!: string
  authorized!: boolean
  state!: string
  scope!: string
  error!: string | null

  avatar!: string
  email!: string
  bio!: string
  blog!: string
  company!: string
  createdAt!: Date
  updatedAt!: Date
  followers!: number
  following!: number
  gravatarId!: string
  location!: string
  url!: string
  name!: string
  nodeId!: string

  repositories!: number
  openIssues!: number
  closedIssues!: number
  openPRs!: number
  mergedPRs!: number
  closedPRs!: number
  repositoryDiscussions!: number
  starredRepositories!: number

  organizations!: GithubAuthentication['organizations']
}

@Mixin(github.mixin.GithubProject, tracker.class.Project)
@UX(github.string.Repository)
export class TGithubProject extends TProject implements GithubProject {
  @Prop(TypeRef(github.class.GithubIntegration), getEmbeddedLabel('Integration'))
  @ReadOnly()
  @Hidden()
    integration!: Ref<GithubIntegration>

  @Prop(ArrOf(TypeRef(github.class.GithubIntegrationRepository)), getEmbeddedLabel('Repositories'))
  @ReadOnly()
  @Hidden()
    repositories!: Ref<GithubIntegrationRepository>[]

  @Prop(TypeString(), getEmbeddedLabel('NodeID'))
  @ReadOnly()
  @Hidden()
    projectNodeId!: string

  @Prop(TypeNumber(), getEmbeddedLabel('Number'))
  @ReadOnly()
  @Hidden()
    projectNumber!: number

  @Prop(TypeRef(core.class.Class), getEmbeddedLabel('Attribute Class'))
  @ReadOnly()
  @Hidden()
    mixinClass!: Ref<Class<GithubIssue>>

  @Prop(ArrOf(TypeRecord()), getEmbeddedLabel('Field mappings'))
  @Hidden()
  // Mapping of all fields in this project.
    mappings!: GithubFieldMapping[]
}

@Mixin(github.mixin.GithubIssue, tracker.class.Issue)
@UX(github.string.GithubIssue, github.icon.Github)
export class TGithubIssue extends TIssue implements GithubIssue {
  @Prop(TypeHyperlink(), getEmbeddedLabel('Github URL'))
  @Index(IndexKind.FullText)
  @ReadOnly()
  @Hidden()
    url!: Hyperlink

  @Prop(TypeNumber(), tracker.string.Number)
  @Index(IndexKind.FullText)
  @ReadOnly()
  @Hidden()
    githubNumber!: number

  @Prop(TypeRef(github.class.GithubIntegrationRepository), getEmbeddedLabel('Repository'))
    repository!: Ref<GithubIntegrationRepository>
}

@Mixin(github.mixin.GithubTodo, time.class.ToDo)
export class TGithubTodo extends TToDO implements GithubTodo {
  purpose!: 'review' | 'fix'
}

@Mixin(github.mixin.GithubUser, contact.class.Contact)
@UX(github.string.GithubUser, github.icon.Github)
export class TGithubUser extends TContact implements GithubUser {
  @Prop(TypeHyperlink(), getEmbeddedLabel('Github URL'))
  @Index(IndexKind.FullText)
  @ReadOnly()
    url!: Hyperlink
}

@Mixin(github.mixin.GithubComponent, tracker.class.Component)
@UX(github.string.Repository, github.icon.Github)
export class TGithubComponent extends TComponent implements GithubComponent {
  @Prop(TypeRef(github.class.GithubIntegrationRepository), getEmbeddedLabel('Repository'))
  @ReadOnly()
  @Hidden()
    repository!: Ref<GithubIntegrationRepository>

  @Prop(TypeBoolean(), getEmbeddedLabel('Represent'))
  @ReadOnly()
  @Hidden()
    represent!: boolean
}

@Mixin(github.mixin.GithubMilestone, tracker.class.Milestone)
@UX(github.string.GithubIssue)
export class TGithubMilestone extends TMilestone implements GithubMilestone {
  @Prop(TypeHyperlink(), getEmbeddedLabel('Github URL'))
  @Index(IndexKind.FullText)
  @ReadOnly()
    url!: Hyperlink

  @Prop(TypeString(), getEmbeddedLabel('NodeID'))
  @ReadOnly()
    projectNodeId!: string

  @Prop(TypeNumber(), getEmbeddedLabel('Number'))
  @ReadOnly()
    projectNumber!: number

  @Prop(ArrOf(TypeRecord()), getEmbeddedLabel('Field mappings'))
  // Mapping of all fields in this project.
    mappings!: GithubFieldMapping[]
}

@Model(github.class.GithubPullRequest, tracker.class.Issue)
@UX(github.string.PullRequest, github.icon.PullRequest, undefined, undefined, undefined, github.string.PullRequests)
export class TGithubPullRequest extends TIssue implements GithubPullRequest {
  @Prop(ArrOf(TypeRef(contact.class.Person)), getEmbeddedLabel('Reviewers'))
    reviewers!: Ref<Person>[] | null

  @Prop(TypeRef(tracker.class.Project), tracker.string.Project, { icon: tracker.icon.Issues })
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare space: Ref<GithubProject>

  head!: GithubRepositoryRef
  base!: GithubRepositoryRef

  @Prop(TypeBoolean(), github.string.PRDraft)
  @ReadOnly()
    draft!: boolean

  @Prop(TypeDate(DateRangeMode.DATETIME), github.string.PRMergedAt)
  @ReadOnly()
    mergedAt!: Timestamp | null

  @Prop(TypeDate(DateRangeMode.DATETIME), github.string.PRClosedAt)
  @ReadOnly()
    closedAt!: Timestamp | null

  @Prop(TypeNumber(), github.string.PRFile)
  @ReadOnly()
  @Hidden()
    files!: number

  @Prop(TypeNumber(), github.string.PRCommit)
  @ReadOnly()
    commits!: number

  @Prop(TypeAny(github.component.MergeableValuePresenter, github.string.Mergeable), github.string.Mergeable)
  @ReadOnly()
    mergeable!: PullRequestMergeable

  @Prop(
    TypeAny(github.component.PullRequestStateValuePresenter, github.string.PullRequestMergeState),
    github.string.PullRequestMergeState
  )
  @ReadOnly()
    state!: GithubPullRequestState

  @Prop(
    TypeAny(github.component.PullRequestReviewDecisionValuePresenter, github.string.PullRequestReviewDecision),
    github.string.PullRequestReviewDecision
  )
  @ReadOnly()
  @Hidden()
    reviewDecision!: GithubReviewDecisionState

  latestReviews!: LastReviewState[]

  @Prop(Collection(github.class.GithubPullRequestReview), github.string.PRReview)
  @Hidden()
    reviews!: number

  @Prop(Collection(github.class.GithubReviewComment), getEmbeddedLabel('Review Comments'))
  @Hidden()
    reviewComments!: number
}

@Model(github.class.GithubPullRequestReview, core.class.AttachedDoc, DOMAIN_GITHUB)
export class TGithubPullRequestReview extends TAttachedDoc implements GithubPullRequestReview {
  declare attachedTo: Ref<GithubPullRequest>

  author!: Ref<Person>
  files!: GithubPullRequestFileReview[]
}

@Model(github.class.GithubReview, activity.class.ActivityMessage)
export class TGithubReview extends TActivityMessage implements GithubReview {
  @Prop(TypeString(), getEmbeddedLabel('State'))
    state!: GithubPullRequestReviewState

  @Prop(TypeMarkup(), getEmbeddedLabel('Body'))
    body!: Markup

  @Prop(ArrOf(TypeString()), getEmbeddedLabel('Comment refs'))
  // Urls of comments
    comments!: string[]
}

@Model(github.class.GithubReviewThread, activity.class.ActivityMessage)
export class TGithubReviewThread extends TActivityMessage implements GithubReviewThread {
  line!: number
  startLine!: number
  isOutdated!: boolean
  isResolved!: boolean
  diffSide!: 'LEFT' | 'RIGHT'
  isCollapsed!: boolean
  originalLine!: number
  originalStartLine!: number | null
  path!: string
  startDiffSide!: 'LEFT' | 'RIGHT' | null
  resolvedBy!: Ref<Account> | null
  threadId!: string
}

@Model(github.class.GithubReviewComment, core.class.AttachedDoc, DOMAIN_GITHUB_COMMENTS)
@UX(getEmbeddedLabel('Review Comment'))
export class TGithubReviewComment extends TAttachedDoc implements GithubReviewComment {
  reviewThreadId!: string
  declare attachedTo: Ref<GithubPullRequest> // Attached to review thread.
  url!: string // Used to identify comment for review, etc.
  reviewUrl!: string // A review url.

  @Prop(TypeMarkup(), getEmbeddedLabel('Body'))
    body!: Markup

  outdated!: boolean

  includesCreatedEdit!: boolean
  isMinimized!: boolean
  minimizedReason!: MinimizeReason

  line!: number | null
  startLine!: number | null
  originalLine!: number | null
  originalStartLine!: number | null
  diffHunk!: string | null
  path!: string

  replyToUrl!: string
}

@Model(github.class.GithubPatch, attachment.class.Attachment)
export class TGithubPatch extends TAttachment implements GithubPatch {}

export function createModel (builder: Builder): void {
  builder.createModel(
    TDocSyncInfo,
    TGithubIssue,
    TGithubIntegration,
    TGithubProject,
    TGithubPullRequest,
    TGithubPullRequestReview,
    TGithubReview,
    TGithubReviewThread,
    TGithubReviewComment,
    TGithubAuthentication,
    TGithubIntegrationRepository,
    TGithubPatch,
    TGithubUserInfo,
    TGithubMilestone,
    TGithubComponent,
    TGithubUser,
    TGithubTodo
  )

  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: github.string.Github,
      description: github.string.GithubDesc,
      icon: github.component.GithubIcon,
      allowMultiple: false,
      createComponent: github.component.Connect,
      configureComponent: github.component.Configure
    },
    github.integrationType.Github
  )

  builder.mixin(github.class.GithubPullRequest, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: github.component.PullRequestPresenter
  })

  builder.mixin(github.class.GithubPullRequest, core.class.Class, activity.mixin.ActivityDoc, {})

  classPresenter(
    builder,
    github.class.GithubIntegrationRepository,
    github.component.RepositoryPresenterRef,
    github.component.RepositoryPresenterRefEditor
  )

  builder.mixin(github.mixin.GithubIssue, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: github.component.GithubIssuePresenter
  })

  builder.mixin(github.class.GithubIntegrationRepository, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: github.component.RepositoryPresenter
  })

  builder.mixin(github.class.GithubPullRequest, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: github.component.PullRequestNotificationPresenter
  })

  builder.mixin(github.class.GithubPullRequest, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: github.component.EditPullRequest
  })

  builder.mixin(github.class.GithubPullRequest, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'assignee', 'reviewers']
  })

  builder.createDoc(presentation.class.DocCreateExtension, core.space.Model, {
    ofClass: tracker.class.Issue,
    apply: github.functions.UpdateIssue,
    getAnalyticsProps: github.functions.GetCreateIssueAnalyticsProps,
    components: {
      createButton: github.component.GithubIssueInfoHeader
    }
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: github.class.GithubPullRequest, // Since it extends class, configuration will be merged with Issues;s one.
      descriptor: view.viewlet.List,
      viewOptions: issuesOptions(false),
      configOptions: {
        strict: true,
        hiddenKeys: [
          'title',
          'blockedBy',
          'relations',
          'description',
          'number',
          'reportedTime',
          'reports',
          'priority',
          'component',
          'milestone',
          'estimation',
          'remainingTime',
          'status',
          'dueDate',
          'attachedTo',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: [
        {
          key: '',
          label: tracker.string.Priority,
          presenter: tracker.component.PriorityEditor,
          props: { type: 'priority', kind: 'list', size: 'small' },
          displayProps: { key: 'priority' }
        },
        {
          key: '',
          label: tracker.string.Identifier,
          presenter: tracker.component.IssuePresenter,
          displayProps: { key: 'issue', fixed: 'left' }
        },
        {
          key: '',
          label: tracker.string.Status,
          presenter: tracker.component.StatusEditor,
          props: { kind: 'list', size: 'small', justify: 'center' },
          displayProps: { key: 'status' }
        },
        {
          key: '',
          label: github.string.Mergeable,
          presenter: github.component.PullRequestMergeState,
          props: { small: true },
          displayProps: { key: 'merge_state' }
        },
        {
          key: '',
          label: tracker.string.Title,
          presenter: github.component.TitlePresenter,
          props: { shouldUseMargin: true, showParent: false },
          displayProps: { key: 'title' }
        },
        {
          key: '',
          label: tracker.string.SubIssues,
          presenter: tracker.component.SubIssuesSelector,
          props: {}
        },
        { key: 'comments', displayProps: { key: 'comments', suffix: true } },
        { key: 'attachments', displayProps: { key: 'attachments', suffix: true } },
        { key: '', displayProps: { grow: true } },
        {
          key: 'labels',
          presenter: tags.component.LabelsPresenter,
          displayProps: { compression: true },
          props: { kind: 'list', full: false }
        },
        {
          key: '',
          label: getEmbeddedLabel('*'),
          presenter: tracker.component.IssueExtra,
          displayProps: { compression: true },
          props: { kind: 'list', full: false }
        },
        {
          key: '',
          label: tracker.string.Milestone,
          presenter: tracker.component.MilestoneEditor,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false
          },
          displayProps: {
            key: 'milestone',
            excludeByKey: 'milestone',
            compression: true
          }
        },
        {
          key: '',
          label: tracker.string.Component,
          presenter: tracker.component.ComponentEditor,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false
          },
          displayProps: {
            key: 'component',
            excludeByKey: 'component',
            compression: true
          }
        },
        {
          key: '',
          label: tracker.string.DueDate,
          presenter: tracker.component.DueDatePresenter,
          displayProps: { key: 'dueDate', compression: true },
          props: { kind: 'list' }
        },
        {
          key: '',
          label: tracker.string.Estimation,
          presenter: tracker.component.EstimationEditor,
          props: { kind: 'list', size: 'small' },
          displayProps: { key: 'estimation', fixed: 'left', dividerBefore: true, optional: true }
        },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { key: 'submodified', fixed: 'left', dividerBefore: true }
        },
        {
          key: '',
          presenter: tracker.component.AssigneeEditor,
          displayProps: { key: 'assignee', fixed: 'right' },
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
        }
      ],
      options: {
        lookup: {
          space: tracker.class.Project
        }
      }
    },
    github.viewlet.PullRequests
  )

  builder.createDoc(workbench.class.ApplicationNavModel, core.space.Model, {
    extends: tracker.app.Tracker,
    spaces: [
      {
        id: 'projects',
        spaceClass: tracker.class.Project,
        specials: [
          {
            id: 'pulls',
            label: github.string.PullRequests,
            icon: tracker.icon.Issue,
            visibleIf: github.functions.ShowForRepositoryOnly,
            component: github.component.PullRequests,
            componentProps: {
              title: github.string.PullRequests,
              config: [
                ['all', github.string.All, {}],
                ['active', github.string.Active, {}],
                ['closed', github.string.Closed, {}]
              ]
            }
          }
        ]
      }
    ]
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: github.string.Github,
      icon: github.icon.Github,
      objectClass: github.class.GithubPullRequest
    },
    github.ids.GithubNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: task.string.AssignedToMe,
      group: github.ids.GithubNotificationGroup,
      field: 'assignee',
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: github.class.GithubPullRequest,
      templates: {
        textTemplate: 'Pull request {doc} was assigned to you by {sender}',
        htmlTemplate: '<p>Pull request {doc} was assigned to you by {sender}</p>',
        subjectTemplate: 'Pull request {doc} was assigned to you'
      },
      defaultEnabled: true
    },
    github.ids.AssigneeNotification
  )

  generateClassNotificationTypes(
    builder,
    github.class.GithubPullRequest,
    github.ids.GithubNotificationGroup,
    [],
    ['comments', 'status', 'assignee', 'milestone']
  )

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: tracker.extensions.IssueListHeader,
    component: github.component.AuthenticationCheck
  })

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: tracker.extensions.EditIssueHeader,
    component: github.component.AuthenticationCheck,
    props: {
      kind: 'ghost'
    }
  })

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: tracker.extensions.EditIssueTitle,
    component: github.component.PullRequestMergeState,
    props: {
      kind: 'ghost'
    }
  })

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: tracker.extensions.EditIssueTitle,
    component: github.component.GithubIssueHeader,
    props: {
      kind: 'ghost'
    }
  })

  builder.mixin(github.class.GithubPullRequest, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, task.action.Move, tracker.action.MoveToProject]
  })

  builder.createDoc(presentation.class.DocRules, core.space.Model, {
    ofClass: tracker.class.Issue,
    fieldRules: [
      {
        field: 'assignee',
        query: {},
        mixin: github.mixin.GithubIssue,
        fieldQuery: {
          [github.mixin.GithubUser + '.url']: { $exists: true }
        },
        fieldQueryFill: {},
        allowConflict: false,
        disableUnset: true,
        disableEdit: true
      }
    ]
  })

  builder.mixin(github.class.DocSyncInfo, core.class.Class, core.mixin.IndexConfiguration, {
    indexes: [],
    searchDisabled: true
  })

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: github.class.GithubPullRequest,
      label: chunter.string.LeftComment
    },
    github.ids.GitHubPullRequestChatMessageViewlet
  )

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: github.class.GithubPullRequest,
    components: {
      input: { component: chunter.component.ChatMessageInput }
    }
  })

  builder.createDoc(
    task.class.ProjectTypeDescriptor,
    core.space.Model,
    {
      baseClass: github.mixin.GithubProject,
      description: github.string.GithubDesc,
      icon: github.icon.Github,
      name: github.string.Github,
      availablePermissions: [core.permission.ForbidDeleteObject]
    },
    github.descriptors.GithubProject
  )

  builder.createDoc(
    task.class.TaskTypeDescriptor,
    core.space.Model,
    {
      baseClass: github.class.GithubPullRequest,
      allowCreate: false,
      description: github.string.PullRequest,
      icon: github.icon.PullRequest,
      name: github.string.Github
    },
    github.descriptors.PullRequest
  )

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      title: github.string.PullRequests,
      icon: github.icon.PullRequest,
      label: github.string.PullRequests,
      query: tracker.completion.IssueQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: github.class.GithubPullRequest,
      priority: 280
    },
    github.completion.PullRequestCategory
  )

  // Activity filters

  // We should skip activity github mixin stuff.
  builder.createDoc(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: tracker.class.Issue,
    skip: [{ _class: core.class.TxMixin, mixin: github.mixin.GithubIssue }]
  })

  builder.createDoc(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: contact.class.Person,
    skip: [{ _class: core.class.TxMixin, mixin: github.mixin.GithubUser }]
  })

  builder.mixin(github.class.GithubReviewComment, core.class.Class, activity.mixin.IgnoreActivity, {})
  builder.mixin(github.class.GithubPullRequestReview, core.class.Class, activity.mixin.IgnoreActivity, {})
  builder.mixin(github.class.GithubReview, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: github.component.GithubReviewPresenter
  })

  builder.mixin(github.class.GithubReviewThread, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: github.component.GithubReviewThreadPresenter
  })

  builder.createDoc<ActivityMessageControl<GithubPullRequest>>(
    activity.class.ActivityMessageControl,
    core.space.Model,
    {
      objectClass: github.class.GithubPullRequest,
      skip: [],
      skipFields: [
        'head',
        'base',
        'mergedAt',
        'closedAt',
        'commits',
        'mergeable',
        'reviews',
        'reviewComments',
        'latestReviews',
        'reviewDecision',
        'state'
      ]
    }
  )

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: github.class.GithubPullRequest,
    action: 'update',
    icon: github.icon.PullRequest,
    config: {
      status: {
        iconPresenter: tracker.component.IssueStatusIcon
      },
      priority: {
        iconPresenter: tracker.component.PriorityIconPresenter
      },
      estimation: {
        icon: tracker.icon.Estimation
      }
    }
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_GITHUB,
    disabled: [
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { attachedToClass: 1 },
      { createdOn: -1 },
      { repository: 1 },
      { deleted: 1 },
      { githubNumber: 1 }
    ]
  })
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_GITHUB_COMMENTS,
    disabled: [{ modifiedOn: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { attachedToClass: 1 }, { createdOn: -1 }]
  })
}
