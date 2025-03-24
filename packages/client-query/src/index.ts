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

import { LiveQueries, type QueryClient } from '@hcengineering/communication-query'
import type { WorkspaceID } from '@hcengineering/communication-types'

import { MessagesQuery, NotificationContextsQuery, NotificationsQuery } from './query'

let lq: LiveQueries
let onDestroy: (fn: () => void) => void = () => {}

export function createMessagesQuery(): MessagesQuery {
  return new MessagesQuery(lq, onDestroy)
}

export function createNotificationsQuery(): NotificationsQuery {
  return new NotificationsQuery(lq, onDestroy)
}

export function createNotificationContextsQuery(): NotificationContextsQuery {
  return new NotificationContextsQuery(lq, onDestroy)
}

export function initLiveQueries(
  client: QueryClient,
  workspace: WorkspaceID,
  filesUrl: string,
  destroyFn?: (fn: () => void) => void
): void {
  if (lq != null) {
    lq.close()
  }

  if (destroyFn != null) {
    onDestroy = destroyFn
  }

  lq = new LiveQueries(client, workspace, filesUrl)
}
