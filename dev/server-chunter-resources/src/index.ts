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

import type { Tx, TxCreateDoc, Data, Ref, Doc, TxFactory } from '@anticrm/core'
import type { Message, Backlink } from '@anticrm/chunter'

import core from '@anticrm/core'
import chunter from '@anticrm/chunter'

function extractBacklinks (backlinkId: Ref<Doc>, message: string, kids: NodeListOf<HTMLElement>): Data<Backlink>[] {
  const result: Data<Backlink>[] = []
  for (const kid of kids) {
    if (kid.nodeName === 'span') {
      result.push({
        attachedTo: kid.getAttribute('data-id') as Ref<Doc>,
        backlinkId,
        backlinkClass: chunter.class.Message,
        message
      })
    }
    result.push(...extractBacklinks(backlinkId, message, kid.childNodes as NodeListOf<HTMLElement>))
  }
  return result
}

function getBacklinks (backlinkId: Ref<Doc>, content: string): Data<Backlink>[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'application/xhtml+xml')
  return extractBacklinks(backlinkId, content, doc.childNodes as NodeListOf<HTMLElement>)
}

/**
 * @public
 */
export async function OnMessage (tx: Tx, txFactory: TxFactory): Promise<Tx[]> {
  if (tx._class === core.class.TxCreateDoc) {
    const createTx = tx as TxCreateDoc<Message>
    if (createTx.objectClass === chunter.class.Message) {
      const content = createTx.attributes.content
      const backlinks = getBacklinks(createTx.objectId, content)
      return backlinks.map(backlink => txFactory.createTxCreateDoc(chunter.class.Backlink, chunter.space.Backlinks, backlink))
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessage
  }
})
