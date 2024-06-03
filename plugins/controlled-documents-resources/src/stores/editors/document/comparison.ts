//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
import { createEffect, createStore, forward } from 'effector'
import { getClient } from '@hcengineering/presentation'
import { SortingOrder } from '@hcengineering/core'
import documents, {
  type Document,
  type DocumentSection,
  type DocumentSnapshot
} from '@hcengineering/controlled-documents'
import { comparisonCleared, comparisonRequested, controlledDocumentClosed } from './actions'

export const loadComparedDocumentSectionsFx = createEffect(
  async (object: Document | DocumentSnapshot): Promise<DocumentSection[]> => {
    if (object === null || object === undefined) {
      return []
    }

    return await getClient().findAll(
      documents.class.DocumentSection,
      {
        attachedTo: object._id
      },
      { sort: { rank: SortingOrder.Ascending } }
    )
  }
)

export const $comparedDocument = createStore<Document | DocumentSnapshot | null>(null)
  .on(comparisonRequested, (_, payload) => payload)
  .reset([controlledDocumentClosed, comparisonCleared])

export const $comparedDocumentSections = createStore<DocumentSection[]>([])
  .on(loadComparedDocumentSectionsFx.doneData, (_, payload) => payload)
  .reset([controlledDocumentClosed, comparisonCleared])

forward({ from: comparisonRequested, to: loadComparedDocumentSectionsFx })
