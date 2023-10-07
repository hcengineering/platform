//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import core, {
  AccountRole,
  AggregateValue,
  AttachedDoc,
  CategoryType,
  Class,
  Client,
  Collection,
  Doc,
  DocumentUpdate,
  Hierarchy,
  Lookup,
  Obj,
  Ref,
  RefTo,
  ReverseLookup,
  ReverseLookups,
  Space,
  TxOperations,
  getCurrentAccount,
  getObjectValue
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import { getResource } from '@hcengineering/platform'
import { AttributeCategory, KeyedAttribute, getAttributePresenterClass, hasResource } from '@hcengineering/presentation'
import {
  AnyComponent,
  ErrorPresenter,
  Location,
  getCurrentResolvedLocation,
  getPanelURI,
  getPlatformColorForText,
  locationToUrl,
  navigate
} from '@hcengineering/ui'
import type { BuildModelOptions, Viewlet, ViewletDescriptor } from '@hcengineering/view'
import view, { AttributeModel, BuildModelKey } from '@hcengineering/view'

import { get, writable } from 'svelte/store'
import plugin from './plugin'
import { noCategory } from './viewOptions'

export { getFiltredKeys, isCollectionAttr } from '@hcengineering/presentation'

/**
 * Define some properties to be used to show component until data is properly loaded.
 */
export interface LoadingProps {
  length: number
}

/**
 * @public
 */
export async function getObjectPresenter (
  client: Client,
  _class: Ref<Class<Obj>>,
  preserveKey: BuildModelKey,
  isCollectionAttr: boolean = false,
  checkResource = false
): Promise<AttributeModel | undefined> {
  const hierarchy = client.getHierarchy()
  const mixin = isCollectionAttr ? view.mixin.CollectionPresenter : view.mixin.ObjectPresenter
  const clazz = hierarchy.getClass(_class)

  const presenterMixin = hierarchy.classHierarchyMixin(_class, mixin, (m) => !checkResource || hasResource(m.presenter))
  if (presenterMixin?.presenter === undefined) {
    console.error(
      `object presenter not found for class=${_class}, mixin=${mixin}, preserve key ${JSON.stringify(preserveKey)}`
    )
    return undefined
  }
  const presenter = await getResource(presenterMixin.presenter)
  const key = preserveKey.sortingKey ?? preserveKey.key
  const sortingKey = Array.isArray(key)
    ? key
    : clazz.sortingKey !== undefined
      ? key.length > 0
        ? key + '.' + clazz.sortingKey
        : clazz.sortingKey
      : key
  return {
    key: preserveKey.key,
    _class,
    label: preserveKey.label ?? clazz.label,
    presenter,
    displayProps: preserveKey.displayProps,
    props: preserveKey.props,
    sortingKey,
    collectionAttr: isCollectionAttr,
    isLookup: false
  }
}

/**
 * @public
 */
export async function getListItemPresenter (client: Client, _class: Ref<Class<Obj>>): Promise<AnyComponent | undefined> {
  const clazz = client.getHierarchy().getClass(_class)
  const presenterMixin = client.getHierarchy().as(clazz, view.mixin.ListItemPresenter)
  if (presenterMixin.presenter === undefined) {
    if (clazz.extends !== undefined) {
      return await getListItemPresenter(client, clazz.extends)
    }
  }
  return presenterMixin?.presenter
}

/**
 * @public
 */
export async function getObjectPreview (client: Client, _class: Ref<Class<Obj>>): Promise<AnyComponent | undefined> {
  const hierarchy = client.getHierarchy()
  const presenterMixin = hierarchy.classHierarchyMixin(_class, view.mixin.PreviewPresenter)
  return presenterMixin?.presenter
}

