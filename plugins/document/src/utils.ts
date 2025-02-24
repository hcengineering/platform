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

import { type DocumentQuery, type Rank, type Ref, SortingOrder, TxOperations } from '@hcengineering/core'

import document from './plugin'
import { type Document, type Teamspace } from './types'

export async function getFirstRank (
  client: TxOperations,
  space: Ref<Teamspace>,
  parent: Ref<Document>,
  sort: SortingOrder = SortingOrder.Descending,
  extra: DocumentQuery<Document> = {}
): Promise<Rank | undefined> {
  const doc = await client.findOne(
    document.class.Document,
    { space, parent, ...extra },
    { sort: { rank: sort }, projection: { rank: 1 } }
  )

  return doc?.rank
}
