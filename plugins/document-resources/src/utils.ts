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
  type Ref,
  type TxOperations,
  getCollaborativeDoc,
  getCollaborativeDocId
} from '@hcengineering/core'
import { type Document, type Teamspace, documentId } from '@hcengineering/document'
import { getMetadata, translate } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import { type Location, type ResolvedLocation, getCurrentResolvedLocation, getPanelURI } from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'
import slugify from 'slugify'

import document from './plugin'

export async function createEmptyDocument (
  client: TxOperations,
  id: Ref<Document>,
  space: Ref<Teamspace>,
  parent: Ref<Document>,
  data: Partial<Pick<AttachedData<Document>, 'name' | 'icon' | 'color'>> = {}
): Promise<void> {
  const name = await translate(document.string.Untitled, {})
  const collaborativeDocId = getCollaborativeDocId(id, 'content')

  const object: AttachedData<Document> = {
    name,
    content: getCollaborativeDoc(collaborativeDocId),
    attachments: 0,
    children: 0,
    embeddings: 0,
    labels: 0,
    comments: 0,
    references: 0,
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
  const [, _id] = decodeURIComponent(fragment).split('|')
  return _id as Ref<Document>
}

export function getDocumentUrl (doc: Document): string {
  const id = getDocumentId(doc)

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
  loc.path[3] = getDocumentId(doc)

  return loc
}

function getDocumentId (doc: Document): string {
  const slug = slugify(doc.name, { lower: true })
  return `${slug}-${doc._id}`
}

function parseDocumentId (shortLink: string): Ref<Document> | undefined {
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