async function getAttributePresenter (
  client: Client,
  _class: Ref<Class<Obj>>,
  key: string,
  preserveKey: BuildModelKey
): Promise<AttributeModel> {
  const hierarchy = client.getHierarchy()
  const attribute = hierarchy.getAttribute(_class, key)
  const presenterClass = getAttributePresenterClass(hierarchy, attribute)
  const isCollectionAttr = presenterClass.category === 'collection'
  const mixin = isCollectionAttr ? view.mixin.CollectionPresenter : view.mixin.AttributePresenter
  const presenterMixin = hierarchy.classHierarchyMixin(presenterClass.attrClass, mixin)
  if (presenterMixin?.presenter === undefined) {
    throw new Error('attribute presenter not found for ' + JSON.stringify(preserveKey))
  }
  const resultKey = preserveKey.sortingKey ?? preserveKey.key
  const sortingKey = Array.isArray(resultKey)
    ? resultKey
    : attribute.type._class === core.class.ArrOf
      ? resultKey + '.length'
      : resultKey
  const presenter = await getResource(presenterMixin.presenter)

  return {
    key: preserveKey.key,
    sortingKey,
    _class: presenterClass.attrClass,
    label: preserveKey.label ?? attribute.shortLabel ?? attribute.label,
    presenter,
    props: preserveKey.props,
    displayProps: preserveKey.displayProps,
    icon: presenterMixin.icon,
    attribute,
    collectionAttr: isCollectionAttr,
    isLookup: false
  }
}

export async function getPresenter<T extends Doc> (
  client: Client,
  _class: Ref<Class<T>>,
  key: BuildModelKey,
  preserveKey: BuildModelKey,
  lookup?: Lookup<T>,
  isCollectionAttr: boolean = false
): Promise<AttributeModel> {
  if (key.presenter !== undefined) {
    const { presenter, label, sortingKey } = key
    return {
      key: key.key ?? '',
      sortingKey: sortingKey ?? '',
      _class,
      label: label as IntlString,
      presenter: typeof presenter === 'string' ? await getResource(presenter) : presenter,
      props: preserveKey.props,
      displayProps: preserveKey.displayProps,
      collectionAttr: isCollectionAttr,
      isLookup: false
    }
  }
  if (key.key.length === 0) {
    const p = await getObjectPresenter(client, _class, preserveKey, isCollectionAttr)
    if (p === undefined) {
      throw new Error(`object presenter not found for class=${_class}, preserve key ${JSON.stringify(preserveKey)}`)
    }
    return p
  } else {
    if (key.key.startsWith('$lookup')) {
      if (lookup === undefined) {
        throw new Error(`lookup class does not provided for ${key.key}`)
      }
      return await getLookupPresenter(client, _class, key, preserveKey, lookup)
    }
    return await getAttributePresenter(client, _class, key.key, preserveKey)
  }
}

function getKeyLookup<T extends Doc> (
  hierarchy: Hierarchy,
  _class: Ref<Class<T>>,
  key: string,
  lookup: Lookup<T>,
  lastIndex: number = 1
): Lookup<T> {
  if (!key.startsWith('$lookup')) return lookup
  const parts = key.split('.')
  const attrib = parts[1]
  const attribute = hierarchy.getAttribute(_class, attrib)
  if (hierarchy.isDerived(attribute.type._class, core.class.RefTo)) {
    const lookupClass = (attribute.type as RefTo<Doc>).to
    const index = key.indexOf('$lookup', lastIndex)
    if (index === -1) {
      if ((lookup as any)[attrib] === undefined) {
        ;(lookup as any)[attrib] = lookupClass
      }
    } else {
      let nested = Array.isArray((lookup as any)[attrib]) ? (lookup as any)[attrib][1] : {}
      nested = getKeyLookup(hierarchy, lookupClass, key.slice(index), nested)
      ;(lookup as any)[attrib] = [lookupClass, nested]
    }
  } else if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
    if ((lookup as any)._id === undefined) {
      ;(lookup as any)._id = {}
    }
    ;(lookup as any)._id[attrib] = (attribute.type as Collection<AttachedDoc>).of
  }
  return lookup
}

