//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
import {
  type Hierarchy,
  type MeasureContext,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { FullTextAdapter } from '@hcengineering/server-core'
import { getScoringConfig, mapSearchResultDoc } from './mapper'

export async function searchFulltext (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  hierarchy: Hierarchy,
  adapter: FullTextAdapter,
  query: SearchQuery,
  options: SearchOptions
): Promise<SearchResult> {
  const resultRaw = (await adapter.searchString(ctx, workspaceId, query, {
    ...options,
    scoring: getScoringConfig(hierarchy, query.classes ?? [])
  })) ?? { docs: [] }

  const result: SearchResult = {
    ...resultRaw,
    docs: resultRaw.docs.map((raw) => {
      return mapSearchResultDoc(hierarchy, raw)
    })
  }
  return result
}
