//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { buildSocialIdString, SocialIdType } from '@hcengineering/core'
import type { Metadata, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'

export * from './rest'

export const aiBotId = 'ai-bot' as Plugin

export const aiBotAccountEmail = 'huly.ai.bot@hc.engineering'

let _aiBotAccountEmail: string = aiBotAccountEmail

export function getAiBotAccountEmail (): string {
  return _aiBotAccountEmail
}

export function setAiBotAccountEmail (email: string): void {
  _aiBotAccountEmail = email
}

export function getAiBotEmailSocialKey (): string {
  return buildSocialIdString({
    type: SocialIdType.EMAIL,
    value: _aiBotAccountEmail
  })
}

export const aiBotEmailSocialKey = buildSocialIdString({
  type: SocialIdType.EMAIL,
  value: aiBotAccountEmail
})

const aiBot = plugin(aiBotId, {
  metadata: {
    EndpointURL: '' as Metadata<string>
  }
})

export default aiBot