export function buildConfigLookup<T extends Doc> (
  hierarchy: Hierarchy,
  _class: Ref<Class<T>>,
  config: Array<BuildModelKey | string>,
  existingLookup?: Lookup<T>
): Lookup<T> {
  let res: Lookup<T> = {}
  for (const key of config) {
    if (typeof key === 'string') {
      res = getKeyLookup(hierarchy, _class, key, res)
    } else {
      res = getKeyLookup(hierarchy, _class, key.key, res)
    }
  }
  if (existingLookup !== undefined) {
    // Let's merg
    const _id: ReverseLookup = {
      ...((existingLookup as ReverseLookups)._id ?? {}),
      ...((res as ReverseLookups)._id ?? {})
    }
    res = { ...existingLookup, ...res, _id }
  }
  return res
}

export async function buildModel (options: BuildModelOptions): Promise<AttributeModel[]> {
  // eslint-disable-next-line array-callback-return
  const model = options.keys
    .map((key) => (typeof key === 'string' ? { key } : key))
    .map(async (key) => {
      try {
        // Check if it is a mixin attribute configuration
        const pos = key.key.lastIndexOf('.')
        if (pos !== -1) {
          const mixinName = key.key.substring(0, pos) as Ref<Class<Doc>>
          if (!mixinName.includes('$lookup')) {
            const realKey = key.key.substring(pos + 1)
            const rkey = { ...key, key: realKey }
            return {
              ...(await getPresenter(options.client, mixinName, rkey, rkey, options.lookup)),
              castRequest: mixinName,
              key: key.key,
              sortingKey: key.key
            }
          }
        }
        return await getPresenter(options.client, options._class, key, key, options.lookup)
      } catch (err: any) {
        if (options.ignoreMissing ?? false) {
          return undefined
        }
        const stringKey = key.label ?? key.key
        console.error('Failed to find presenter for', key, err)
        const errorPresenter: AttributeModel = {
          key: '',
          sortingKey: '',
          presenter: ErrorPresenter,
          label: stringKey as IntlString,
          _class: core.class.TypeString,
          props: { error: err },
          collectionAttr: false,
          isLookup: false
        }
        return errorPresenter
      }
    })
  return (await Promise.all(model)).filter((a) => a !== undefined) as AttributeModel[]
}

export async function deleteObject (client: TxOperations, object: Doc): Promise<void> {
  const currentAcc = getCurrentAccount()
  if (currentAcc.role !== AccountRole.Owner && object.createdBy !== currentAcc._id) return
  if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
    const adoc = object as AttachedDoc
    await client
      .removeCollection(object._class, object.space, adoc._id, adoc.attachedTo, adoc.attachedToClass, adoc.collection)
      .catch((err) => console.error(err))
  } else {
    await client.removeDoc(object._class, object.space, object._id).catch((err) => console.error(err))
  }
}

export async function deleteObjects (client: TxOperations, objects: Doc[]): Promise<void> {
  const currentAcc = getCurrentAccount()
  if (currentAcc.role !== AccountRole.Owner && objects.some((p) => p.createdBy !== currentAcc._id)) return
  const ops = client.apply('delete')
  for (const object of objects) {
    if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
      const adoc = object as AttachedDoc
      await ops
        .removeCollection(object._class, object.space, adoc._id, adoc.attachedTo, adoc.attachedToClass, adoc.collection)
        .catch((err) => console.error(err))
    } else {
      await ops.removeDoc(object._class, object.space, object._id).catch((err) => console.error(err))
    }
  }
  await ops.commit()
}

export function getMixinStyle (id: Ref<Class<Doc>>, selected: boolean, black: boolean): string {
  const color = getPlatformColorForText(id as string, black)
  return `
    color: ${selected ? '#fff' : 'var(--caption-color)'};
    background: ${color + (selected ? 'ff' : '33')};
    border: 1px solid ${color + (selected ? '0f' : '66')};
  `
}

async function getLookupPresenter<T extends Doc> (
  client: Client,
  _class: Ref<Class<T>>,
  key: BuildModelKey,
  preserveKey: BuildModelKey,
  lookup: Lookup<T>
): Promise<AttributeModel> {
  const lookupClass = getLookupClass(key.key, lookup, _class)
  const lookupProperty = getLookupProperty(key.key)
  const lookupKey = { ...key, key: lookupProperty[0] }
  const model = await getPresenter(client, lookupClass[0], lookupKey, preserveKey, undefined, lookupClass[2])
  model.label = getLookupLabel(client, lookupClass[1], lookupClass[0], lookupKey, lookupProperty[1])
  model.isLookup = true
  return model
}

