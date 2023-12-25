import { Hierarchy, Ref, RefTo, Class, Doc, SearchResultDoc, docKey } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'

import plugin from './plugin'
import { IndexedDoc, SearchPresenter, ClassSearchConfigProps, SearchScoring } from './types'

interface IndexedReader {
  get: (attribute: string) => any
  getDoc: (attribute: string) => IndexedReader | undefined
}

// TODO: Rework to use mongo
function createIndexedReader (
  _class: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  doc: IndexedDoc,
  refAttribute?: string
): IndexedReader {
  return {
    get: (attr: string) => {
      const realAttr = hierarchy.findAttribute(_class, attr)
      if (realAttr !== undefined) {
        return doc[docKey(attr, { refAttribute, _class: realAttr.attributeOf })]
      }
      return undefined
    },
    getDoc: (attr: string) => {
      const realAttr = hierarchy.findAttribute(_class, attr)
      if (realAttr !== undefined) {
        const refAtrr = realAttr.type as RefTo<Doc>
        return createIndexedReader(refAtrr.to, hierarchy, doc, docKey(attr, { _class }))
      }
      return undefined
    }
  }
}

function readAndMapProps (reader: IndexedReader, props: ClassSearchConfigProps[]): Record<string, any> {
  const res: Record<string, any> = {}
  for (const prop of props) {
    if (typeof prop === 'string') {
      res[prop] = reader.get(prop)
    } else {
      for (const [propName, rest] of Object.entries(prop)) {
        if (rest.length > 1) {
          const val = reader.getDoc(rest[0])?.get(rest[1])
          res[propName] = Array.isArray(val) ? val[0] : val
        }
      }
    }
  }
  return res
}

function findSearchPresenter (hierarchy: Hierarchy, _class: Ref<Class<Doc>>): SearchPresenter | undefined {
  const ancestors = hierarchy.getAncestors(_class).reverse()
  for (const _class of ancestors) {
    const searchMixin = hierarchy.classHierarchyMixin(_class, plugin.mixin.SearchPresenter)
    if (searchMixin !== undefined) {
      return searchMixin
    }
  }
  return undefined
}

/**
 * @public
 */
export async function updateDocWithPresenter (hierarchy: Hierarchy, doc: IndexedDoc): Promise<void> {
  const searchPresenter = findSearchPresenter(hierarchy, doc._class)
  if (searchPresenter === undefined) {
    return
  }

  const reader = createIndexedReader(doc._class, hierarchy, doc)

  const props = [
    {
      name: 'searchTitle',
      config: searchPresenter.searchConfig.title,
      provider: searchPresenter.getSearchTitle
    }
  ]

  if (searchPresenter.searchConfig.shortTitle !== undefined) {
    props.push({
      name: 'searchShortTitle',
      config: searchPresenter.searchConfig.shortTitle,
      provider: searchPresenter.getSearchShortTitle
    })
  }

  for (const prop of props) {
    let value
    if (typeof prop.config === 'string') {
      value = reader.get(prop.config)
    } else if (prop.config.tmpl !== undefined) {
      const tmpl = prop.config.tmpl
      const renderProps = readAndMapProps(reader, prop.config.props)
      value = fillTemplate(tmpl, renderProps)
    } else if (prop.provider !== undefined) {
      const func = await getResource(prop.provider)
      const renderProps = readAndMapProps(reader, prop.config.props)
      value = func(hierarchy, { _class: doc._class, ...renderProps })
    }
    doc[prop.name] = value
  }
}

export function getScoringConfig (hierarchy: Hierarchy, classes: Ref<Class<Doc>>[]): SearchScoring[] {
  let results: SearchScoring[] = []
  for (const _class of classes) {
    const searchPresenter = findSearchPresenter(hierarchy, _class)
    if (searchPresenter?.searchConfig.scoring !== undefined) {
      results = results.concat(searchPresenter?.searchConfig.scoring)
    }
  }
  return results
}

/**
 * @public
 */
export function mapSearchResultDoc (hierarchy: Hierarchy, raw: IndexedDoc): SearchResultDoc {
  const doc: SearchResultDoc = {
    id: raw.id,
    title: raw.searchTitle,
    shortTitle: raw.searchShortTitle,
    doc: {
      _id: raw.id,
      _class: raw._class
    }
  }

  const searchPresenter = findSearchPresenter(hierarchy, doc.doc._class)
  if (searchPresenter?.searchConfig.icon !== undefined) {
    doc.icon = searchPresenter.searchConfig.icon
  }
  if (searchPresenter?.searchConfig.iconConfig !== undefined) {
    doc.iconComponent = searchPresenter.searchConfig.iconConfig.component
    doc.iconProps = readAndMapProps(
      createIndexedReader(raw._class, hierarchy, raw),
      searchPresenter.searchConfig.iconConfig.props
    )
  }

  return doc
}

function fillTemplate (tmpl: string, props: Record<string, any>): string {
  return tmpl.replace(/{(.*?)}/g, (_, key: string) => props[key])
}
