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
