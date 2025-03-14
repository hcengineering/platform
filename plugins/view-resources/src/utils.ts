//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2024 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import core, {
  AccountRole,
  ClassifierKind,
  DocManager,
  Hierarchy,
  SortingOrder,
  TxProcessor,
  getCurrentAccount,
  getObjectValue,
  type PersonId,
  type AggregateValue,
  type AnyAttribute,
  type AttachedDoc,
  type CategoryType,
  type Class,
  type Client,
  type Collection,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type FindOptions,
  type Lookup,
  type Mixin,
  type Obj,
  type Ref,
  type RefTo,
  type ReverseLookup,
  type ReverseLookups,
  type Space,
  type Tx,
  type TxCUD,
  type TxCreateDoc,
  type TxMixin,
  type TxOperations,
  type TxUpdateDoc,
  type TypeAny,
  type TypedSpace,
  type WithLookup
} from '@hcengineering/core'
import { type Restrictions } from '@hcengineering/guest'
import type { Asset, IntlString } from '@hcengineering/platform'
import { getResource, translate } from '@hcengineering/platform'
import {
  createQuery,
  getAttributePresenterClass,
  getClient,
  getFiltredKeys,
  getRawLiveQuery,
  hasResource,
  isAdminUser,
  type KeyedAttribute
} from '@hcengineering/presentation'
import { type CollaborationUser } from '@hcengineering/text-editor'
import {
  ErrorPresenter,
  getColorNumberByText,
  getCurrentResolvedLocation,
  getPanelURI,
  getPlatformColorForText,
  locationToUrl,
  navigate,
  resolvedLocationStore,
  themeStore,
  type AnyComponent,
  type AnySvelteComponent,
  type Location
} from '@hcengineering/ui'
import view, {
  AttributeCategoryOrder,
  type AttributeCategory,
  type AttributeModel,
  type AttributePresenter,
  type BuildModelKey,
  type BuildModelOptions,
  type CollectionPresenter,
  type IAggregationManager,
  type LinkIdProvider,
  type Viewlet,
  type ViewletDescriptor
} from '@hcengineering/view'

import contact, {
  getCurrentEmployee,
  getAllSocialStringsByPersonRef,
  getName,
  type Contact
} from '@hcengineering/contact'
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
export class AggregationManager<T extends Doc> implements IAggregationManager<T> {
  docs: T[] | undefined
  mgr: DocManager<T> | Promise<DocManager<T>> | undefined
  query: (() => void) | undefined
  lqCallback: () => void
  private readonly setStore: (manager: DocManager<T>) => void
  private readonly filter: (doc: T, target: T) => boolean
  private readonly _class: Ref<Class<T>>

  private constructor (
    client: Client,
    lqCallback: () => void,
    setStore: (manager: DocManager<T>) => void,
    categorizingFunc: (doc: T, target: T) => boolean,
    _class: Ref<Class<T>>
  ) {
    this.lqCallback = lqCallback ?? (() => {})
    this.setStore = setStore
    this.filter = categorizingFunc
    this._class = _class
    void this.getManager()
  }

  static create<T extends Doc>(
    client: Client,
    lqCallback: () => void,
    setStore: (manager: DocManager<T>) => void,
    categorizingFunc: (doc: T, target: T) => boolean,
    _class: Ref<Class<T>>
  ): AggregationManager<T> {
    return new AggregationManager<T>(client, lqCallback, setStore, categorizingFunc, _class)
  }

  private async getManager (): Promise<DocManager<T>> {
    if (this.mgr !== undefined) {
      if (this.mgr instanceof Promise) {
        this.mgr = await this.mgr
      }
      return this.mgr
    }
    this.mgr = new Promise<DocManager<T>>((resolve) => {
      this.query = getRawLiveQuery().query(
        this._class,
        {},
        (res) => {
          const first = this.docs === undefined
          this.docs = res
          this.mgr = new DocManager<T>(res as T[])
          this.setStore(this.mgr)
          if (!first) {
            this.lqCallback()
          }
          resolve(this.mgr)
        },
        {
          sort: {
            label: SortingOrder.Ascending
          }
        }
      )
    })

    return await this.mgr
  }

