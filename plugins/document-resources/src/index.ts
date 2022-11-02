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

import { Class, Client, DocumentQuery, Ref, RelatedDocument, WithLookup } from '@hcengineering/core'
import { Document } from '@hcengineering/document'
import { Resources } from '@hcengineering/platform'
import { ObjectSearchResult } from '@hcengineering/presentation'

import CreateDocument from './components/CreateDocument.svelte'
import DocumentPresenter from './components/DocumentPresenter.svelte'
import DocumentVersionPresenter from './components/DocumentVersionPresenter.svelte'
import Documents from './components/Documents.svelte'
import MyDocuments from './components/MyDocuments.svelte'
import EditDoc from './components/EditDoc.svelte'
import DocumentItem from './components/DocumentItem.svelte'
import NewDocumentHeader from './components/NewDocumentHeader.svelte'
import Status from './components/Status.svelte'
import Version from './components/Version.svelte'

import document from './plugin'

const toObjectSearchResult = (e: WithLookup<Document>): ObjectSearchResult => ({
  doc: e,
  title: e.name,
  icon: document.icon.Document,
  component: DocumentItem
})

async function queryDocument (
  _class: Ref<Class<Document>>,
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<Document> = { name: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Document>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Document>)
    }
  }
  return (
    await client.findAll(_class, q, {
      limit: 200,
      lookup: {
        _id: {
          versions: document.class.DocumentVersion
        }
      }
    })
  ).map(toObjectSearchResult)
}

export default async (): Promise<Resources> => ({
  component: {
    CreateDocument,
    DocumentPresenter,
    Documents,
    EditDoc,
    DocumentVersionPresenter,
    NewDocumentHeader,
    MyDocuments,
    Status,
    Version
  },
  completion: {
    DocumentQuery: async (
      client: Client,
      query: string,
      filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
    ) => await queryDocument(document.class.Document, client, query, filter)
  }
})
