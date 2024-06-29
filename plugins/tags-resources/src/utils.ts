// Copyright © 2022 Hardcore Engineering Inc.

import core, {
  type Class,
  type Data,
  type Doc,
  type DocumentQuery,
  type FindResult,
  type Ref
} from '@hcengineering/core'
import { type Asset } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { type InitialKnowledge, type TagCategory, type TagElement, type TagReference } from '@hcengineering/tags'
import { type ColorDefinition, getColorNumberByText } from '@hcengineering/ui'
import { type Filter } from '@hcengineering/view'
import { FilterQuery } from '@hcengineering/view-resources'
import { writable } from 'svelte/store'
import tags from './plugin'

export function getTagStyle (color: ColorDefinition, selected = false): string {
  return `
    background: ${color.color + (selected ? 'ff' : '33')};
    border: 1px solid ${color.color + (selected ? 'ff' : '66')};
    color: ${color.title ?? 'var(--theme-caption-color)'};
  `
}

export async function getRefs (filter: Filter, onUpdate: () => void): Promise<Array<Ref<Doc>>> {
  const lq = FilterQuery.getLiveQuery(filter.index)
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    const level = filter.props?.level ?? 0
    const q: DocumentQuery<TagReference> = {
      tag: { $in: filter.value },
      weight:
        level === 0
          ? { $in: [null as unknown as InitialKnowledge, 0, 1, 2, 3, 4, 5, 6, 7, 8] }
          : { $gte: level as TagReference['weight'] }
    }
    const refresh = lq.query(tags.class.TagReference, q, (refs: FindResult<TagReference>) => {
      const result = Array.from(new Set(refs.map((p) => p.attachedTo)))
      FilterQuery.results.set(filter.index, result)
      resolve(result)
      onUpdate()
    })
    if (!refresh) {
      resolve(FilterQuery.results.get(filter.index) ?? [])
    }
  })
  return await promise
}

export const tagLevel: Record<0 | 1 | 2 | 3, Asset> = {
  3: tags.icon.Level3,
  2: tags.icon.Level2,
  1: tags.icon.Level1,
  0: tags.icon.Tags
}

/**
 * @public
 */
export interface TagElementInfo {
  count: number
  modifiedOn: number
}

/**
 * @public
 */
export const selectedTagElements = writable<Array<Ref<TagElement>>>([])

/**
 * @public
 */
export async function createTagElement (
  title: string,
  targetClass: Ref<Class<Doc>>,
  category?: Ref<TagCategory> | null,
  description?: string | null,
  color?: number | null
): Promise<Ref<TagElement>> {
  const tagElement: Data<TagElement> = {
    title,
    description: description ?? '',
    targetClass,
    color: color ?? getColorNumberByText(title),
    category: category ?? tags.category.NoCategory
  }

  const client = getClient()
  return await client.createDoc<TagElement>(tags.class.TagElement, core.space.Workspace, tagElement)
}