  close (): void {
    this.query?.()
  }

  async notifyTx (...tx: Tx[]): Promise<void> {
    // This is intentional
  }

  getAttrClass (): Ref<Class<T>> {
    return this._class
  }

  async categorize (target: Array<Ref<T>>, attr: AnyAttribute): Promise<Array<Ref<T>>> {
    const mgr = await this.getManager()
    for (const sid of [...target]) {
      const c = mgr.getIdMap().get(sid) as WithLookup<T>
      if (c !== undefined) {
        let docs = mgr.getDocs()
        docs = docs.filter((it: T) => this.filter(it, c))
        target.push(...docs.map((it) => it._id))
      }
    }
    return target.filter((it, idx, arr) => arr.indexOf(it) === idx)
  }
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

  const presenterMixin = hierarchy.classHierarchyMixin(
    _class,
    mixin,
    (m) => !checkResource || hasResource(m.presenter) === true
  )
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

export async function getAttributePresenter (
  client: Client,
  _class: Ref<Class<Obj>>,
  key: string,
  preserveKey: BuildModelKey,
  mixinClass?: Ref<Mixin<CollectionPresenter>>,
  _category?: AttributeCategory
): Promise<AttributeModel> {
  const actualMixinClass = mixinClass ?? view.mixin.AttributePresenter

  const hierarchy = client.getHierarchy()
  const attribute = hierarchy.getAttribute(_class, key)
  let { attrClass, category } = getAttributePresenterClass(hierarchy, attribute)
  if (_category !== undefined) {
    category = _category
  }

  let overridedPresenter = await client
    .getModel()
    .findOne(view.class.AttrPresenter, { objectClass: _class, attribute: attribute._id, category })
  if (overridedPresenter === undefined) {
    overridedPresenter = await client
      .getModel()
      .findOne(view.class.AttrPresenter, { attribute: attribute._id, category })
  }

  const isCollectionAttr = category === 'collection'
  const mixin = isCollectionAttr ? view.mixin.CollectionPresenter : actualMixinClass

  let presenterMixin: AttributePresenter | CollectionPresenter | undefined = hierarchy.classHierarchyMixin(
    attrClass,
    mixin
  )

  if (presenterMixin?.presenter === undefined && mixinClass != null && mixin === mixinClass) {
    presenterMixin = hierarchy.classHierarchyMixin(attrClass, view.mixin.AttributePresenter)
  }

  let presenter: AnySvelteComponent | undefined

  if (overridedPresenter !== undefined) {
    presenter = await getResource(overridedPresenter.component)
  }

  if (presenter === undefined) {
    const attributePresenter = presenterMixin as AttributePresenter
    if (category === 'array' && attributePresenter.arrayPresenter !== undefined) {
      presenter = await getResource(attributePresenter.arrayPresenter)
    } else if (presenterMixin?.presenter !== undefined) {
      presenter = await getResource(presenterMixin.presenter)
    } else if (attrClass === core.class.TypeAny) {
      const typeAny = attribute.type as TypeAny
      presenter = await getResource(typeAny.presenter)
    }
  }

  if (presenter === undefined) {
    throw new Error('attribute presenter not found for ' + JSON.stringify(preserveKey))
  }

  const resultKey = preserveKey.sortingKey ?? preserveKey.key
  const sortingKey = Array.isArray(resultKey)
    ? resultKey
    : attribute.type._class === core.class.ArrOf
      ? resultKey + '.length'
      : resultKey

  return {
    key: preserveKey.key,
    sortingKey,
    _class: attrClass,
    label: preserveKey.label ?? attribute.shortLabel ?? attribute.label,
    presenter,
    props: preserveKey.props,
    displayProps: preserveKey.displayProps,
    icon: presenterMixin?.icon,
    attribute,
    collectionAttr: isCollectionAttr,
    isLookup: false
  }
}

export function hasAttributePresenter (
  client: Client,
  _class: Ref<Class<Obj>>,
  key: string,
  mixinClass?: Ref<Mixin<CollectionPresenter>>
): boolean {
  const actualMixinClass = mixinClass ?? view.mixin.AttributePresenter

  const hierarchy = client.getHierarchy()
  const attribute = hierarchy.getAttribute(_class, key)

  const presenterClass = getAttributePresenterClass(hierarchy, attribute)
  const isCollectionAttr = presenterClass.category === 'collection'
  const mixin = isCollectionAttr ? view.mixin.CollectionPresenter : actualMixinClass

  let presenterMixin = hierarchy.classHierarchyMixin(presenterClass.attrClass, mixin)

  if (presenterMixin?.presenter === undefined && mixinClass != null && mixin === mixinClass) {
    presenterMixin = hierarchy.classHierarchyMixin(presenterClass.attrClass, view.mixin.AttributePresenter)
  }

  return presenterMixin?.presenter !== undefined || (attribute.type as TypeAny)?.presenter !== undefined
}

export async function getPresenter<T extends Doc> (
  client: Client,
  _class: Ref<Class<T>>,
  key: BuildModelKey,
  preserveKey: BuildModelKey,
  lookup?: Lookup<T>,
  isCollectionAttr: boolean = false,
  _category?: AttributeCategory
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
    return await getAttributePresenter(client, _class, key.key, preserveKey, undefined, _category)
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
    res = { ...existingLookup, ...res }
    if (Object.keys(_id).length > 0) {
      ;(res as any)._id = _id
    }
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
        Analytics.handleError(err)
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
  const socialStrings = new Set(await getAllSocialStringsByPersonRef(client, getCurrentEmployee()))
  if (currentAcc.role !== AccountRole.Owner && !socialStrings.has(object.createdBy as PersonId)) return
  if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
    const adoc = object as AttachedDoc
    await client
      .removeCollection(object._class, object.space, adoc._id, adoc.attachedTo, adoc.attachedToClass, adoc.collection)
      .catch((err) => {
        console.error(err)
      })
  } else {
    await client.removeDoc(object._class, object.space, object._id).catch((err) => {
      console.error(err)
    })
  }
}

