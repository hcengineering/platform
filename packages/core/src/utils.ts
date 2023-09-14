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

import { Account, AnyAttribute, Class, Doc, DocData, DocIndexState, IndexKind, Obj, Ref, Space } from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { FindResult } from './storage'

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
  return (
    (opt?.docId !== undefined ? opt.docId.split('.').join('_') + '|' : '') +
    (opt?._class === undefined ? name : `${opt?._class}%${name}${extra}`)
  )
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
        ;(object as any)[attribute[0]] = attribute[1].defaultValue
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
  constructor (readonly name: string | undefined, readonly values: AggregateValueData[]) {}
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

  async exec<T, B extends Record<string, any> = {}>(op: (args?: B) => Promise<T>, args?: B): Promise<T> {
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

  async add<T, B extends Record<string, any> = {}>(op: (args?: B) => Promise<T>, args?: B): Promise<void> {
    const cfg = this.config()

    if (this.processingQueue.size < cfg.rate) {
      void this.exec(op, args)
    } else {
      await this.exec(op, args)
    }
  }

  async waitProcessing (): Promise<void> {
    await await Promise.race(this.processingQueue.values())
  }
}