export function getLookupLabel<T extends Doc> (
  client: Client,
  _class: Ref<Class<T>>,
  lookupClass: Ref<Class<Doc>>,
  key: BuildModelKey,
  attrib: string
): IntlString {
  if (key.label !== undefined) return key.label
  if (key.key === '') {
    try {
      const attribute = client.getHierarchy().getAttribute(_class, attrib)
      return attribute.label
    } catch {}
    const clazz = client.getHierarchy().getClass(lookupClass)
    return clazz.label
  } else {
    const attribute = client.getHierarchy().getAttribute(lookupClass, key.key)
    return attribute.label
  }
}

export function getLookupClass<T extends Doc> (
  key: string,
  lookup: Lookup<T>,
  parent: Ref<Class<T>>
): [Ref<Class<Doc>>, Ref<Class<Doc>>, boolean] {
  const _class = getLookup(key, lookup, parent)
  if (_class === undefined) {
    throw new Error('lookup class does not provided for ' + key)
  }
  return _class
}

export function getLookupProperty (key: string): [string, string] {
  const parts = key.split('$lookup')
  const lastPart = parts[parts.length - 1]
  const split = lastPart.split('.').filter((p) => p.length > 0)
  const prev = split.shift() ?? ''
  const result = split.join('.')
  return [result, prev]
}

function getLookup (
  key: string,
  lookup: Lookup<any>,
  parent: Ref<Class<Doc>>
): [Ref<Class<Doc>>, Ref<Class<Doc>>, boolean] | undefined {
  const parts = key.split('$lookup.').filter((p) => p.length > 0)
  const currentKey = parts[0].split('.').filter((p) => p.length > 0)[0]
  const current = (lookup as any)[currentKey]
  const nestedKey = parts.slice(1).join('$lookup.')
  if (nestedKey.length > 0) {
    if (!Array.isArray(current)) {
      return
    }
    return getLookup(nestedKey, current[1], current[0])
  }
  if (Array.isArray(current)) {
    return [current[0], parent, false]
  }
  if (current === undefined && lookup._id !== undefined) {
    const reverse = (lookup._id as any)[currentKey]
    return reverse !== undefined
      ? Array.isArray(reverse)
        ? [reverse[0], parent, true]
        : [reverse, parent, true]
      : undefined
  }
  return current !== undefined ? [current, parent, false] : undefined
}

export function getBooleanLabel (value: boolean | undefined): IntlString {
  if (value === true) return plugin.string.LabelYes
  if (value === false) return plugin.string.LabelNo
  return plugin.string.LabelNA
}
export function getCollectionCounter (hierarchy: Hierarchy, object: Doc, key: KeyedAttribute): number {
  if (hierarchy.isMixin(key.attr.attributeOf)) {
    return (hierarchy.as(object, key.attr.attributeOf) as any)[key.key]
  }
  return (object as any)[key.key] ?? 0
}

export interface CategoryKey {
  key: KeyedAttribute
  category: AttributeCategory
}

export function categorizeFields (
  hierarchy: Hierarchy,
  keys: KeyedAttribute[],
  useAsCollection: string[],
  useAsAttribute: string[]
): {
    attributes: CategoryKey[]
    collections: CategoryKey[]
  } {
  const result = {
    attributes: [] as CategoryKey[],
    collections: [] as CategoryKey[]
  }

  for (const key of keys) {
    const cl = getAttributePresenterClass(hierarchy, key.attr)
    if (useAsCollection.includes(key.key)) {
      result.collections.push({ key, category: cl.category })
    } else if (useAsAttribute.includes(key.key)) {
      result.attributes.push({ key, category: cl.category })
    } else if (cl.category === 'collection' || cl.category === 'inplace') {
      result.collections.push({ key, category: cl.category })
    } else if (cl.category === 'array') {
      const attrClass = getAttributePresenterClass(hierarchy, key.attr)
      const clazz = hierarchy.getClass(attrClass.attrClass)
      const mix = hierarchy.as(clazz, view.mixin.ArrayEditor)
      if (mix.editor !== undefined && mix.inlineEditor === undefined) {
        result.collections.push({ key, category: cl.category })
      } else {
        result.attributes.push({ key, category: cl.category })
      }
    } else {
      result.attributes.push({ key, category: cl.category })
    }
  }
  return result
}

