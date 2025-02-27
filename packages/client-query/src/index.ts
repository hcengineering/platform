//
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
//

import { LiveQueries } from '@hcengineering/communication-query'
import type { QueryClient } from '@hcengineering/communication-sdk-types'
import type { WorkspaceID } from '@hcengineering/communication-types'

import { MessagesQuery, NotificationsQuery } from './query'

let lq: LiveQueries

export function createMessagesQuery(): MessagesQuery {
  return new MessagesQuery(lq)
}

export function createNotificationsQuery(): NotificationsQuery {
  return new NotificationsQuery(lq)
}

export function initLiveQueries(client: QueryClient, workspace: WorkspaceID, filesUrl: string): void {
  if (lq != null) {
    lq.close()
  }

  lq = new LiveQueries(client, workspace, filesUrl)

  client.onEvent = (event) => {
    void lq.onEvent(event)
  }
}
