//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
import { deepEqual } from 'fast-equals'
import {
  Account,
  AccountRole,
  AnyAttribute,
  AttachedDoc,
  Class,
  ClassifierKind,
  Collection,
  Doc,
  DocData,
  DocIndexState,
  DOMAIN_BLOB,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  FullTextSearchContext,
  IndexKind,
  Obj,
  Permission,
  Ref,
  Role,
  roleOrder,
  Space,
  TypedSpace
} from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { TxOperations } from './operations'
import { isPredicate } from './predicate'
import { DocumentQuery, FindResult } from './storage'
import { DOMAIN_TX } from './tx'

function toHex (value: number, chars: number): string {
  const result = value.toString(16)
  if (result.length < chars) {
    return '0'.repeat(chars - result.length) + result
  }
  return result
}

let counter = (Math.random() * (1 << 24)) | 0
const random = toHex((Math.random() * (1 << 24)) | 0, 6) + toHex((Math.random() * (1 << 16)) | 0, 4)

function timestamp (): string {
  const time = (Date.now() / 1000) | 0
  return toHex(time, 8)
}

function count (): string {
  const val = counter++ & 0xffffff
  return toHex(val, 6)
}

/**
 * @public
 * @returns
 */
export function generateId<T extends Doc> (join: string = ''): Ref<T> {
  return (timestamp() + join + random + join + count()) as Ref<T>
}

/** @public */
export function isId (value: any): value is Ref<any> {
  return typeof value === 'string' && /^[0-9a-f]{24,24}$/.test(value)
}

let currentAccount: Account

/**
 * @public
 * @returns
 */
export function getCurrentAccount (): Account {
  return currentAccount
}

/**
 * @public
 * @param account -
 */
export function setCurrentAccount (account: Account): void {
  currentAccount = account
}
/**
 * @public
 */
