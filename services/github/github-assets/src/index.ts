//
// Copyright © 2023 Hardcore Engineering Inc.
//

/// <reference path="../../../../common/types/assets.d.ts" />

import { loadMetadata } from '@hcengineering/platform'
import github from '@hcengineering/github'
import icons from '../assets/icons.svg'

loadMetadata(github.icon, {
  Github: `${icons}#github`,
  GithubRepository: `${icons}#repository`,
  PullRequest: `${icons}#pullRequest`,
  PullRequestMerged: `${icons}#pullRequestMerged`,
  PullRequestClosed: `${icons}#pullRequestClosed`,
  Forks: `${icons}#forks`
})
