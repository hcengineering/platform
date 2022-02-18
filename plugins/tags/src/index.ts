//
// Copyright © 2022 Anticrm Platform Contributors.
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

/**
 * @public
 */
export interface TagElement extends Doc {
  title: string
  targetClass: Ref<Class<Doc>>
  description: string
  color: number
  category: Ref<TagCategory>
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
    TagsCategoryBar: '' as AnyComponent
  },
  category: {
    Other: '' as Ref<TagCategory>
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
  for (const c of categories) {
    if (c.tags.findIndex((it) => it.toLowerCase() === title.toLowerCase()) !== -1) {
      return c._id
    }
  }
  return tagsPlugin.category.Other
}

/**
 * @public
 */
export const selectedTagElements = writable<Ref<TagElement>[]>([])
