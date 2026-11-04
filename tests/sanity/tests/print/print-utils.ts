//
// Copyright © 2026 TraceX SAS.
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

import type { AccountUuid, Class, Data, Doc, Ref, Space } from '@hcengineering/core'
import { expect, type APIRequestContext } from '@playwright/test'
import { WorkspaceRestClient } from '../API/WorkspaceRestClient'
import { generateId, PlatformURI, PlatformUser, PlatformWs } from '../utils'

interface ContentFixture extends Doc {
  content: string | null
}

interface DocumentFixture extends ContentFixture {
  title: string
  parent: Ref<Doc>
  rank: string
}

export interface PrintObject {
  title: string
  url: string
  id: Ref<Doc>
  space: Ref<Space>
  client: WorkspaceRestClient
}

const DOCUMENT = 'document:class:Document' as Ref<Class<DocumentFixture>>
const TEAMSPACE = 'document:class:Teamspace' as Ref<Class<Space>>
export const PRINT_CARD_CLASS = 'card:types:Document'

/** Prepare an independent document through the public workspace API. */
export async function createPrintDocument (request: APIRequestContext): Promise<PrintObject> {
  const client = await WorkspaceRestClient.connect(request, PlatformUser, '1234', PlatformWs)
  const space = await client.findOne(TEAMSPACE, { archived: false })
  if (space === undefined) throw new Error('The sanity workspace needs a teamspace for document tests')
  const title = `Print document ${generateId()}`
  const data: Data<DocumentFixture> = {
    title,
    content: null,
    parent: 'document:ids:NoParent' as Ref<Doc>,
    rank: ''
  }
  const tx = client.factory.createTxCreateDoc(DOCUMENT, space._id, data)
  expect(await client.tx(tx)).toMatchObject({ ok: true })
  const fixture: PrintObject = {
    title,
    id: tx.objectId,
    space: space._id,
    url: `${PlatformURI}/workbench/${PlatformWs}/document/print-${tx.objectId}`,
    client
  }
  return fixture
}

/** Printing reads a persisted editor snapshot rather than the active editing session. */
export async function waitForPrintContent (document: PrintObject, objectClass: string = DOCUMENT): Promise<void> {
  const contentClass = objectClass as Ref<Class<ContentFixture>>
  await expect
    .poll(
      async () => {
        const saved = await document.client.findOne(contentClass, { _id: document.id as Ref<ContentFixture> })
        return saved?.content
      },
      // Collaborator may debounce persistence for 60 seconds before writing the snapshot.
      { timeout: 75000, message: `Waiting for the persisted print snapshot of ${document.id}` }
    )
    .toMatch(/\S/)
}

interface CardFixture extends Doc {
  title: string
  content: string
  parentInfo: Array<{ _id: Ref<Doc>, _class: Ref<Class<Doc>>, title: string }>
  blobs: Record<string, string>
  rank: string
}

/** Use the built-in type selected by the ordinary card creation form. */
export async function createPrintCard (request: APIRequestContext): Promise<PrintObject> {
  const client = await WorkspaceRestClient.connect(request, PlatformUser, '1234', PlatformWs)
  const space = await client.findOne('card:class:CardSpace' as Ref<Class<Space>>, { archived: false })
  if (space === undefined) throw new Error('The sanity workspace needs a card space for print tests')
  const data: Data<CardFixture> = {
    title: `Print card ${generateId()}`,
    content: '',
    parentInfo: [],
    blobs: {},
    rank: ''
  }
  const tx = client.factory.createTxCreateDoc(PRINT_CARD_CLASS as Ref<Class<CardFixture>>, space._id, data)
  expect(await client.tx(tx)).toMatchObject({ ok: true })
  const fixture: PrintObject = {
    title: data.title,
    id: tx.objectId,
    space: space._id,
    url: `${PlatformURI}/workbench/${PlatformWs}/card/${tx.objectId}`,
    client
  }
  return fixture
}

interface NotificationRequest extends Doc {
  targets: AccountUuid[]
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  objectSpace: Ref<Space>
  notificationType: Ref<Doc>
  messageHtml: string
}

/** Ask the public notification API to create an unread inbox item for the test account. */
export async function createPrintNotification (document: PrintObject): Promise<void> {
  const data: Data<NotificationRequest> = {
    targets: [document.client.account.uuid],
    objectId: document.id,
    objectClass: DOCUMENT,
    objectSpace: document.space,
    notificationType: 'notification:ids:MentionNotificationType' as Ref<Doc>,
    messageHtml: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: document.title }] }]
    })
  }
  const tx = document.client.factory.createTxCreateDoc(
    'notification:class:OnDemandNotification' as Ref<Class<NotificationRequest>>,
    document.space,
    data
  )
  expect(await document.client.tx(tx)).toMatchObject({ ok: true })
}