export function escapeLikeForRegexp (value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

/**
 * @public
 */
export function toFindResult<T extends Doc> (docs: T[], total?: number, lookupMap?: Record<string, Doc>): FindResult<T> {
  const length = total ?? docs.length
  return Object.assign(docs, { total: length, lookupMap })
}

/**
 * @public
 */
export interface WorkspaceId {
  name: string
  productId: string
}

/**
 * @public
 */
export interface WorkspaceIdWithUrl extends WorkspaceId {
  workspaceUrl: string
  workspaceName: string
}

/**
 * @public
 *
 * Combine workspace with productId, if not equal ''
 */
export function getWorkspaceId (workspace: string, productId: string = ''): WorkspaceId {
  return {
    name: workspace,
    productId
  }
}

/**
 * @public
 */
export function toWorkspaceString (id: WorkspaceId, sep = '@'): string {
  return id.name + (id.productId === '' ? '' : sep + id.productId)
}

const attributesPrefix = 'attributes.'

/**
 * @public
 */
export interface IndexKeyOptions {
  _class?: Ref<Class<Obj>>
  docId?: Ref<DocIndexState>
  extra?: string[]
}
/**
 * @public
 */

export function docUpdKey (name: string, opt?: IndexKeyOptions): string {
  return attributesPrefix + docKey(name, opt)
}
/**
 * @public
 */
export function docKey (name: string, opt?: IndexKeyOptions): string {
  const extra = opt?.extra !== undefined && opt?.extra?.length > 0 ? `#${opt.extra?.join('#') ?? ''}` : ''
  return opt?._class === undefined ? name : `${opt?._class}%${name}${extra}`
}

/**
 * @public
 */
export function extractDocKey (key: string): {
  _class?: Ref<Class<Doc>>
  attr: string
  docId?: Ref<DocIndexState>
  extra: string[]
} {
  let k = key
  if (k.startsWith(attributesPrefix)) {
    k = k.slice(attributesPrefix.length)
  }
  let docId: Ref<DocIndexState> | undefined
  let _class: Ref<Class<Doc>> | undefined
  let attr = ''
  const docSepPos = k.indexOf('|')
  if (docSepPos !== -1) {
    docId = k.substring(0, docSepPos).replace('_', '.') as Ref<DocIndexState>
    k = k.substring(docSepPos + 1)
  }
  const clPos = k.indexOf('%')
  if (clPos !== -1) {
    _class = k.substring(0, clPos) as Ref<Class<Doc>>
    attr = k.substring(clPos + 1)
  } else {
    attr = k
  }
  const extra = attr.split('#')
  attr = extra.splice(0, 1)[0]

  return { docId, attr, _class, extra }
}

/**
 * @public
 */
export function isFullTextAttribute (attr: AnyAttribute): boolean {
  return (
    attr.index === IndexKind.FullText ||
    attr.type._class === core.class.TypeBlob ||
    attr.type._class === core.class.EnumOf ||
    attr.type._class === core.class.TypeCollaborativeDoc
  )
}

/**
 * @public
 */
export function isIndexedAttribute (attr: AnyAttribute): boolean {
  return attr.index === IndexKind.Indexed || attr.index === IndexKind.IndexedDsc
}

/**
 * @public
 */
export interface IdMap<T extends Doc> extends Map<Ref<T>, T> {}

/**
 * @public
 */
export function toIdMap<T extends Doc> (arr: T[]): IdMap<T> {
  return new Map(arr.map((p) => [p._id, p]))
}

/**
 * @public
 */
export function concatLink (host: string, path: string): string {
  if (!host.endsWith('/') && !path.startsWith('/')) {
    return `${host}/${path}`
  } else if (host.endsWith('/') && path.startsWith('/')) {
    const newPath = path.slice(1)
    return `${host}${newPath}`
  } else {
    return `${host}${path}`
  }
}

/**
 * @public
 */
export function fillDefaults<T extends Doc> (
  hierarchy: Hierarchy,
  object: DocData<T> | T,
  _class: Ref<Class<T>>
): DocData<T> | T {
  const baseClass = hierarchy.isDerived(_class, core.class.AttachedDoc) ? core.class.AttachedDoc : core.class.Doc
  const attributes = hierarchy.getAllAttributes(_class, baseClass)
  for (const attribute of attributes) {
    if (attribute[1].defaultValue !== undefined) {
      if ((object as any)[attribute[0]] === undefined) {
        // Clone default value as it might be an object (e.g. array)
        ;(object as any)[attribute[0]] = structuredClone(attribute[1].defaultValue)
      }
    }
  }
  return object
}

/**
 * @public
 */
export class AggregateValueData {
  constructor (
    readonly name: string,
    readonly _id: Ref<Doc>,
    readonly space: Ref<Space>,
    readonly rank?: string,
    readonly category?: Ref<Doc>
  ) {}

  getRank (): string {
    return this.rank ?? ''
  }
}

/**
 * @public
 */
export class AggregateValue {
  constructor (
    readonly name: string | undefined,
    readonly values: AggregateValueData[]
  ) {}
}

/**
 * @public
 */
export type CategoryType = number | string | undefined | Ref<Doc> | AggregateValue

export interface IDocManager<T extends Doc> {
  get: (ref: Ref<T>) => T | undefined
  getDocs: () => T[]
  getIdMap: () => IdMap<T>
  filter: (predicate: (value: T) => boolean) => T[]
}

/**
 * @public
 */
export class DocManager<T extends Doc> implements IDocManager<T> {
  protected readonly byId: IdMap<T>

  constructor (protected readonly docs: T[]) {
    this.byId = toIdMap(docs)
  }

  get (ref: Ref<T>): T | undefined {
    return this.byId.get(ref)
  }

  getDocs (): T[] {
    return this.docs
  }

  getIdMap (): IdMap<T> {
    return this.byId
  }

  filter (predicate: (value: T) => boolean): T[] {
    return this.docs.filter(predicate)
  }
}

/**
 * @public
 */

export class RateLimiter {
  idCounter: number = 0
  processingQueue = new Map<number, Promise<void>>()
  last: number = 0
  rate: number

  queue: (() => Promise<void>)[] = []

  constructor (rate: number) {
    this.rate = rate
  }

  async exec<T, B extends Record<string, any> = any>(op: (args?: B) => Promise<T>, args?: B): Promise<T> {
    const processingId = this.idCounter++

    while (this.processingQueue.size > this.rate) {
      await Promise.race(this.processingQueue.values())
    }
    try {
      const p = op(args)
      this.processingQueue.set(processingId, p as Promise<void>)
      return await p
    } finally {
      this.processingQueue.delete(processingId)
    }
  }

  async add<T, B extends Record<string, any> = any>(op: (args?: B) => Promise<T>, args?: B): Promise<void> {
    if (this.processingQueue.size < this.rate) {
      void this.exec(op, args)
    } else {
      while (this.processingQueue.size > this.rate) {
        await Promise.race(this.processingQueue.values())
      }
      void this.exec(op, args)
    }
  }

  async waitProcessing (): Promise<void> {
    await Promise.all(this.processingQueue.values())
  }
}

export function mergeQueries<T extends Doc> (query1: DocumentQuery<T>, query2: DocumentQuery<T>): DocumentQuery<T> {
  const keys1 = Object.keys(query1)
  const keys2 = Object.keys(query2)

  const query = {}

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      Object.assign(query, { [key]: query1[key] })
    }
  }

  for (const key of keys2) {
    if (!keys1.includes(key)) {
      Object.assign(query, { [key]: query2[key] })
    } else {
      const value = mergeField(query1[key], query2[key])
      if (value !== undefined) {
        Object.assign(query, { [key]: value })
      }
    }
  }

  return query
}

