import {
  docKey,
  type Branding,
  type Class,
  type Doc,
  type DocIndexState,
  type Hierarchy,
  type Ref,
  type RefTo,
  type SearchResultDoc
} from '@hcengineering/core'
import { getResource, type Resource } from '@hcengineering/platform'

import plugin, {
  type ClassSearchConfigProps,
  type IndexedDoc,
  type SearchPresenter,
  type SearchPresenterFunc,
  type SearchScoring
} from '@hcengineering/server-core'

interface IndexedReader {
  get: (attribute: string) => any
  getDoc: (attribute: string) => IndexedReader | undefined
}

// TODO: Rework to use mongo
function createIndexedReader (
  _class: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  doc: DocIndexState,
  otherDocs?: Record<string, DocIndexState | undefined>,
  refAttribute?: string
): IndexedReader {
  return {
    get: (attr: string) => {
      const realAttr = hierarchy.findAttribute(_class, attr)
      if (realAttr !== undefined) {
        return doc.attributes[docKey(attr, { _class: realAttr.attributeOf })] ?? (doc as any)[attr]
      }
      return undefined
    },
    getDoc: (attr: string) => {
      const realAttr = hierarchy.findAttribute(_class, attr)
      if (realAttr !== undefined) {
        const anotherDoc = otherDocs?.[attr]
        if (anotherDoc !== undefined) {
          const refAtrr = realAttr.type as RefTo<Doc>
          return createIndexedReader(refAtrr.to, hierarchy, anotherDoc, otherDocs, docKey(attr, { _class }))
        }
      }
      return undefined
    }
  }
}

async function readAndMapProps (
  reader: IndexedReader,
  props: ClassSearchConfigProps[],
  searchProvider?: {
    hierarchy: Hierarchy
    providers: SearchPresenterFunc
  }
): Promise<Record<string, any>> {
  const res: Record<string, any> = {}
  for (const prop of props) {
    if (typeof prop === 'string') {
      res[prop] = reader.get(prop)
    } else {
      for (const [propName, rest] of Object.entries(prop)) {
        if (rest.length > 1) {
          const val = reader.getDoc(rest[0])?.get(rest[1])
          const v = Array.isArray(val) ? val[0] : val
          if (searchProvider !== undefined) {
            const func =
              searchProvider.providers !== undefined && Object.keys(searchProvider.providers).includes(propName)
                ? ((await getResource(searchProvider.providers[propName])) as any)
                : undefined
            if (func !== undefined) {
              res[propName] = func(searchProvider.hierarchy, { _class: res?._class, [propName]: v })
              continue
            }
          }
          res[propName] = v
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
export async function updateDocWithPresenter (
  hierarchy: Hierarchy,
  doc: DocIndexState,
  elasticDoc: IndexedDoc,
  refDocs: {
    parentDoc: DocIndexState | undefined
    spaceDoc: DocIndexState | undefined
  },
  branding: Branding | null
): Promise<void> {
  const searchPresenter = findSearchPresenter(hierarchy, doc.objectClass)
  if (searchPresenter === undefined) {
    return
  }

  const reader = createIndexedReader(doc.objectClass, hierarchy, doc, {
    space: refDocs.spaceDoc,
    attachedTo: refDocs.parentDoc
  })

  const props = [
    {
      name: 'searchTitle',
      config: searchPresenter.searchConfig.title,
      provider: searchPresenter.getSearchTitle
    }
  ] as any[]

  if (searchPresenter.searchConfig.shortTitle !== undefined) {
    props.push({
      name: 'searchShortTitle',
      config: searchPresenter.searchConfig.shortTitle,
      provider: searchPresenter.getSearchShortTitle,
      lastNameFirst: branding?.lastNameFirst
    })
  }

  if (searchPresenter.searchConfig.iconConfig !== undefined) {
    props.push({
      name: 'searchIcon',
      config: searchPresenter.searchConfig.iconConfig
    })
  }

  for (const prop of props) {
    let value
    if (prop.config.tmpl !== undefined) {
      const tmpl = prop.config.tmpl
      const renderProps = await readAndMapProps(reader, prop.config.props, { hierarchy, providers: prop.provider })
      value = fillTemplate(tmpl, renderProps)
    } else if (typeof prop.config === 'string') {
      value = reader.get(prop.config)
    } else if (prop.provider !== undefined) {
      const func = await getResource(Object.values(prop.provider)[0] as Resource<any>)
      const renderProps = await readAndMapProps(reader, prop.config.props)
      value = func(hierarchy, { _class: doc.objectClass, ...renderProps })
    } else if (prop.name === 'searchIcon') {
      value = await readAndMapProps(reader, prop.config.props)
    }
    elasticDoc[prop.name] = value
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
    iconProps: raw.searchIcon,
    doc: {
      _id: raw.id,
      _class: raw._class[0]
    },
    score: raw._score
  }

  const searchPresenter = findSearchPresenter(hierarchy, doc.doc._class)
  if (searchPresenter?.searchConfig.icon !== undefined) {
    doc.icon = searchPresenter.searchConfig.icon
  }
  if (searchPresenter?.searchConfig.iconConfig !== undefined) {
    doc.iconComponent = searchPresenter.searchConfig.iconConfig.component
  }

  return doc
}

function fillTemplate (tmpl: string, props: Record<string, any>): string {
  return tmpl.replace(/{(.*?)}/g, (_, key: string) => props[key])
}
