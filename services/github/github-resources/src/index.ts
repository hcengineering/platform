//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { type Data, type Ref, type Space, type TxOperations } from '@hcengineering/core'
import { type Resources } from '@hcengineering/platform'
import {
  getClient,
  type DocCreateFunction,
  type DocCreatePhase,
  type DocCreateAnalyticsPropsFunction
} from '@hcengineering/presentation'
import tracker, { type Issue } from '@hcengineering/tracker'
import { type GithubIntegrationRepository } from '@hcengineering/github'
import AuthenticationCheck from './components/AuthenticationCheck.svelte'
import GithubIssueHeader from './components/GithubIssueHeader.svelte'
import Configure from './components/Configure.svelte'
import Connect from './components/Connect.svelte'
import ConnectApp from './components/ConnectApp.svelte'
import EditPullRequest from './components/EditPullRequest.svelte'
import GithubIcon from './components/GithubIcon.svelte'
import GithubIssueInfo from './components/GithubIssueInfo.svelte'
import GithubIssueInfoHeader from './components/GithubIssueInfoHeader.svelte'
import PullRequestMergeState from './components/PullRequestMergeState.svelte'
import PullRequests from './components/PullRequests.svelte'
import RepositoryPresenterRef from './components/RepositoryPresenterRef.svelte'
import RepositoryPresenterRefEditor from './components/RepositoryPresenterRefEditor.svelte'
import GithubReviewPresenter from './components/presenters/GithubReviewPresenter.svelte'
import GithubReviewThreadPresenter from './components/presenters/GithubReviewThreadPresenter.svelte'
import MergeableValuePresenter from './components/presenters/MergeableValuePresenter.svelte'
import PullRequestNotificationPresenter from './components/presenters/PullRequestNotificationPresenter.svelte'
import PullRequestPresenter from './components/presenters/PullRequestPresenter.svelte'
import PullRequestReviewDecisionValuePresenter from './components/presenters/PullRequestReviewDecisionValuePresenter.svelte'
import PullRequestStateValuePresenter from './components/presenters/PullRequestStateValuePresenter.svelte'
import RepositoryPresenter from './components/presenters/RepositoryPresenter.svelte'
import TitlePresenter from './components/presenters/TitlePresenter.svelte'
import GithubIssuePresenter from './components/presenters/GithubIssuePresenter.svelte'
import github from './plugin'

async function updateIssue (
  client: TxOperations,
  id: Ref<Issue>,
  space: Space,
  issue: Data<Issue>,
  settings: Record<string, any>,
  phase: DocCreatePhase
): Promise<void> {
  // We should add mixin only in post phase.
  if (client.getHierarchy().hasMixin(space, github.mixin.GithubProject) && phase === 'post') {
    // No actions required for now.
    await client.createMixin(id, tracker.class.Issue, space._id, github.mixin.GithubIssue, {
      githubNumber: 0,
      repository: settings.repository as Ref<GithubIntegrationRepository>,
      url: ''
    })
  }
}

function getCreateIssueAnalyticsProps (
  space: Space,
  issue: Data<Issue>,
  settings: Record<string, any>
): Record<string, any> {
  const hierarchy = getClient().getHierarchy()
  if (hierarchy.hasMixin(space, github.mixin.GithubProject)) {
    const repository = settings.repository as Ref<GithubIntegrationRepository>
    if (repository == null) return {}

    return {
      github: true,
      githubRepository: repository
    }
  }

  return {}
}

export default async (): Promise<Resources> => ({
  component: {
    Connect,
    Configure,
    GithubIcon,
    ConnectApp,
    PullRequestPresenter,
    PullRequestNotificationPresenter,
    PullRequests,
    EditPullRequest,
    GithubReviewPresenter,
    GithubReviewThreadPresenter,
    TitlePresenter,
    RepositoryPresenter,
    RepositoryPresenterRef,
    RepositoryPresenterRefEditor,
    AuthenticationCheck,
    GithubIssueHeader,
    GithubIssueInfo,
    GithubIssueInfoHeader,
    MergeableValuePresenter,
    PullRequestReviewDecisionValuePresenter,
    PullRequestStateValuePresenter,
    PullRequestMergeState,
    GithubIssuePresenter
  },
  handler: {
    DisconnectHandler: async () => {}
  },
  functions: {
    ShowForRepositoryOnly: async (spaces: Space[]) => {
      const client = getClient()
      return spaces.some((it) => client.getHierarchy().hasMixin(it, github.mixin.GithubProject))
    },
    UpdateIssue: updateIssue as DocCreateFunction,
    GetCreateIssueAnalyticsProps: getCreateIssueAnalyticsProps as DocCreateAnalyticsPropsFunction
  }
})