function mergeField (field1: any, field2: any): any | undefined {
  // this is a special predicate that causes query never return any docs
  // it is used in cases when queries intersection is empty
  const never = { $in: [] }
  // list of ignored predicates, handled separately
  const ignored = ['$in', '$nin', '$ne']

  const isPredicate1 = isPredicate(field1)
  const isPredicate2 = isPredicate(field2)

  if (isPredicate1 && isPredicate2) {
    // $in, $nin, $eq are related fields so handle them separately here
    const result = getInNiN(field1, field2)

    const keys1 = Object.keys(field1)
    const keys2 = Object.keys(field2)

    for (const key of keys1) {
      if (ignored.includes(key)) continue

      if (!keys2.includes(key)) {
        Object.assign(result, { [key]: field1[key] })
      } else {
        const value = mergePredicateWithPredicate(key, field1[key], field2[key])
        if (value !== undefined) {
          Object.assign(result, { [key]: value })
        }
      }
    }

    for (const key of keys2) {
      if (ignored.includes(key)) continue

      if (!keys1.includes(key)) {
        Object.assign(result, { [key]: field2[key] })
      }
    }

    return Object.keys(result).length > 0 ? result : undefined
  } else if (isPredicate1 || isPredicate2) {
    // when one field is a predicate and the other is a simple value
    // we need to ensure that the value matches predicate
    const predicate = isPredicate1 ? field1 : field2
    const value = isPredicate1 ? field2 : field1

    for (const x in predicate) {
      const result = mergePredicateWithValue(x, predicate[x], value)
      if (
        Array.isArray(result?.$in) &&
        result.$in.length > 0 &&
        Array.isArray(result?.$nin) &&
        result.$nin.length === 0
      ) {
        delete result.$nin
      }
      if (result !== undefined) {
        return result
      }
    }

    // if we reached here, the value does not match the predicate
    return never
  } else {
    // both are not predicates, can filter only when values are equal
    return deepEqual(field1, field2) ? field1 : never
  }
}

function mergePredicateWithPredicate (predicate: string, val1: any, val2: any): any | undefined {
  if (val1 === undefined) return val2
  if (val2 === undefined) return val1

  switch (predicate) {
    case '$lt':
      return val1 < val2 ? val1 : val2
    case '$lte':
      return val1 <= val2 ? val1 : val2
    case '$gt':
      return val1 > val2 ? val1 : val2
    case '$gte':
      return val1 >= val2 ? val1 : val2
  }

  // TODO we should properly support all available predicates here
  // until then, fallback to the first predicate value

  return val1
}

function mergePredicateWithValue (predicate: string, val1: any, val2: any): any | undefined {
  switch (predicate) {
    case '$in':
      return Array.isArray(val1) && val1.includes(val2) ? val2 : undefined
    case '$nin':
      return Array.isArray(val1) && !val1.includes(val2) ? val2 : undefined
    case '$lt':
      return val2 < val1 ? val2 : undefined
    case '$lte':
      return val2 <= val1 ? val2 : undefined
    case '$gt':
      return val2 > val1 ? val2 : undefined
    case '$gte':
      return val2 >= val1 ? val2 : undefined
    case '$ne':
      return val1 !== val2 ? val2 : undefined
  }

  // TODO we should properly support all available predicates here
  // until then, fallback to the non-predicate value

  return val2
}

