//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import core, { Account, Class, Doc, getCurrentAccount, Ref, Timestamp } from '@hcengineering/core'
import notification, { DocUpdates, LastView, NotificationClient } from '@hcengineering/notification'
import { createQuery, getClient } from '@hcengineering/presentation'
import { get, writable, Writable } from 'svelte/store'

/**
 * @public
 */
export class NotificationClientImpl implements NotificationClient {
  protected static _instance: NotificationClientImpl | undefined = undefined
  private readonly lastViewsStore = writable<LastView>()

  private readonly lastViewQuery = createQuery()
  private readonly user: Ref<Account>

  private constructor () {
    this.user = getCurrentAccount()._id
    this.lastViewQuery.query(notification.class.LastView, { user: this.user }, (result) => {
      this.lastViewsStore.set(result[0])
      if (result[0] === undefined) {
        const client = getClient()
        const u = client.txFactory.createTxCreateDoc(notification.class.LastView, notification.space.Notifications, {
          user: this.user
        })
        u.space = core.space.DerivedTx
        void client.tx(u)
      }
    })
  }

  static createClient (): void {
    NotificationClientImpl._instance = new NotificationClientImpl()
  }

  static getClient (): NotificationClientImpl {
    if (NotificationClientImpl._instance === undefined) {
      NotificationClientImpl._instance = new NotificationClientImpl()
    }
    return NotificationClientImpl._instance
  }

  getLastViews (): Writable<LastView> {
    return this.lastViewsStore
  }

  async updateLastView (
    _id: Ref<Doc>,
    _class: Ref<Class<Doc>>,
    time?: Timestamp,
    force: boolean = false
  ): Promise<void> {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const mixin = hierarchy.classHierarchyMixin(_class, notification.mixin.TrackedDoc)
    if (mixin === undefined) return
    const lastView = time ?? new Date().getTime()
    const obj = get(this.lastViewsStore)
    if (obj !== undefined) {
      const current = obj[_id] as Timestamp | undefined
      if (current !== undefined || force) {
        if (current === -1 && !force) return
        if (force || (current ?? 0) < lastView) {
          const u = client.txFactory.createTxUpdateDoc(obj._class, obj.space, obj._id, {
            [_id]: lastView
          })
          u.space = core.space.DerivedTx
          await client.tx(u)
        }
      }
    }
  }

  async unsubscribe (_id: Ref<Doc>): Promise<void> {
    const client = getClient()
    const obj = get(this.lastViewsStore)
    if (obj !== undefined) {
      const u = client.txFactory.createTxUpdateDoc(obj._class, obj.space, obj._id, {
        [_id]: -1
      })
      u.space = core.space.DerivedTx
      await client.tx(u)
    }
  }
}

/**
 * @public
 */
export async function hasntNotifications (object: DocUpdates): Promise<boolean> {
  if (object._class !== notification.class.DocUpdates) return false
  return object.txes.length === 0
}

/**
 * @public
 */
export async function unsubscribe (object: DocUpdates): Promise<void> {
  const me = getCurrentAccount()._id
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const target = await client.findOne(object.attachedToClass, { _id: object.attachedTo })
  if (target !== undefined) {
    if (hierarchy.hasMixin(target, notification.mixin.Collaborators)) {
      const collab = hierarchy.as(target, notification.mixin.Collaborators)
      if (collab.collaborators.includes(me)) {
        await client.updateMixin(collab._id, collab._class, collab.space, notification.mixin.Collaborators, {
          $pull: {
            collaborators: me
          }
        })
      }
    }
  }
  await client.remove(object)
}

/**
 * @public
 */
export async function hide (object: DocUpdates): Promise<void> {
  const client = getClient()
  await client.update(object, {
    hidden: true
  })
}

/**
 * @public
 */
export async function markAsUnread (object: DocUpdates): Promise<void> {
  const client = getClient()
  if (object.txes.length > 0) return
  if (object.lastTx !== undefined && object.lastTxTime !== undefined) {
    await client.update(object, {
      txes: [[object.lastTx, object.lastTxTime]]
    })
  }
}
