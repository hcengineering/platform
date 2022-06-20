// Copyright © 2022 Hardcore Engineering Inc.

import { Doc, FindResult, Ref } from '@anticrm/core'
import { TagReference } from '@anticrm/tags'
import tags from './plugin'
import { FilterQuery } from '@anticrm/view-resources'
import { Filter } from '@anticrm/view'

export function getTagStyle (color: string, selected = false): string {
  return `
    background: ${color + (selected ? 'ff' : '33')};
    border: 1px solid ${color + (selected ? 'ff' : '66')};
  `
}

export async function getRefs (
  filter: Filter,
  onUpdate: () => void
): Promise<Array<Ref<Doc>>> {
  const lq = FilterQuery.getLiveQuery(filter.index)
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    const refresh = lq.query(
      tags.class.TagReference,
      {
        tag: { $in: filter.value }
      },
      (refs: FindResult<TagReference>) => {
        const result = Array.from(new Set(refs.map((p) => p.attachedTo)))
        FilterQuery.results.set(filter.index, result)
        resolve(result)
        onUpdate()
      }
    )
    if (!refresh) {
      resolve(FilterQuery.results.get(filter.index) ?? [])
    }
  })
  return await promise
}
