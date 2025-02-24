//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { IntlString, Metadata, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { Class, Ref } from '@hcengineering/core'
import { Channel } from '@hcengineering/chunter'

import { OnboardingChannel } from './types'

export const analyticsCollectorId = 'analytics' as Plugin

export * from './utils'
export * from './types'

const analyticsCollector = plugin(analyticsCollectorId, {
  metadata: {
    EndpointURL: '' as Metadata<string>
  },
  class: {
    OnboardingChannel: '' as Ref<Class<OnboardingChannel>>
  },
  space: {
    GeneralOnboardingChannel: '' as Ref<Channel>
  },
  string: {
    OnboardingChannelDescription: '' as IntlString,
    Error: '' as IntlString,
    InProject: '' as IntlString,
    Open: '' as IntlString,
    OpenSpecial: '' as IntlString,
    Set: '' as IntlString,
    To: '' as IntlString,
    Workbench: '' as IntlString,
    OnboardingChannel: '' as IntlString,
    OnboardingChannels: '' as IntlString,
    WorkspaceId: '' as IntlString,
    WorkspaceName: '' as IntlString,
    WorkspaceUrl: '' as IntlString,
    SocialId: '' as IntlString,
    UserName: '' as IntlString,
    DisableAIReplies: '' as IntlString,
    ShowAIReplies: '' as IntlString
  }
})

export default analyticsCollector
