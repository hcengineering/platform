// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import card from '@hcengineering/model-card'
import { MessagesNavigationAnchors } from '@hcengineering/communication'

import communication from './plugin'
import { buildTypes } from './types'
import { buildCardActions, buildMessageActions } from './actions'
import { buildApplets } from './applets'

export { communicationId } from '@hcengineering/communication'
export * from './migration'

export function createModel (builder: Builder): void {
  buildTypes(builder)
  buildMessageActions(builder)
  buildCardActions(builder)
  buildApplets(builder)

  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: communication.string.Messages,
      component: communication.component.CardMessagesSection,
      order: 9999,
      navigation: [
        {
          id: MessagesNavigationAnchors.ConversationStart,
          label: communication.string.FirstMessages
        },
        {
          id: MessagesNavigationAnchors.LatestMessages,
          label: communication.string.LatestMessages
        }
      ]
    },
    communication.ids.CardMessagesSection
  )
}

export default communication
