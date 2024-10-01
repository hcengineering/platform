//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import {
  type AttachedData,
  type Client,
  type QuerySelector,
  type Ref,
  SortingOrder,
  type TxOperations,
  makeCollaborativeDoc
} from '@hcengineering/core'
import { type Document, type Teamspace, documentId, getFirstRank } from '@hcengineering/document'
import { getMetadata, translate } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import { makeRank } from '@hcengineering/rank'
import { getCurrentResolvedLocation, getPanelURI, type Location, type ResolvedLocation } from '@hcengineering/ui'
import { accessDeniedStore } from '@hcengineering/view-resources'
import { workbenchId } from '@hcengineering/workbench'
import slugify from 'slugify'

import document from './plugin'

export async function moveDocument (doc: Document, space: Ref<Teamspace>, parent: Ref<Document>): Promise<void> {
  const client = getClient()

  const prevRank = await getFirstRank(client, space, parent)
  const rank = makeRank(prevRank, undefined)

  await client.update(doc, { space, attachedTo: parent, rank })
}

export async function moveDocumentBefore (doc: Document, before: Document): Promise<void> {
  const client = getClient()

  const { space, attachedTo } = before
  const query = { rank: { $lt: before.rank } as unknown as QuerySelector<Document['rank']> }
  const lastRank = await getFirstRank(client, space, attachedTo, SortingOrder.Descending, query)
  const rank = makeRank(lastRank, before.rank)

  await client.update(doc, { space, attachedTo, rank })
}

export async function moveDocumentAfter (doc: Document, after: Document): Promise<void> {
  const client = getClient()

  const { space, attachedTo } = after
  const query = { rank: { $gt: after.rank } as unknown as QuerySelector<Document['rank']> }
  const nextRank = await getFirstRank(client, space, attachedTo, SortingOrder.Ascending, query)
  const rank = makeRank(after.rank, nextRank)

  await client.update(doc, { space, attachedTo, rank })
}

export async function createEmptyDocument (
  client: TxOperations,
  id: Ref<Document>,
  space: Ref<Teamspace>,
  parent: Ref<Document>,
  data: Partial<Pick<AttachedData<Document>, 'name' | 'icon' | 'color'>> = {}
): Promise<void> {
  const name = await translate(document.string.Untitled, {})

  const lastRank = await getFirstRank(client, space, parent)
  const rank = makeRank(lastRank, undefined)

  const object: AttachedData<Document> = {
    name,
    content: makeCollaborativeDoc(id, 'content'),
    attachments: 0,
    children: 0,
    embeddings: 0,
    labels: 0,
    comments: 0,
    references: 0,
    rank,
    ...data
  }

  await client.addCollection(
    document.class.Document,
    space,
    parent ?? document.ids.NoParent,
    document.class.Document,
    'children',
    object,
    id
  )
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== documentId) {
    return undefined
  }

  const shortLink = loc.path[3]
  const id = parseDocumentId(shortLink)

  if (id !== undefined) {
    return await generateLocation(loc, id)
  }

  return undefined
}

export async function generateLocation (loc: Location, id: Ref<Document>): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const doc = await client.findOne(document.class.Document, { _id: id })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find document ${id}.`)
    return undefined
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  return {
    loc: {
      path: [appComponent, workspace, documentId, doc.space],
      fragment: getPanelURI(document.component.EditDoc, doc._id, doc._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, documentId],
      fragment: getPanelURI(document.component.EditDoc, doc._id, doc._class, 'content')
    }
  }
}

export function getDocumentIdFromFragment (fragment: string): Ref<Document> | undefined {
  const [, id] = decodeURIComponent(fragment).split('|')

  if (id == null) {
    return undefined
  }

  return (parseDocumentId(id) ?? id) as Ref<Document>
}

export function getDocumentUrl (doc: Document): string {
  const id = getDocumentLinkId(doc)

  const location = getCurrentResolvedLocation()
  const frontUrl = getMetadata(presentation.metadata.FrontUrl)
  const protocolAndHost = frontUrl ?? `${window.location.protocol}//${window.location.host}`
  return `${protocolAndHost}/${workbenchId}/${location.path[1]}/${documentId}/${id}`
}

export function getDocumentLink (doc: Document): Location {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = documentId
  loc.path[3] = getDocumentLinkId(doc)

  return loc
}

export function getDocumentLinkId (doc: Document): string {
  const slug = slugify(doc.name, { lower: true })
  return `${slug}-${doc._id}`
}

export function parseDocumentId (shortLink: string): Ref<Document> | undefined {
  const parts = shortLink.split('-')
  if (parts.length > 1) {
    return parts[parts.length - 1] as Ref<Document>
  }
  return undefined
}

export async function documentTitleProvider (client: Client, ref: Ref<Document>, doc?: Document): Promise<string> {
  const object = doc ?? (await client.findOne(document.class.Document, { _id: ref }))
  return object?.name ?? ''
}
