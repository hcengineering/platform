import type { Ref } from '@hcengineering/core'
import type { DisplayInboxNotification, DocNotifyContext } from '@hcengineering/notification'

export type InboxNotificationsFilter = 'all' | 'unread'

export type InboxData = Map<Ref<DocNotifyContext>, DisplayInboxNotification[]>
