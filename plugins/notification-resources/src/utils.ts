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

import { Account, Class, Doc, DocumentUpdate, getCurrentAccount, Ref, TxOperations } from '@hcengineering/core'
import notification, { Collaborators, DocUpdates, NotificationClient } from '@hcengineering/notification'
import { createQuery, getClient } from '@hcengineering/presentation'
import { writable } from 'svelte/store'

/**
 * @public
 */
export class NotificationClientImpl implements NotificationClient {
  protected static _instance: NotificationClientImpl | undefined = undefined
  readonly docUpdatesStore = writable<Map<Ref<Doc>, DocUpdates>>(new Map())
  docUpdatesMap: Map<Ref<Doc>, DocUpdates> = new Map()
  readonly docUpdates = writable<DocUpdates[]>([])

  private readonly docUpdatesQuery = createQuery(true)

  private readonly user: Ref<Account>

  private constructor () {
    this.user = getCurrentAccount()._id
    this.docUpdatesQuery.query(
      notification.class.DocUpdates,
      {
        user: this.user
      },
      (result) => {
        this.docUpdates.set(result)
        this.docUpdatesMap = new Map(result.map((p) => [p.attachedTo, p]))
        this.docUpdatesStore.set(this.docUpdatesMap)
      }
    )
  }

  static createClient (): NotificationClientImpl {
    NotificationClientImpl._instance = new NotificationClientImpl()
    return NotificationClientImpl._instance
  }

  static getClient (): NotificationClientImpl {
    if (NotificationClientImpl._instance === undefined) {
      NotificationClientImpl._instance = new NotificationClientImpl()
    }
    return NotificationClientImpl._instance
  }

  async read (_id: Ref<Doc>): Promise<void> {
    const client = getClient()
    const docUpdate = this.docUpdatesMap.get(_id)
    if (docUpdate !== undefined) {
      if (docUpdate.txes.some((p) => p.isNew)) {
        docUpdate.txes.forEach((p) => (p.isNew = false))
        await client.update(docUpdate, { txes: docUpdate.txes })
      }
    }
  }

  async forceRead (_id: Ref<Doc>, _class: Ref<Class<Doc>>): Promise<void> {
    const client = getClient()
    const docUpdate = this.docUpdatesMap.get(_id)
    if (docUpdate !== undefined) {
      if (docUpdate.txes.some((p) => p.isNew)) {
        docUpdate.txes.forEach((p) => (p.isNew = false))
        await client.update(docUpdate, { txes: docUpdate.txes })
      }
    } else {
      const doc = await client.findOne(_class, { _id })
      if (doc !== undefined) {
        const hiearachy = client.getHierarchy()
        const collab = hiearachy.as<Doc, Collaborators>(doc, notification.mixin.Collaborators)
        if (collab.collaborators === undefined) {
          await client.createMixin<Doc, Collaborators>(
            collab._id,
            collab._class,
            collab.space,
            notification.mixin.Collaborators,
            {
              collaborators: [this.user]
            }
          )
        } else if (!collab.collaborators.includes(this.user)) {
          await client.updateMixin(collab._id, collab._class, collab.space, notification.mixin.Collaborators, {
            $push: {
              collaborators: this.user
            }
          })
        }
        await client.createDoc(notification.class.DocUpdates, doc.space, {
          attachedTo: _id,
          attachedToClass: _class,
          user: this.user,
          hidden: true,
          txes: []
        })
      }
    }
  }
}

/**
 * @public
 */
export async function hasntNotifications (object: DocUpdates): Promise<boolean> {
  if (object._class !== notification.class.DocUpdates) return false
  return !object.txes.some((p) => p.isNew)
}

enum OpWithMe {
  Add = 'add',
  Remove = 'remove'
}

async function updateMeInCollaborators (
  client: TxOperations,
  docClass: Ref<Class<Doc>>,
  docId: Ref<Doc>,
  op: OpWithMe
): Promise<void> {
  const me = getCurrentAccount()._id
  const hierarchy = client.getHierarchy()
  const target = await client.findOne(docClass, { _id: docId })
  if (target !== undefined) {
    if (hierarchy.hasMixin(target, notification.mixin.Collaborators)) {
      const collab = hierarchy.as(target, notification.mixin.Collaborators)
      let collabUpdate: DocumentUpdate<Collaborators> | undefined

      if (collab.collaborators.includes(me) && op === OpWithMe.Remove) {
        collabUpdate = {
          $pull: {
            collaborators: me
          }
        }
      } else if (!collab.collaborators.includes(me) && op === OpWithMe.Add) {
        collabUpdate = {
          $push: {
            collaborators: me
          }
        }
      }

      if (collabUpdate !== undefined) {
        await client.updateMixin(
          collab._id,
          collab._class,
          collab.space,
          notification.mixin.Collaborators,
          collabUpdate
        )
      }
    }
  }
}

/**
 * @public
 */
export async function unsubscribe (object: DocUpdates): Promise<void> {
  const client = getClient()
  await updateMeInCollaborators(client, object.attachedToClass, object.attachedTo, OpWithMe.Remove)
  await client.remove(object)
}

/**
 * @public
 */
export async function subscribe (docClass: Ref<Class<Doc>>, docId: Ref<Doc>): Promise<void> {
  const client = getClient()
  await updateMeInCollaborators(client, docClass, docId, OpWithMe.Add)
}

/**
 * @public
 */
export async function hide (object: DocUpdates | DocUpdates[]): Promise<void> {
  const client = getClient()
  if (Array.isArray(object)) {
    for (const value of object) {
      await client.update(value, {
        hidden: true
      })
    }
  } else {
    await client.update(object, {
      hidden: true
    })
  }
}

/**
 * @public
 */
export async function markAsUnread (object: DocUpdates): Promise<void> {
  const client = getClient()
  if (object.txes.length === 0) return
  const txes = object.txes
  txes[0].isNew = true
  await client.update(object, {
    txes
  })
}
