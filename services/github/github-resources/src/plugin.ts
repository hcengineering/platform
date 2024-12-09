//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { type IntlString, mergeIds } from '@hcengineering/platform'

import github, { githubId } from '@hcengineering/github'
import { type Ref } from '@hcengineering/core'
import { type Handler, type IntegrationType } from '@hcengineering/setting'
import { type AnyComponent } from '@hcengineering/ui'

export default mergeIds(githubId, github, {
  string: {
    Github: '' as IntlString,
    GithubDesc: '' as IntlString,
    Settings: '' as IntlString,
    Connect: '' as IntlString,
    Configure: '' as IntlString,
    InstallApp: '' as IntlString,
    NoIntegrationsConfigured: '' as IntlString,
    ConnectionPending: '' as IntlString,
    Repository: '' as IntlString,
    NoRepository: '' as IntlString,
    RepositoryInfo: '' as IntlString,
    WithoutRepository: '' as IntlString,
    RepositoryIn: '' as IntlString,
    AssignRepository: '' as IntlString,
    CreateGithubIssue: '' as IntlString,
    PullRequests: '' as IntlString,
    ChangedFiles: '' as IntlString,
    ReviewedFiles: '' as IntlString,
    All: '' as IntlString,
    Active: '' as IntlString,
    Closed: '' as IntlString,
    Authorize: '' as IntlString,
    ReAuthorize: '' as IntlString,
    PleaseConnectToProject: '' as IntlString,
    ConnectProject: '' as IntlString,
    Enable: '' as IntlString,
    Disable: '' as IntlString,
    Disabled: '' as IntlString,
    ProjectsInSync: '' as IntlString,
    ProjectsConfig: '' as IntlString,
    AuthorizeAs: '' as IntlString,
    PleaseAuthorizeAs: '' as IntlString,
    Integrations: '' as IntlString,
    Options: '' as IntlString,
    Projects: '' as IntlString,
    OnlyOrganizationError: '' as IntlString,
    IssueRepositoryTarget: '' as IntlString,
    ComponentForRepository: '' as IntlString,
    SyncEnabled: '' as IntlString,
    ReviewPending: '' as IntlString,
    ReviewCommented: '' as IntlString,
    ReviewApproved: '' as IntlString,
    ReviewChangesRequested: '' as IntlString,
    ReviewDismissed: '' as IntlString,

    Conflict: '' as IntlString,
    ReadyForMerge: '' as IntlString,
    PROpen: '' as IntlString,
    PRMerged: '' as IntlString,
    PRClosed: '' as IntlString,

    InfoLogin: '' as IntlString,

    Processing: '' as IntlString,
    AutoClose: '' as IntlString,
    RequestFailed: '' as IntlString,
    CloseTab: '' as IntlString,
    PleaseRetry: '' as IntlString,
    Updated: '' as IntlString,
    LinkToProject: '' as IntlString,
    UnlinkFromProject: '' as IntlString,
    LinkedWith: '' as IntlString,

    UnlinkRepository: '' as IntlString,
    UnlinkMessage: '' as IntlString,
    UnlinkInstallationTitle: '' as IntlString,
    UnlinkInstallation: '' as IntlString,
    RemoveInstallation: '' as IntlString,
    SelectWorkspaceToInstallApp: '' as IntlString,
    SelectWorkspaceToInstallAppMsg: '' as IntlString,
    Uninstall: '' as IntlString
  },
  component: {
    GithubIcon: '' as AnyComponent,
    EditPullRequest: '' as AnyComponent,
    PullRequests: '' as AnyComponent,
    RepositoryPresenter: '' as AnyComponent,
    RepositoryPresenterRef: '' as AnyComponent,
    RepositoryPresenterRefEditor: '' as AnyComponent,
    GithubIssueInfo: '' as AnyComponent,
    GithubIssueInfoHeader: '' as AnyComponent,
    GithubIssuePresenter: '' as AnyComponent
  },
  handler: {
    DisconnectHandler: '' as Handler
  },
  integrationType: {
    Github: '' as Ref<IntegrationType>
  }
})
