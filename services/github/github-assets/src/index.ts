//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { loadMetadata } from '@hcengineering/platform'
import github from '@hcengineering/github'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(github.icon, {
  Github: `${icons}#github`,
  GithubRepository: `${icons}#repository`,
  PullRequest: `${icons}#pullRequest`,
  PullRequestMerged: `${icons}#pullRequestMerged`,
  PullRequestClosed: `${icons}#pullRequestClosed`,
  Forks: `${icons}#forks`
})
