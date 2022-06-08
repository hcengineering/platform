// Copyright © 2022 Hardcore Engineering Inc.

import { Doc, FindResult, Ref } from '@anticrm/core'
import { createQuery, LiveQuery } from '@anticrm/presentation'
import { TagElement, TagReference } from '@anticrm/tags'
import tags from './plugin'

export function getTagStyle (color: string, selected = false): string {
  return `
    background: ${color + (selected ? 'ff' : '33')};
    border: 1px solid ${color + (selected ? 'ff' : '66')};
  `
}

export const TagFilterQuery = {
  queries: new Map<number, LiveQuery>(),
  results: new Map<number, Array<Ref<Doc>>>(),

  getLiveQuery (index: number): LiveQuery {
    const current = TagFilterQuery.queries.get(index)
    if (current !== undefined) return current
    const query = createQuery(true)
    this.queries.set(index, query)
    return query
  },

  async getRefs (res: Array<Ref<TagElement>>, onUpdate: () => void, index: number): Promise<Array<Ref<Doc>>> {
    const lq = this.getLiveQuery(index)
    const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
      const refresh = lq.query(
        tags.class.TagReference,
        {
          tag: { $in: res }
        },
        (refs: FindResult<TagReference>) => {
          const result = Array.from(new Set(refs.map((p) => p.attachedTo)))
          TagFilterQuery.results.set(index, result)
          resolve(result)
          onUpdate()
        }
      )
      if (!refresh) {
        resolve(TagFilterQuery.results.get(index) ?? [])
      }
    })
    return await promise
  },

  remove (index: number): void {
    const lq = this.queries.get(index)
    lq?.unsubscribe()
    this.queries.delete(index)
    this.results.delete(index)
  }
}
