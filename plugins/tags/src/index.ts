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

import type { AttachedDoc, Class, Doc, Ref, Space } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { writable } from 'svelte/store'
import { FilterMode } from '@hcengineering/view'

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
export type InitialKnowledge = 0 | 1 | 2

/**
 * @public
 */
export type MeaningfullKnowledge = 3 | 4 | 5

/**
 * @public
 */
export type ExpertKnowledge = 6 | 7 | 8

/**
 * @public
 */
export interface TagReference extends AttachedDoc {
  tag: Ref<TagElement>
  title: string // Copy of title for full text search, updated with trigger.
  color: number // Copy of color from tagElement. Updated with trigger.

  // If set in [8-10] it is speciality, [5-7] - meaningfull, [1-4] - initial
  weight?: InitialKnowledge | MeaningfullKnowledge | ExpertKnowledge
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
    Tags: '' as Asset,
    Level1: '' as Asset,
    Level2: '' as Asset,
    Level3: '' as Asset
  },
  component: {
    DraftTagsEditor: '' as AnyComponent,
    DocTagsEditor: '' as AnyComponent,
    TagsView: '' as AnyComponent,
    TagsEditor: '' as AnyComponent,
    TagsDropdownEditor: '' as AnyComponent,
    TagsCategoryBar: '' as AnyComponent,
    TagsAttributeEditor: '' as AnyComponent,
    TagsPresenter: '' as AnyComponent,
    LabelsPresenter: '' as AnyComponent,
    TagElementPresenter: '' as AnyComponent,
    TagsEditorPopup: '' as AnyComponent,
    ObjectsTagsEditorPopup: '' as AnyComponent
  },
  string: {
    Tags: '' as IntlString,
    AddLabel: '' as IntlString,
    TagLabel: '' as IntlString
  },
  category: {
    NoCategory: '' as Ref<TagCategory>
  },
  filter: {
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
