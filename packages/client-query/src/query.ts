import { type LiveQueries } from '@communication/query'
import type { MessagesQueryCallback, NotificationsQueryCallback, QueryCallback } from '@communication/sdk-types'
import { type FindMessagesParams, type FindNotificationsParams } from '@communication/types'
import { deepEqual } from 'fast-equals'

class BaseQuery<P extends Record<string, any>, C extends QueryCallback<any>> {
  private oldQuery: P | undefined
  private oldCallback: QueryCallback<any> | undefined

  constructor(protected readonly lq: LiveQueries) {}

  unsubscribe: () => void = () => {}

  query(params: P, callback: C): boolean {
    if (!this.needUpdate(params, callback)) {
      return false
    }
    this.doQuery(params, callback)
    return true
  }

  private doQuery(query: P, callback: C): void {
    this.unsubscribe()
    this.oldCallback = callback
    this.oldQuery = query

    const { unsubscribe } = this.createQuery(query, callback)
    this.unsubscribe = () => {
      unsubscribe()
      this.oldCallback = undefined
      this.oldQuery = undefined
      this.unsubscribe = () => {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createQuery(params: P, callback: C): { unsubscribe: () => void } {
    return {
      unsubscribe: () => {}
    }
  }

  private needUpdate(params: FindMessagesParams, callback: MessagesQueryCallback): boolean {
    if (!deepEqual(params, this.oldQuery)) return true
    if (!deepEqual(callback.toString(), this.oldCallback?.toString())) return true
    return false
  }
}

export class MessagesQuery extends BaseQuery<FindMessagesParams, MessagesQueryCallback> {
  override createQuery(params: FindMessagesParams, callback: MessagesQueryCallback): { unsubscribe: () => void } {
    return this.lq.queryMessages(params, callback)
  }
}

export class NotificationsQuery extends BaseQuery<FindNotificationsParams, NotificationsQueryCallback> {
  override createQuery(
    params: FindNotificationsParams,
    callback: NotificationsQueryCallback
  ): {
    unsubscribe: () => void
  } {
    return this.lq.queryNotifications(params, callback)
  }
}
