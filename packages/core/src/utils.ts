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

import { deepEqual } from 'fast-equals'
import {
  Account,
  AnyAttribute,
  Class,
  Doc,
  DocData,
  DocIndexState,
  IndexKind,
  Obj,
  Ref,
  Space
} from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { isPredicate } from './predicate'
import { DocumentQuery, FindResult } from './storage'

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
export function generateId<T extends Doc> (): Ref<T> {
  return (timestamp() + random + count()) as Ref<T>
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
export function toFindResult<T extends Doc> (docs: T[], total?: number): FindResult<T> {
  const length = total ?? docs.length
  return Object.assign(docs, { total: length })
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
  relative?: boolean
  refAttribute?: string
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
  let key =
    (opt?.docId !== undefined ? opt.docId.split('.').join('_') + '|' : '') +
    (opt?._class === undefined ? name : `${opt?._class}%${name}${extra}`)
  if (opt?.refAttribute !== undefined) {
    key = `${opt?.refAttribute}->${key}`
  }
  if (opt?.refAttribute !== undefined || (opt?.relative !== undefined && opt?.relative)) {
    key = '|' + key
  }
  return key
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
    attr.type._class === core.class.TypeAttachment ||
    attr.type._class === core.class.EnumOf
  )
}

/**
 * @public
 */
export function isIndexedAttribute (attr: AnyAttribute): boolean {
  return attr.index === IndexKind.Indexed
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

/**
 * @public
 */
export class DocManager {
  protected readonly byId: IdMap<Doc>

  constructor (protected readonly docs: Doc[]) {
    this.byId = toIdMap(docs)
  }

  get (ref: Ref<Doc>): Doc | undefined {
    return this.byId.get(ref)
  }

  getDocs (): Doc[] {
    return this.docs
  }

  getIdMap (): IdMap<Doc> {
    return this.byId
  }

  filter (predicate: (value: Doc) => boolean): Doc[] {
    return this.docs.filter(predicate)
  }
}

/**
 * @public
 */

export class RateLimitter {
  idCounter: number = 0
  processingQueue = new Map<string, Promise<void>>()
  last: number = 0

  queue: (() => Promise<void>)[] = []

  constructor (readonly config: () => { rate: number, perSecond?: number }) {}

  async exec<T, B extends Record<string, any> = any>(op: (args?: B) => Promise<T>, args?: B): Promise<T> {
    const processingId = `${this.idCounter++}`
    const cfg = this.config()

    while (this.processingQueue.size > cfg.rate) {
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
    const cfg = this.config()

    if (this.processingQueue.size < cfg.rate) {
      void this.exec(op, args)
    } else {
      await this.exec(op, args)
    }
  }

  async waitProcessing (): Promise<void> {
    await Promise.race(this.processingQueue.values())
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
