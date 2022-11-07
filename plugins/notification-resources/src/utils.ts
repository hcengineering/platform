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

import core, { Class, Doc, getCurrentAccount, Ref, Timestamp } from '@hcengineering/core'
import notification, { LastView, NotificationClient } from '@hcengineering/notification'
import { createQuery, getClient } from '@hcengineering/presentation'
import { writable, Writable } from 'svelte/store'

/**
 * @public
 */
export class NotificationClientImpl implements NotificationClient {
  protected static _instance: NotificationClientImpl | undefined = undefined
  private lastViews = new Map<Ref<Doc>, LastView>()
  private readonly lastViewsStore = writable(new Map<Ref<Doc>, Timestamp>())

  private readonly lastViewQuery = createQuery()

  private constructor () {
    this.lastViewQuery.query(notification.class.LastView, { user: getCurrentAccount()._id }, (result) => {
      const res: Map<Ref<Doc>, Timestamp> = new Map<Ref<Doc>, Timestamp>()
      const lastViews: Map<Ref<Doc>, LastView> = new Map<Ref<Doc>, LastView>()
      result.forEach((p) => {
        res.set(p.attachedTo, p.lastView)
        lastViews.set(p.attachedTo, p)
      })
      this.lastViews = lastViews
      this.lastViewsStore.set(res)
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

  getLastViews (): Writable<Map<Ref<Doc>, Timestamp>> {
    return this.lastViewsStore
  }

  async updateLastView (
    _id: Ref<Doc>,
    _class: Ref<Class<Doc>>,
    time?: Timestamp,
    force: boolean = false
  ): Promise<void> {
    const client = getClient()
    const user = getCurrentAccount()._id
    const lastView = time ?? new Date().getTime()
    const current = this.lastViews.get(_id)
    if (current !== undefined) {
      if (current.lastView === -1 && !force) return
      if (current.lastView < lastView || force) {
        const u = client.txFactory.createTxUpdateDoc(current._class, current.space, current._id, {
          lastView
        })
        u.space = core.space.DerivedTx
        await client.tx(u)
      }
    } else if (force) {
      const u = client.txFactory.createTxCreateDoc(notification.class.LastView, notification.space.Notifications, {
        user,
        lastView,
        attachedTo: _id,
        attachedToClass: _class,
        collection: 'lastViews'
      })
      u.space = core.space.DerivedTx
      await client.tx(u)
    }
  }

  async unsubscribe (_id: Ref<Doc>): Promise<void> {
    const client = getClient()
    const user = getCurrentAccount()._id
    const current = await client.findOne(notification.class.LastView, { attachedTo: _id, user })
    if (current !== undefined) {
      await client.updateDoc(current._class, current.space, current._id, {
        lastView: -1
      })
    }
  }
}