export function makeViewletKey (loc?: Location): string {
  loc = loc != null ? { path: loc.path } : getCurrentResolvedLocation()
  loc.fragment = undefined
  loc.query = undefined
  return 'viewlet' + locationToUrl(loc)
}

function getSavedViewlets (): Record<string, Ref<Viewlet> | null> {
  const res: Record<string, Ref<Viewlet> | null> = {}
  const keys = Object.keys(localStorage)
  for (const key of keys) {
    if (!key.startsWith('viewlet')) continue
    const item = localStorage.getItem(key) as Ref<Viewlet> | null
    res[key] = item
  }
  return res
}

export const activeViewlet = writable<Record<string, Ref<Viewlet> | null>>(getSavedViewlets())

export function setActiveViewletId (viewletId: Ref<Viewlet> | null, loc?: Location): void {
  const key = makeViewletKey(loc)
  const current = get(activeViewlet) ?? {}
  if (viewletId !== null && viewletId !== undefined) {
    localStorage.setItem(key, viewletId)
    current[key] = viewletId
  } else {
    localStorage.removeItem(key)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete current[key]
  }
  activeViewlet.set(current)
}

export function getActiveViewletId (): Ref<Viewlet> | null {
  const key = makeViewletKey()
  return localStorage.getItem(key) as Ref<Viewlet> | null
}

/**
 * Updates the active viewlet, if one was found.
 * Otherwise sets the default viewlet.
 *
 * @export
 * @param {readonly Viewlet[]} viewlets
 * @param {(Ref<Viewlet> | null | undefined)} activeViewletId
 * @returns {(Viewlet | undefined)}
 */
export function updateActiveViewlet (
  viewlets: readonly Viewlet[],
  activeViewletId: Ref<Viewlet> | null | undefined
): Viewlet | undefined {
  if (viewlets.length === 0) {
    return
  }

  let viewlet: Viewlet | undefined

  if (activeViewletId !== null && activeViewletId !== undefined) {
    viewlet = viewlets.find((viewlet) => viewlet._id === activeViewletId)
  }
  viewlet ??= viewlets[0]

  setActiveViewletId(viewlet._id)

  return viewlet
}

export type FixedWidthStore = Record<string, number>

export const fixedWidthStore = writable<FixedWidthStore>({})

export function groupBy<T extends Doc> (docs: T[], key: string, categories?: CategoryType[]): Record<any, T[]> {
  return docs.reduce((storage: { [key: string]: T[] }, item: T) => {
    let group = getObjectValue(key, item) ?? undefined

    if (categories !== undefined) {
      for (const c of categories) {
        if (typeof c === 'object') {
          const st = c.values.find((it) => it._id === group)
          if (st !== undefined) {
            group = st.name
            break
          }
        }
      }
    }

    storage[group] = storage[group] ?? []
    storage[group].push(item)

    return storage
  }, {})
}

/**
 * @public
 */
export function getGroupByValues<T extends Doc> (groupByDocs: Record<any, T[]>, category: CategoryType): T[] {
  if (typeof category === 'object') {
    return groupByDocs[category.name as any] ?? []
  } else {
    return groupByDocs[category as any] ?? []
  }
}

/**
 * @public
 */
export function setGroupByValues (
  groupByDocs: Record<string | number, Doc[]>,
  category: CategoryType,
  docs: Doc[]
): void {
  if (typeof category === 'object') {
    groupByDocs[category.name as any] = docs
  } else if (category !== undefined) {
    groupByDocs[category] = docs
  }
}

/**
 * Group category references into categories.
 * @public
 */
