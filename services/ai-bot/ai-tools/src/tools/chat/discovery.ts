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

import { type PlatformContext } from '@hcengineering/ai-core'
import { SortingOrder, type Class, type Doc, type DocumentQuery, type Ref } from '@hcengineering/core'

const DISCOVERY_BATCH_SIZE = 100
const MAX_DISCOVERY_BATCHES = 10

export interface DiscoverySource {
  classId: Ref<Class<Doc>>
  query: DocumentQuery<Doc>
}

export interface DiscoveryPage<T> {
  items: T[]
  hasMore: boolean
  nextCursor?: string
}

/** Scan stable id pages, preserving a continuation even when post-filtered pages are empty. */
export async function scanChatPage<T extends Doc, R> (
  ctx: PlatformContext,
  classId: Ref<Class<T>>,
  query: DocumentQuery<T>,
  cursor: string | undefined,
  limit: number,
  select: (doc: T) => Promise<R | undefined>
): Promise<DiscoveryPage<R>> {
  return await scanChatSources(ctx, [{ classId, query }], cursor, limit, async (doc) => await select(doc as T))
}

export async function scanChatSources<R> (
  ctx: PlatformContext,
  sources: DiscoverySource[],
  cursor: string | undefined,
  limit: number,
  select: (doc: Doc) => Promise<R | undefined>
): Promise<DiscoveryPage<R>> {
  const found: Array<{ id: string, item: R }> = []
  let lastScannedId = cursor
  let hasMore = false
  for (let batch = 0; batch < MAX_DISCOVERY_BATCHES; batch++) {
    const pages = await Promise.all(
      sources.map(async ({ classId, query }) => {
        const pageQuery = lastScannedId === undefined ? query : withIdBoundary(query, lastScannedId, 'newer')
        return await ctx.client.findAll(classId, pageQuery, {
          limit: DISCOVERY_BATCH_SIZE,
          sort: { _id: SortingOrder.Ascending }
        })
      })
    )
    const merged = pages.flat().sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0))
    const docs = merged.slice(0, DISCOVERY_BATCH_SIZE)
    const selected = await Promise.all(
      docs.map(async (doc) => {
        const item = await select(doc)
        return { id: doc._id, item }
      })
    )
    for (const result of selected) {
      if (result.item !== undefined) found.push({ id: result.id, item: result.item })
    }
    lastScannedId = docs[docs.length - 1]?._id ?? lastScannedId
    hasMore = merged.length > DISCOVERY_BATCH_SIZE || pages.some((page) => page.length === DISCOVERY_BATCH_SIZE)
    if (found.length > limit || !hasMore) break
  }
  if (found.length > limit) {
    return {
      items: found.slice(0, limit).map(({ item }) => item),
      hasMore: true,
      nextCursor: found[limit - 1].id
    }
  }
  return {
    items: found.map(({ item }) => item),
    hasMore,
    nextCursor: hasMore ? lastScannedId : undefined
  }
}

export function withIdBoundary<T extends Doc> (
  query: DocumentQuery<T>,
  id: string,
  direction: 'older' | 'newer'
): DocumentQuery<T> {
  // Storage adapters support string id ranges; QuerySelector only types numeric ranges.
  const boundary: Record<string, unknown> = { _id: direction === 'older' ? { $lt: id } : { $gt: id } }
  const result: DocumentQuery<T> = { ...query, ...boundary }
  return result
}