function getInNiN (query1: any, query2: any): any {
  const aIn = typeof query1 === 'object' && '$in' in query1 ? query1.$in : undefined
  const bIn = typeof query2 === 'object' && '$in' in query2 ? query2.$in : undefined
  const aNIn =
    (typeof query1 === 'object' && '$nin' in query1 ? query1.$nin : undefined) ??
    (typeof query1 === 'object' && query1.$ne !== undefined ? [query1.$ne] : [])
  const bNIn =
    (typeof query2 === 'object' && '$nin' in query2 ? query2.$nin : undefined) ??
    (typeof query1 === 'object' && query2.$ne !== undefined ? [query2.$ne] : [])

  const finalNin = Array.from(new Set([...aNIn, ...bNIn]))

  // we must keep $in if it was in the original query
  if (aIn !== undefined || bIn !== undefined) {
    const finalIn =
      aIn !== undefined && bIn !== undefined
        ? aIn.length - bIn.length < 0
          ? bIn.filter((c: any) => aIn.includes(c))
          : aIn.filter((c: any) => bIn.includes(c))
        : aIn ?? bIn
    return { $in: finalIn.filter((p: any) => !finalNin.includes(p)) }
  }
  // try to preserve original $ne instead of $nin
  if ((typeof query1 === 'object' && '$ne' in query1) || (typeof query2 === 'object' && '$ne' in query2)) {
    if (finalNin.length === 1) {
      return { $ne: finalNin[0] }
    }
  }
  if (finalNin.length > 0) {
    return { $nin: finalNin }
  }
  return {}
}

export function cutObjectArray (obj: any): any {
  if (obj == null) {
    return obj
  }
  const r = {}
  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      if (obj[key].length > 3) {
        Object.assign(r, { [key]: [...obj[key].slice(0, 3), `... and ${obj[key].length - 3} more`] })
      } else Object.assign(r, { [key]: obj[key] })
      continue
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(r, { [key]: cutObjectArray(obj[key]) })
      continue
    }
    Object.assign(r, { [key]: obj[key] })
  }
  return r
}

export const isEnum =
  <T>(e: T) =>
    (token: any): token is T[keyof T] => {
      return typeof token === 'string' && Object.values(e as Record<string, any>).includes(token)
    }

export async function checkPermission (
  client: TxOperations,
  _id: Ref<Permission>,
  _space: Ref<TypedSpace>
): Promise<boolean> {
  const space = await client.findOne(core.class.TypedSpace, { _id: _space })
  const type = await client
    .getModel()
    .findOne(core.class.SpaceType, { _id: space?.type }, { lookup: { _id: { roles: core.class.Role } } })
  const mixin = type?.targetClass
  if (space === undefined || type === undefined || mixin === undefined) {
    return false
  }

  const me = getCurrentAccount()
  const asMixin = client.getHierarchy().as(space, mixin)
  const myRoles = type.$lookup?.roles?.filter((role) => (asMixin as any)[role._id]?.includes(me._id)) as Role[]

  if (myRoles === undefined) {
    return false
  }

  const myPermissions = new Set(myRoles.flatMap((role) => role.permissions))

  return myPermissions.has(_id)
}

/**
 * @public
 */
export function getRoleAttributeLabel (roleName: string): IntlString {
  return getEmbeddedLabel(`Role: ${roleName.trim()}`)
}

/**
 * @public
 */
export function getFullTextIndexableAttributes (
  hierarchy: Hierarchy,
  clazz: Ref<Class<Obj>>,
  skipDocs: boolean = false
): AnyAttribute[] {
  const allAttributes = hierarchy.getAllAttributes(clazz)
  const result: AnyAttribute[] = []
  for (const [, attr] of allAttributes) {
    if (skipDocs && (attr.attributeOf === core.class.Doc || attr.attributeOf === core.class.AttachedDoc)) {
      continue
    }
    if (isFullTextAttribute(attr) || isIndexedAttribute(attr)) {
      result.push(attr)
    }
  }

  hierarchy
    .getDescendants(clazz)
    .filter((m) => hierarchy.getClass(m).kind === ClassifierKind.MIXIN)
    .forEach((m) => {
      for (const [, v] of hierarchy.getAllAttributes(m, clazz)) {
        if (skipDocs && (v.attributeOf === core.class.Doc || v.attributeOf === core.class.AttachedDoc)) {
          continue
        }
        if (isFullTextAttribute(v) || isIndexedAttribute(v)) {
          result.push(v)
        }
      }
    })
  return result
}