export async function groupByCategory (
  client: TxOperations,
  _class: Ref<Class<Doc>>,
  space: Ref<Space> | undefined,
  key: string,
  categories: CategoryType[],
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<CategoryType[]> {
  const h = client.getHierarchy()
  const attr = h.getAttribute(_class, key)
  if (attr === undefined) return categories
  if (key === noCategory) return [undefined]

  const attrClass = getAttributePresenterClass(h, attr).attrClass
  const mixin = h.classHierarchyMixin(attrClass, view.mixin.Groupping)
  let existingCategories: any[] = []

  if (mixin?.grouppingManager !== undefined) {
    const grouppingManager = await getResource(mixin.grouppingManager)
    existingCategories = grouppingManager.groupByCategories(categories)
  } else {
    const valueSet = new Set<any>()
    for (const v of categories) {
      if (!valueSet.has(v)) {
        valueSet.add(v)
        existingCategories.push(v)
      }
    }
  }
  return await sortCategories(client, attrClass, space, existingCategories, viewletDescriptorId)
}

export async function getCategories (
  client: TxOperations,
  _class: Ref<Class<Doc>>,
  space: Ref<Space> | undefined,
  docs: Doc[],
  key: string,
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<CategoryType[]> {
  if (key === noCategory) return [undefined]

  return await groupByCategory(
    client,
    _class,
    space,
    key,
    docs.map((it) => getObjectValue(key, it) ?? undefined),
    viewletDescriptorId
  )
}

/**
 * @public
 */
export function getCategorySpaces (categories: CategoryType[]): Array<Ref<Space>> {
  return Array.from(
    (categories.filter((it) => typeof it === 'object') as AggregateValue[]).reduce<Set<Ref<Space>>>((arr, val) => {
      val.values.forEach((it) => arr.add(it.space))
      return arr
    }, new Set())
  )
}

export function concatCategories (arr1: CategoryType[], arr2: CategoryType[]): CategoryType[] {
  const uniqueValues: Set<string | number | undefined> = new Set()
  const uniqueObjects: Map<string | number, AggregateValue> = new Map()

  for (const item of arr1) {
    if (typeof item === 'object') {
      const id = item.name
      uniqueObjects.set(id as any, item)
    } else {
      uniqueValues.add(item)
    }
  }

  for (const item of arr2) {
    if (typeof item === 'object') {
      const id = item.name
      if (!uniqueObjects.has(id as any)) {
        uniqueObjects.set(id as any, item)
      }
    } else {
      uniqueValues.add(item)
    }
  }

  return [...uniqueValues, ...uniqueObjects.values()]
}

/**
 * @public
 */
export async function sortCategories (
  client: TxOperations,
  attrClass: Ref<Class<Doc>>,
  space: Ref<Space> | undefined,
  existingCategories: any[],
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<any[]> {
  const hierarchy = client.getHierarchy()
  const clazz = hierarchy.getClass(attrClass)
  const sortFunc = hierarchy.as(clazz, view.mixin.SortFuncs)
  if (sortFunc?.func === undefined) {
    return existingCategories
  }
  const f = await getResource(sortFunc.func)
  return await f(client, existingCategories, space, viewletDescriptorId)
}

export function getKeyLabel<T extends Doc> (
  client: TxOperations,
  _class: Ref<Class<T>>,
  key: string,
  lookup: Lookup<T> | undefined
): IntlString {
  if (key.startsWith('$lookup') && lookup !== undefined) {
    const lookupClass = getLookupClass(key, lookup, _class)
    const lookupProperty = getLookupProperty(key)
    const lookupKey = { key: lookupProperty[0] }
    return getLookupLabel(client, lookupClass[1], lookupClass[0], lookupKey, lookupProperty[1])
  } else if (key.length === 0) {
    const clazz = client.getHierarchy().getClass(_class)
    return clazz.label
  } else {
    const attribute = client.getHierarchy().getAttribute(_class, key)
    return attribute.label
  }
}

/**
 * @public
 * Implemenation of cosice similarity
 */
export function cosinesim (A: number[], B: number[]): number {
  let dotproduct = 0
  let mA = 0
  let mB = 0
  for (let i = 0; i < A.length; i++) {
    dotproduct += A[i] * B[i]
    mA += A[i] * A[i]
    mB += B[i] * B[i]
  }
  mA = Math.sqrt(mA)
  mB = Math.sqrt(mB)
  const similarity = dotproduct / (mA * mB) // here you needed extra brackets
  return similarity
}

/**
 * Calculate Sørensen–Dice coefficient
 */
export function calcSørensenDiceCoefficient (a: string, b: string): number {
  const first = a.replace(/\s+/g, '')
  const second = b.replace(/\s+/g, '')

  if (first === second) return 1 // identical or empty
  if (first.length < 2 || second.length < 2) return 0 // if either is a 0-letter or 1-letter string

  const firstBigrams = new Map<string, number>()
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substring(i, i + 2)
    const count = (firstBigrams.get(bigram) ?? 0) + 1

    firstBigrams.set(bigram, count)
  }

  let intersectionSize = 0
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substring(i, i + 2)
    const count = firstBigrams.get(bigram) ?? 0

    if (count > 0) {
      firstBigrams.set(bigram, count - 1)
      intersectionSize++
    }
  }

  return (2.0 * intersectionSize) / (first.length + second.length - 2)
}

/**
 * @public
 */
export async function moveToSpace (
  client: TxOperations,
  doc: Doc,
  space: Ref<Space>,
  extra?: DocumentUpdate<any>
): Promise<void> {
  const hierarchy = client.getHierarchy()
  const attributes = hierarchy.getAllAttributes(doc._class)
  for (const [name, attribute] of attributes) {
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
      const collection = attribute.type as Collection<AttachedDoc>
      const allAttached = await client.findAll(collection.of, { attachedTo: doc._id })
      for (const attached of allAttached) {
        // Do not use extra for childs.
        await moveToSpace(client, attached, space).catch((err) => console.log('failed to move', name, err))
      }
    }
  }
  await client.update(doc, {
    space,
    ...extra
  })
}

