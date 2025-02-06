import { LiveQueries } from '@hcengineering/communication-query'
import type { QueryClient } from '@hcengineering/communication-sdk-types'

import { MessagesQuery, NotificationsQuery } from './query'

let lq: LiveQueries

export function createMessagesQuery(): MessagesQuery {
  return new MessagesQuery(lq)
}

export function createNotificationsQuery(): NotificationsQuery {
  return new NotificationsQuery(lq)
}

export function initLiveQueries(client: QueryClient) {
  if (lq != null) {
    lq.close()
  }

  lq = new LiveQueries(client)

  client.onEvent = (event) => {
    void lq.onEvent(event)
  }
}
