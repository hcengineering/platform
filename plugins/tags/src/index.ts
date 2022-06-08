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

import type { AttachedDoc, Class, Doc, Ref, Space } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import { AnyComponent } from '@anticrm/ui'
import { writable } from 'svelte/store'
import { FilterMode } from '@anticrm/view'

/**
 * @public
 */
export interface TagElement extends Doc {
  title: string
  targetClass: Ref<Class<Doc>>
  description: string
  color: number
  category: Ref<TagCategory>
  refCount?: number
}

/**
 * @public
 */
export interface TagReference extends AttachedDoc {
  tag: Ref<TagElement>
  title: string // Copy of title for full text search, updated with trigger.
  color: number // Copy of color from tagElement. Updated with trigger.
}

/**
 * Defined set of skills per category.
 *
 * Will be used as skill category templates or category detection
 * @public
 */
export interface TagCategory extends Doc {
  icon: Asset
  label: string
  targetClass: Ref<Class<Doc>>
  // A list of possible variants.
  tags: string[]

  // If defined, will be used for unidentified tags
  default: boolean
}

/**
 * @public
 */
export const tagsId = 'tags' as Plugin

/**
 * @public
 */
const tagsPlugin = plugin(tagsId, {
  class: {
    TagElement: '' as Ref<Class<TagElement>>,
    TagReference: '' as Ref<Class<TagReference>>,
    TagCategory: '' as Ref<Class<TagCategory>>
  },
  space: {
    Tags: '' as Ref<Space>
  },
  icon: {
    Tags: '' as Asset
  },
  component: {
    TagsView: '' as AnyComponent,
    TagsEditor: '' as AnyComponent,
    TagsDropdownEditor: '' as AnyComponent,
    TagsCategoryBar: '' as AnyComponent,
    TagsAttributeEditor: '' as AnyComponent,
    TagsPresenter: '' as AnyComponent
  },
  category: {
    NoCategory: '' as Ref<TagCategory>
  },
  ids: {
    FilterTagsIn: '' as Ref<FilterMode>,
    FilterTagsNin: '' as Ref<FilterMode>
  }
})

/**
 * @public
 */
export default tagsPlugin

/**
 * @public
 */
export function findTagCategory (title: string, categories: TagCategory[]): Ref<TagCategory> {
  let defaultCategory: TagCategory | undefined
  for (const c of categories) {
    if (c.default) {
      defaultCategory = c
    }
    if (c.tags.findIndex((it) => it.toLowerCase() === title.toLowerCase()) !== -1) {
      return c._id
    }
  }
  if (defaultCategory === undefined) {
    throw new Error('Tag category not found')
  }
  return defaultCategory._id
}

/**
 * @public
 */
export const selectedTagElements = writable<Ref<TagElement>[]>([])
