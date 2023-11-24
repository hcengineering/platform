//
// Copyright © 2023 Hardcore Engineering Inc.
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

import type { Class, Ref, Doc, SearchResultDoc, TxOperations } from '@hcengineering/core'
import { type ObjectSearchCategory } from '@hcengineering/presentation'

/**
 * @public
 */
export interface SearchSection {
  category: ObjectSearchCategory
  items: SearchResultDoc[]
}

/**
 * @public
 */
export interface SearchItem {
  num: number
  item: SearchResultDoc
  category: ObjectSearchCategory
}

export function findCategoryByClass (
  categories: ObjectSearchCategory[],
  _class: Ref<Class<Doc>>
): ObjectSearchCategory | undefined {
  for (const category of categories) {
    if (category.classToSearch === _class) {
      return category
    }
  }
  return undefined
}

export function packSearchResultsForListView (sections: SearchSection[]): SearchItem[] {
  let results: SearchItem[] = []
  for (const section of sections) {
    const category = section.category
    const items = section.items

    if (category.classToSearch !== undefined) {
      results = results.concat(
        items.map((item, num) => {
          return { num, category, item }
        })
      )
    }
  }
  return results
}

export async function doFulltextSearch (
  client: TxOperations,
  classes: Array<Ref<Class<Doc>>>,
  query: string,
  categories: ObjectSearchCategory[]
): Promise<SearchSection[]> {
  const result = await client.searchFulltext(
    {
      query: `${query}*`,
      classes
    },
    {
      limit: 10
    }
  )

  const itemsByClass = new Map<Ref<Class<Doc>>, SearchResultDoc[]>()
  for (const item of result.docs) {
    const list = itemsByClass.get(item.doc._class)
    if (list === undefined) {
      itemsByClass.set(item.doc._class, [item])
    } else {
      list.push(item)
    }
  }

  const sections: SearchSection[] = []
  for (const [_class, items] of itemsByClass.entries()) {
    const category = findCategoryByClass(categories, _class)
    if (category !== undefined) {
      sections.push({ category, items })
    }
  }

  return sections
}