/**
 * @public
 */
export function getAdditionalHeader (client: TxOperations, _class: Ref<Class<Doc>>): AnyComponent[] | undefined {
  try {
    const hierarchy = client.getHierarchy()
    const presenterMixin = hierarchy.classHierarchyMixin(_class, view.mixin.ListHeaderExtra)
    return presenterMixin?.presenters?.filter((it) => hasResource(it))
  } catch (e: any) {
    if (((e?.message as string) ?? '').includes('class not found')) {
      return undefined
    }
    throw e
  }
}

export async function getObjectLinkFragment (
  hierarchy: Hierarchy,
  object: Doc,
  props: Record<string, any> = {},
  component: AnyComponent = view.component.EditDoc
): Promise<Location> {
  const provider = hierarchy.classHierarchyMixin(Hierarchy.mixinOrClass(object), view.mixin.LinkProvider, (m) =>
    hasResource(m.encode)
  )
  if (provider?.encode !== undefined) {
    const f = await getResource(provider.encode)
    const res = await f(object, props)
    if (res !== undefined) {
      return res
    }
  }
  const loc = getCurrentResolvedLocation()
  if (hasResource(component)) {
    loc.fragment = getPanelURI(component, object._id, Hierarchy.mixinOrClass(object), 'content')
  }
  return loc
}

export function isAttachedDoc (doc: Doc | AttachedDoc): doc is AttachedDoc {
  return 'attachedTo' in doc
}

export function enabledConfig (config: Array<string | BuildModelKey>, key: string): boolean {
  for (const value of config) {
    if (typeof value === 'string') {
      if (value === key) return true
    } else {
      if (value.key === key) return true
    }
  }
  return false
}

export async function openDoc (hierarchy: Hierarchy, object: Doc): Promise<void> {
  const panelComponent = hierarchy.classHierarchyMixin(object._class, view.mixin.ObjectPanel)
  const comp = panelComponent?.component ?? view.component.EditDoc
  const loc = await getObjectLinkFragment(hierarchy, object, {}, comp)
  navigate(loc)
}
