//
// Copyright © 2021, 2023 Hardcore Engineering Inc.
//
//

import { Ref } from '@hcengineering/core'
import type { Metadata, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { TriggerFunc } from '@hcengineering/server-core'
import { TodoDoneTester } from '@hcengineering/time'
import { GithubProject } from '@hcengineering/github'

/**
 * @public
 */
export const serverGithubId = 'server-github' as Plugin

/**
 * @public
 */
export default plugin(serverGithubId, {
  trigger: {
    OnProjectChanges: '' as Resource<TriggerFunc>,
    OnProjectRemove: '' as Resource<TriggerFunc>,
    OnGithubBroadcast: '' as Resource<TriggerFunc>
  },
  functions: {
    TodoDoneTester: '' as Resource<TodoDoneTester>
  },
  metadata: {
    GithubProjects: '' as Metadata<Set<Ref<GithubProject>>>
  }
})
