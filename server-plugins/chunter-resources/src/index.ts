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

import chunter, { chunterId, ChunterSpace, Comment, Message, ThreadMessage } from '@hcengineering/chunter'
import { EmployeeAccount } from '@hcengineering/contact'
import core, {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCreateDoc,
  TxProcessor,
  TxUpdateDoc,
  TxRemoveDoc,
  TxCollectionCUD,
  concatLink
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { getMetadata } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function channelHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const channel = doc as ChunterSpace
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${chunterId}/${channel._id}`
  const link = concatLink(front, path)
  return `<a href="${link}">${channel.name}</a>`
}

/**
 * @public
 */
export async function channelTextPresenter (doc: Doc): Promise<string> {
  const channel = doc as ChunterSpace
  return `${channel.name}`
}

/**
 * @public
 */
export async function CommentRemove (
  doc: Doc,
  hiearachy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
): Promise<Doc[]> {
  if (!hiearachy.isDerived(doc._class, chunter.class.Comment)) {
    return []
  }

  const comment = doc as Comment
  const result = await findAll(chunter.class.Backlink, {
    backlinkId: comment.attachedTo,
    backlinkClass: comment.attachedToClass,
    attachedDocId: comment._id
  })
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

  const lastReplyTx = control.txFactory.createTxUpdateDoc<Message>(
    chunter.class.Message,
    comment.space,
    comment.attachedTo as Ref<Message>,
    {
      lastReply: tx.modifiedOn
    }
  )
  const employee = control.modelDb.getObject(tx.modifiedBy) as EmployeeAccount
  const employeeTx = control.txFactory.createTxUpdateDoc<Message>(
    chunter.class.Message,
    comment.space,
    comment.attachedTo as Ref<Message>,
    {
      $push: { replies: employee.employee }
    }
  )
  const result: TxUpdateDoc<Message>[] = []
  result.push(lastReplyTx)
  result.push(employeeTx)
  return result
}

/**
 * @public
 */
export async function CommentDelete (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  if (tx._class !== core.class.TxRemoveDoc) return []

  const rmTx = tx as TxRemoveDoc<ThreadMessage>
  if (!hierarchy.isDerived(rmTx.objectClass, chunter.class.ThreadMessage)) {
    return []
  }
  const createTx = (
    await control.findAll(
      core.class.TxCreateDoc,
      {
        objectId: rmTx.objectId
      },
      { limit: 1 }
    )
  )[0]

  if (createTx === undefined) {
    return []
  }

  const comment = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<ThreadMessage>)

  const comments = await control.findAll(chunter.class.ThreadMessage, {
    attachedTo: comment.attachedTo
  })
  const updateTx = control.txFactory.createTxUpdateDoc<Message>(
    chunter.class.Message,
    comment.space,
    comment.attachedTo,
    {
      replies: comments.map((comm) => (control.modelDb.getObject(comm.createBy) as EmployeeAccount).employee),
      lastReply: comments.length > 0 ? Math.max(...comments.map((comm) => comm.createOn)) : undefined
    }
  )

  return [updateTx]
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

  const channel = (
    await control.findAll(
      chunter.class.ChunterSpace,
      {
        _id: message.space
      },
      { limit: 1 }
    )
  )[0]

  if (channel?.lastMessage === undefined || channel.lastMessage < message.createOn) {
    const res = control.txFactory.createTxUpdateDoc<ChunterSpace>(channel._class, channel.space, channel._id, {
      lastMessage: message.createOn
    })
    return [res]
  }
  return []
}

/**
 * @public
 */
export async function MessageDelete (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  if (tx._class !== core.class.TxCollectionCUD) return []

  const rmTx = (tx as TxCollectionCUD<ChunterSpace, Message>).tx
  if (!hierarchy.isDerived(rmTx.objectClass, chunter.class.Message)) {
    return []
  }
  const createTx = (
    await control.findAll(
      core.class.TxCreateDoc,
      {
        objectId: rmTx.objectId
      },
      { limit: 1 }
    )
  )[0]

  if (createTx === undefined) {
    return []
  }

  const message = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Message>)

  const channel = (
    await control.findAll(
      chunter.class.ChunterSpace,
      {
        _id: message.space
      },
      { limit: 1 }
    )
  )[0]

  if (channel?.lastMessage === message.createOn) {
    const messages = await control.findAll(chunter.class.Message, {
      attachedTo: channel._id
    })
    const lastMessageDate = messages.reduce((maxDate, mess) => (mess.createOn > maxDate ? mess.createOn : maxDate), 0)

    const updateTx = control.txFactory.createTxUpdateDoc<ChunterSpace>(channel._class, channel.space, channel._id, {
      lastMessage: lastMessageDate > 0 ? lastMessageDate : undefined
    })

    return [updateTx]
  }

  return []
}

/**
 * @public
 */
export async function ChunterTrigger (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const promises = [
    MessageCreate(tx, control),
    MessageDelete(tx, control),
    CommentCreate(tx, control),
    CommentDelete(tx, control)
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
