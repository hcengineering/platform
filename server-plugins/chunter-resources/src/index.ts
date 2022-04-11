//
// Copyright © 2022 Hardcore Engineering Inc.
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

import chunter, { Channel, Comment, Message } from '@anticrm/chunter'
import { EmployeeAccount } from '@anticrm/contact'
import core, { Class, Doc, DocumentQuery, FindOptions, FindResult, Hierarchy, Ref, Tx, TxCreateDoc, TxProcessor, TxUpdateDoc } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import { TriggerControl } from '@anticrm/server-core'
import workbench from '@anticrm/workbench'

/**
 * @public
 */
export function channelHTMLPresenter (doc: Doc): string {
  const channel = doc as Channel
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbench.component.WorkbenchApp}/${chunter.app.Chunter}/${channel._id}">${channel.name}</a>`
}

/**
 * @public
 */
export function channelTextPresenter (doc: Doc): string {
  const channel = doc as Channel
  return `${channel.name}`
}

/**
 * @public
 */
export async function CommentRemove (doc: Doc, hiearachy: Hierarchy, findAll: <T extends Doc> (clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>): Promise<Doc[]> {
  if (!hiearachy.isDerived(doc._class, chunter.class.Comment)) {
    return []
  }

  const comment = doc as Comment
  const result = await findAll(chunter.class.Backlink, { backlinkId: comment.attachedTo, backlinkClass: comment.attachedToClass, attachedDocId: comment._id })
  return result
}

/**
 * @public
 */
export async function CommentCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  if (tx._class !== core.class.TxCreateDoc) return []
  const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<Doc>)
  if (!hierarchy.isDerived(doc._class, chunter.class.ThreadMessage)) {
    return []
  }

  const comment = doc as Comment
  if (!hierarchy.isDerived(comment.attachedToClass, chunter.class.Message)) {
    return []
  }

  const lastReplyTx = control.txFactory.createTxUpdateDoc<Message>(chunter.class.Message, comment.space, comment.attachedTo as Ref<Message>, {
    lastReply: tx.modifiedOn
  })
  const employee = control.modelDb.getObject(tx.modifiedBy) as EmployeeAccount
  const employeeTx = control.txFactory.createTxUpdateDoc<Message>(chunter.class.Message, comment.space, comment.attachedTo as Ref<Message>, {
    $push: { replies: employee.employee }
  })
  const result: TxUpdateDoc<Message>[] = []
  result.push(lastReplyTx)
  result.push(employeeTx)
  return result
}

/**
 * @public
 */
export async function MessageCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  if (tx._class !== core.class.TxCreateDoc) return []
  const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<Doc>)
  if (!hierarchy.isDerived(doc._class, chunter.class.Message)) {
    return []
  }

  const message = doc as Message

  const channel = (await control.findAll(chunter.class.Channel, {
    _id: message.space
  }, { limit: 1 }))[0]

  if (channel.lastMessage === undefined || channel.lastMessage < message.createOn) {
    const res = control.txFactory.createTxUpdateDoc<Channel>(channel._class, channel.space, channel._id, {
      lastMessage: message.createOn
    })
    return [res]
  }
  return []
}

/**
 * @public
 */
export async function ChunterTrigger (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const promises = [
    MessageCreate(tx, control),
    CommentCreate(tx, control)
  ]
  const res = await Promise.all(promises)
  return res.flat()
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    ChunterTrigger
  },
  function: {
    CommentRemove,
    ChannelHTMLPresenter: channelHTMLPresenter,
    ChannelTextPresenter: channelTextPresenter
  }
})