export async function deleteObjects (client: TxOperations, objects: Doc[], skipCheck: boolean = false): Promise<void> {
  let realObjects: Doc[] = []
  if (!skipCheck) {
    const currentAcc = getCurrentAccount()
    const socialStrings = new Set(await getAllSocialStringsByPersonRef(client, getCurrentEmployee()))
    const byClass = new Map<Ref<Class<Doc>>, Doc[]>()
    for (const d of objects) {
      byClass.set(d._class, [...(byClass.get(d._class) ?? []), d])
    }
    const adminUser = isAdminUser()
    for (const [cl, docs] of byClass.entries()) {
      const realDocs = await client.findAll(cl, { _id: { $in: docs.map((it: Doc) => it._id) } })
      const notAllowed = realDocs.filter((p) => !socialStrings.has(p.createdBy as PersonId))

      if (notAllowed.length > 0) {
        console.error('You are not allowed to delete this object', notAllowed)
      }
      if (currentAcc.role === AccountRole.Owner || adminUser) {
        realObjects.push(...realDocs)
      } else {
        realObjects.push(...realDocs.filter((p) => socialStrings.has(p.createdBy as PersonId)))
      }
    }
  } else {
    realObjects = objects
  }
  const ops = client.apply(undefined, 'delete-objects')
  for (const object of realObjects) {
    if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
      const adoc = object as AttachedDoc
      await ops
        .removeCollection(object._class, object.space, adoc._id, adoc.attachedTo, adoc.attachedToClass, adoc.collection)
        .catch((err) => {
          console.error(err)
        })
    } else {
      await ops.removeDoc(object._class, object.space, object._id).catch((err) => {
        console.error(err)
      })
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

export function getBooleanLabel (value: boolean | undefined | null): IntlString {
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

export function makeViewletKey (loc?: Location, ignoreFragment = false): string {
  loc = loc != null ? { path: loc.path, fragment: loc.fragment } : getCurrentResolvedLocation()
  loc.query = undefined

  if (!ignoreFragment && loc.fragment != null && loc.fragment !== '') {
    const props = decodeURIComponent(loc.fragment).split('|')
    if (props.length >= 3) {
      const [panel, , _class] = props

      return 'viewlet' + '#' + encodeURIComponent([panel, _class].join('|'))
    }
  }

  loc.fragment = undefined
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

resolvedLocationStore.subscribe(() => {
  fixedWidthStore.set({})
})

export function groupBy<T extends Doc> (docs: T[], key: string, categories?: CategoryType[]): Record<any, T[]> {
  return docs.reduce((storage: Record<string, T[]>, item: T) => {
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
  const uniqueValues = new Set<string | number | undefined>()
  const uniqueObjects = new Map<string | number, AggregateValue>()

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
        await moveToSpace(client, attached, space).catch((err: any) => {
          Analytics.handleError(err)
          console.log('failed to move', name, err)
        })
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
  const provider = hierarchy.classHierarchyMixin(
    Hierarchy.mixinOrClass(object),
    view.mixin.LinkProvider,
    (m) => hasResource(m.encode) ?? false
  )
  if (provider?.encode !== undefined) {
    const f = await getResource(provider.encode)
    const res = await f(object, props)
    if (res !== undefined) {
      return res
    }
  }
  const loc = getCurrentResolvedLocation()
  const idProvider = hierarchy.classHierarchyMixin(Hierarchy.mixinOrClass(object), view.mixin.LinkIdProvider)

  let id: string = object._id
  if (idProvider !== undefined) {
    const encodeFn = await getResource(idProvider.encode)
    id = await encodeFn(object)
  }

  if (hasResource(component) === true) {
    loc.fragment = getPanelURI(component, id, Hierarchy.mixinOrClass(object), 'content')
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

/**
 * @public
 */
export async function getSpacePresenter (
  client: Client,
  _class: Ref<Class<Doc>>
): Promise<AnySvelteComponent | undefined> {
  const value = client.getHierarchy().classHierarchyMixin(_class, view.mixin.SpacePresenter)
  if (value?.presenter !== undefined) {
    return await getResource(value.presenter)
  }
}

export async function getDocLabel (client: Client, object: Doc | undefined): Promise<string | undefined> {
  if (object === undefined) {
    return undefined
  }

  const hierarchy = client.getHierarchy()
  const name = (object as any).name

  if (name !== undefined) {
    if (hierarchy.isDerived(object._class, contact.class.Person)) {
      return getName(hierarchy, object as Contact)
    }
    return name
  }

  const label = hierarchy.getClass(object._class).label ?? object.label

  if (label === undefined) {
    return undefined
  }

  return await translate(label, {}, get(themeStore).language)
}

export async function getDocTitle (
  client: Client,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  object?: Doc
): Promise<string | undefined> {
  const hierarchy = client.getHierarchy()

  const titleProvider = hierarchy.classHierarchyMixin(objectClass, view.mixin.ObjectTitle)

  if (titleProvider === undefined) {
    return
  }

  const resource = await getResource(titleProvider.titleProvider)

  return await resource(client, objectId, object)
}

export async function getDocIdentifier (
  client: Client,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  object?: Doc
): Promise<string | undefined> {
  const hierarchy = client.getHierarchy()

  const identifierProvider = hierarchy.classHierarchyMixin(objectClass, view.mixin.ObjectIdentifier)

  if (identifierProvider === undefined) {
    return
  }

  const resource = await getResource(identifierProvider.provider)

  return await resource(client, objectId, object)
}

export async function getDocLinkTitle (
  client: Client,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  object?: Doc
): Promise<string | undefined> {
  const identifier = await getDocIdentifier(client, objectId, objectClass, object)

  if (identifier !== undefined) {
    return identifier
  }

  const title = await getDocTitle(client, objectId, objectClass, object)

  if (title !== undefined) {
    return title
  }

  return await getDocLabel(client, object)
}

/**
 * @public
 */
export function getCategoryQueryProjection (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  query: DocumentQuery<Doc>,
  fields: string[]
): Record<string, number> {
  const res: Record<string, number> = {}
  for (const f of fields) {
    /*
      Mongo projection doesn't support properties fields which
      start from $. Such field here is $search. The least we could do
      is to filter all properties which start from $.
    */
    if (!f.startsWith('$')) {
      res[f] = 1
    }
  }
  for (const f of Object.keys(query)) {
    if (!f.startsWith('$')) {
      res[f] = 1
    }
  }
  if (hierarchy.isDerived(_class, core.class.AttachedDoc)) {
    res.attachedTo = 1
    res.attachedToClass = 1
    res.collection = 1
  }
  return res
}

/**
 * @public
 */
export function getCategoryQueryNoLookup<T extends Doc = Doc> (query: DocumentQuery<T>): DocumentQuery<T> {
  const newQuery: DocumentQuery<T> = {}
  for (const [k, v] of Object.entries(query)) {
    if (!k.startsWith('$lookup.')) {
      ;(newQuery as any)[k] = v
    }
  }
  return newQuery
}

/**
 * @public
 */
export function getCategoryQueryNoLookupOptions<T extends Doc> (options: FindOptions<T>): FindOptions<T> {
  const { lookup, ...resultOptions } = options
  return resultOptions
}

export async function buildRemovedDoc<T extends Doc> (
  client: Client,
  objectId: Ref<T>,
  _class: Ref<Class<T>>
): Promise<T | undefined> {
  const txes = await client.findAll<TxCUD<Doc>>(
    core.class.TxCUD,
    {
      objectId
    },
    { sort: { modifiedOn: 1 } }
  )
  const createTx = txes.find((tx) => tx._class === core.class.TxCreateDoc)

  if (createTx === undefined) return
  let doc = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Doc>)

  for (const tx of txes) {
    if (tx._class === core.class.TxUpdateDoc) {
      doc = TxProcessor.updateDoc2Doc(doc, tx as TxUpdateDoc<Doc>)
    } else if (tx._class === core.class.TxMixin) {
      const mixinTx = tx as TxMixin<Doc, Doc>
      doc = TxProcessor.updateMixin4Doc(doc, mixinTx)
    }
  }
  return doc as T
}

export async function getOrBuildObject<T extends Doc> (
  client: Client,
  objectId: Ref<T>,
  objectClass: Ref<Class<T>>
): Promise<T | undefined> {
  const object = await client.findOne<Doc>(objectClass, { _id: objectId })

  if (object !== undefined) {
    return object as T
  }

  return await buildRemovedDoc(client, objectId, objectClass)
}

export async function checkIsObjectRemoved (
  client: Client,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>
): Promise<boolean> {
  const object = await client.findOne(objectClass, { _id: objectId }, { projection: { _id: 1 } })

  return object === undefined
}

export function getDocMixins (
  object: Doc,
  showAllMixins = false,
  ignoreMixins = new Set<Ref<Mixin<Doc>>>(),
  objectClass?: Ref<Class<Doc>>
): Array<Mixin<Doc>> {
  if (object === undefined) {
    return []
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))
  const _class = objectClass ?? object._class

  return descendants.filter(
    (descendant) =>
      descendant.kind === ClassifierKind.MIXIN &&
      !ignoreMixins.has(descendant._id) &&
      (hierarchy.hasMixin(object, descendant._id) ||
        (showAllMixins &&
          hierarchy.isDerived(_class, hierarchy.getBaseClass(descendant._id)) &&
          (descendant.extends !== undefined && hierarchy.isMixin(descendant.extends)
            ? hierarchy.hasMixin(object, descendant.extends)
            : true)))
  )
}

export function classIcon (client: Client, _class: Ref<Class<Obj>>): Asset | undefined {
  return client.getHierarchy().getClass(_class).icon
}

export const restrictionStore = writable<Restrictions>({
  readonly: false,
  disableComments: false,
  disableNavigation: false,
  disableActions: false
})

export async function getDocAttrsInfo (
  mixins: Array<Mixin<Doc>>,
  ignoreKeys: string[],
  _class: Ref<Class<Doc>>,
  allowedCollections: string[] = [],
  collectionArrays: string[] = []
): Promise<{
    keys: KeyedAttribute[]
    inplaceAttributes: string[]
    editors: Array<{ key: KeyedAttribute, editor: AnyComponent, category: AttributeCategory }>
  }> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const keysMap = new Map(getFiltredKeys(hierarchy, _class, ignoreKeys).map((p) => [p.attr._id, p]))
  for (const m of mixins) {
    const mkeys = getFiltredKeys(hierarchy, m._id, ignoreKeys)
    for (const key of mkeys) {
      keysMap.set(key.attr._id, key)
    }
  }
  const filteredKeys = Array.from(keysMap.values())
  const { attributes, collections } = categorizeFields(hierarchy, filteredKeys, collectionArrays, allowedCollections)

  const keys = attributes.map((it) => it.key)
  const editors: Array<{ key: KeyedAttribute, editor: AnyComponent, category: AttributeCategory }> = []
  const inplaceAttributes: string[] = []

  for (const k of collections) {
    if (allowedCollections.includes(k.key.key)) continue
    const editor = await getAttrEditor(k.key, hierarchy)
    if (editor === undefined) continue
    if (k.category === 'inplace') {
      inplaceAttributes.push(k.key.key)
    }
    editors.push({ key: k.key, editor, category: k.category })
  }

  return {
    keys,
    inplaceAttributes,
    editors: editors.sort((a, b) => AttributeCategoryOrder[a.category] - AttributeCategoryOrder[b.category])
  }
}

async function getAttrEditor (key: KeyedAttribute, hierarchy: Hierarchy): Promise<AnyComponent | undefined> {
  const attrClass = getAttributePresenterClass(hierarchy, key.attr)
  const clazz = hierarchy.getClass(attrClass.attrClass)
  const mix = {
    array: view.mixin.ArrayEditor,
    collection: view.mixin.CollectionEditor,
    inplace: view.mixin.InlineAttributEditor,
    attribute: view.mixin.AttributeEditor,
    object: undefined as any
  }
  const mixinRef = mix[attrClass.category]
  if (mixinRef !== undefined) {
    const editorMixin = hierarchy.as(clazz, mixinRef)
    return (editorMixin as any).editor
  } else {
    return undefined
  }
}

export const accessDeniedStore = writable<boolean>(false)

const spaceSpaceQuery = createQuery(true)

export const spaceSpace = writable<TypedSpace | undefined>(undefined)

spaceSpaceQuery.query(core.class.TypedSpace, { _id: core.space.Space }, (res) => {
  spaceSpace.set(res[0])
})

export function getCollaborationUser (): CollaborationUser {
  const me = getCurrentAccount()
  const color = getColorNumberByText(me.primarySocialId)

  return {
    id: me.primarySocialId,
    name: me.primarySocialId,
    color
  }
}

export async function getObjectLinkId (
  providers: LinkIdProvider[],
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  doc?: Doc
): Promise<string> {
  const provider = providers.find(({ _id }) => _id === _class)

  if (provider === undefined) {
    return _id
  }

  const client = getClient()
  const object = doc ?? (await client.findOne(_class, { _id }))

  if (object === undefined) {
    return _id
  }

  const encodeFn = await getResource(provider.encode)
  return await encodeFn(object)
}

export async function parseLinkId<T extends Doc> (
  providers: LinkIdProvider[],
  id: string,
  _class: Ref<Class<T>>
): Promise<Ref<T>> {
  const hierarchy = getClient().getHierarchy()
  const provider =
    providers.find(({ _id }) => id === _class) ?? providers.find(({ _id }) => hierarchy.isDerived(_class, _id))

  if (provider === undefined) {
    return id as Ref<T>
  }

  const decodeFn = await getResource(provider.decode)
  const _id = await decodeFn(id)

  return (_id ?? id) as Ref<T>
}

export async function getObjectId (object: Doc, hierarchy: Hierarchy): Promise<string> {
  const idProvider = hierarchy.classHierarchyMixin(Hierarchy.mixinOrClass(object), view.mixin.LinkIdProvider)

  if (idProvider !== undefined) {
    const encodeFn = await getResource(idProvider.encode)
    return await encodeFn(object)
  }

  return object._id
}