/**
 * @public
 */
export function getFullTextContext (
  hierarchy: Hierarchy,
  objectClass: Ref<Class<Doc>>
): Omit<FullTextSearchContext, keyof Class<Doc>> {
  let objClass = hierarchy.getClass(objectClass)

  while (true) {
    if (hierarchy.hasMixin(objClass, core.mixin.FullTextSearchContext)) {
      const ctx = hierarchy.as<Class<Doc>, FullTextSearchContext>(objClass, core.mixin.FullTextSearchContext)
      if (ctx !== undefined) {
        return ctx
      }
    }
    if (objClass.extends === undefined) {
      break
    }
    objClass = hierarchy.getClass(objClass.extends)
  }
  return {
    fullTextSummary: false,
    forceIndex: false,
    propagate: [],
    childProcessingAllowed: true
  }
}

/**
 * @public
 */
export function isClassIndexable (hierarchy: Hierarchy, c: Ref<Class<Doc>>): boolean {
  const indexed = hierarchy.getClassifierProp(c, 'class_indexed')
  if (indexed !== undefined) {
    return indexed as boolean
  }
  const domain = hierarchy.findDomain(c)
  if (domain === undefined) {
    hierarchy.setClassifierProp(c, 'class_indexed', false)
    return false
  }

  if (
    domain === DOMAIN_DOC_INDEX_STATE ||
    domain === DOMAIN_TX ||
    domain === DOMAIN_MODEL ||
    domain === DOMAIN_BLOB ||
    domain === DOMAIN_FULLTEXT_BLOB ||
    domain === DOMAIN_TRANSIENT
  ) {
    hierarchy.setClassifierProp(c, 'class_indexed', false)
    return false
  }

  const indexMixin = hierarchy.classHierarchyMixin(c, core.mixin.IndexConfiguration)
  if (indexMixin?.searchDisabled !== undefined && indexMixin?.searchDisabled) {
    hierarchy.setClassifierProp(c, 'class_indexed', false)
    return false
  }

  const attrs = getFullTextIndexableAttributes(hierarchy, c, true)
  for (const d of hierarchy.getDescendants(c)) {
    if (hierarchy.isMixin(d)) {
      attrs.push(...getFullTextIndexableAttributes(hierarchy, d, true))
    }
  }

  let result = true

  if (attrs.length === 0 && !(getFullTextContext(hierarchy, c)?.forceIndex ?? false)) {
    result = false
    // We need check if document has collections with indexable fields.
    const attrs = hierarchy.getAllAttributes(c).values()
    for (const attr of attrs) {
      if (attr.type._class === core.class.Collection) {
        if (isClassIndexable(hierarchy, (attr.type as Collection<AttachedDoc>).of)) {
          result = true
          break
        }
      }
    }
  }
  hierarchy.setClassifierProp(c, 'class_indexed', result)
  return result
}

type ReduceParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never

interface NextCall {
  op: () => Promise<void>
}

/**
 * Utility method to skip middle update calls, optimistically if update function is called multiple times with few different parameters, only the last variant will be executed.
 * The last invocation is executed after a few cycles, allowing to skip middle ones.
 *
 * This method can be used inside Svelte components to collapse complex update logic and handle interactions.
 */
export function reduceCalls<T extends (...args: ReduceParameters<T>) => Promise<void>> (
  operation: T
): (...args: ReduceParameters<T>) => Promise<void> {
  let nextCall: NextCall | undefined
  let currentCall: NextCall | undefined

  const next = (): void => {
    currentCall = nextCall
    nextCall = undefined
    if (currentCall !== undefined) {
      void currentCall.op()
    }
  }
  return async function (...args: ReduceParameters<T>): Promise<void> {
    const myOp = async (): Promise<void> => {
      await operation(...args)
      next()
    }

    nextCall = { op: myOp }
    await Promise.resolve()
    if (currentCall === undefined) {
      next()
    }
  }
}

export function isOwnerOrMaintainer (): boolean {
  const account = getCurrentAccount()
  return hasAccountRole(account, AccountRole.Maintainer)
}

export function hasAccountRole (acc: Account, targerRole: AccountRole): boolean {
  return roleOrder[acc.role] >= roleOrder[targerRole]
}
