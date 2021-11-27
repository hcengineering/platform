//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Tx, TxCreateDoc, Data, Ref, Doc, TxFactory, Class, TxCollectionCUD, AttachedDoc } from '@anticrm/core'
import type { FindAll } from '@anticrm/server-core'
import type { Message, Backlink } from '@anticrm/chunter'
import { parse, Node, HTMLElement } from 'node-html-parser'

import core from '@anticrm/core'
import chunter from '@anticrm/chunter'

function extractBacklinks (backlinkId: Ref<Doc>, message: string, kids: Node[]): Data<Backlink>[] {
  const result: Data<Backlink>[] = []
  for (const kid of kids) {
    if ((kid as HTMLElement).localName === 'span') {
      result.push({
        attachedTo: (kid as HTMLElement).getAttribute('data-id') as Ref<Doc>,
        attachedToClass: (kid as HTMLElement).getAttribute('data-class') as Ref<Class<Doc>>,
        collection: (kid as HTMLElement).getAttribute('data-collection') ?? '',
        backlinkId,
        backlinkClass: chunter.class.Message,
        message
      })
    }
    result.push(...extractBacklinks(backlinkId, message, kid.childNodes))
  }
  return result
}

function getBacklinks (backlinkId: Ref<Doc>, content: string): Data<Backlink>[] {
  const doc = parse(content)
  return extractBacklinks(backlinkId, content, doc.childNodes)
}

/**
 * @public
 */
export async function OnMessage (tx: Tx, txFactory: TxFactory): Promise<Tx[]> {
  if (tx._class === core.class.TxCollectionCUD) {
    tx = (tx as TxCollectionCUD<Doc, AttachedDoc>).tx
  }
  if (tx._class === core.class.TxCreateDoc) {
    const createTx = tx as TxCreateDoc<Message>
    if (createTx.objectClass === chunter.class.Message) {
      const content = createTx.attributes.content
      const backlinks = getBacklinks(createTx.objectId, content)
      return backlinks.map((backlink) =>
        txFactory.createTxCreateDoc(chunter.class.Backlink, chunter.space.Backlinks, backlink)
      )
    }
  }
  return []
}

// interface WithAttachements extends Doc {
//   attachments: number
// }

/**
 * @public
 */
export async function OnAttachment (tx: Tx, txFactory: TxFactory, findAll: FindAll<Doc>): Promise<Tx[]> {
  // if (tx._class === core.class.TxAddCollection) {
  //   const createTx = tx as TxAddCollection<Attachment>
  //   if (createTx.objectClass === chunter.class.Attachment) {
  //     const _id = createTx.attachedTo as Ref<WithAttachements>
  //     const _class = createTx.attachedToClass as Ref<Class<WithAttachements>>
  //     const attachedTo = (await findAll(_class, { _id }))[0]
  //     return [txFactory.createTxUpdateDoc(_class, attachedTo.space, _id, { $inc: { attachments: 1 } })]
  //   }
  // }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessage,
    OnAttachment
  }
})
