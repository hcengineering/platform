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
import { type ObjectSearchCategory } from './types'
import plugin from './plugin'
import { getClient } from './utils'

interface SearchSection {
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

function findCategoryByClass (
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

function packSearchResultsForListView (sections: SearchSection[]): SearchItem[] {
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

async function searchCategory (
  client: TxOperations,
  cl: Ref<Class<Doc>>,
  query: string,
  categories: ObjectSearchCategory[]
): Promise<SearchSection | undefined> {
  const r = await client.searchFulltext(
    {
      query: `${query}*`,
      classes: [cl]
    },
    {
      limit: 5
    }
  )
  const category = findCategoryByClass(categories, cl)
  return category !== undefined ? { category, items: r.docs } : undefined
}

async function doFulltextSearch (
  client: TxOperations,
  classes: Array<Ref<Class<Doc>>>,
  query: string,
  categories: ObjectSearchCategory[]
): Promise<SearchSection[]> {
  const sections: SearchSection[] = []
  const promises: Array<Promise<SearchSection | undefined>> = []
  for (const cl of classes) {
    promises.push(searchCategory(client, cl, query, categories))
  }

  const resolvedSections = await Promise.all(promises)
  for (const s of resolvedSections) {
    if (s !== undefined) sections.push(s)
  }

  return sections.sort((a, b) => {
    const maxScoreA = Math.max(...(a?.items ?? []).map((obj) => obj?.score ?? 0))
    const maxScoreB = Math.max(...(b?.items ?? []).map((obj) => obj?.score ?? 0))
    return maxScoreB - maxScoreA
  })
}

const categoriesByContext = new Map<string, ObjectSearchCategory[]>()

export async function searchFor (
  context: 'mention' | 'spotlight',
  query: string
): Promise<{ items: SearchItem[], query: string }> {
  const client = getClient()
  let categories = categoriesByContext.get(context)
  if (categories === undefined) {
    categories = await client.findAll(plugin.class.ObjectSearchCategory, { context })
    categoriesByContext.set(context, categories)
  }

  if (categories === undefined) {
    return { items: [], query }
  }

  const classesToSearch: Array<Ref<Class<Doc>>> = []
  for (const cat of categories) {
    if (cat.classToSearch !== undefined) {
      classesToSearch.push(cat.classToSearch)
    }
  }

  const sections = await doFulltextSearch(client, classesToSearch, query, categories)
  return { items: packSearchResultsForListView(sections), query }
}
