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
  type AnyAttribute,
  type ArrOf,
  type AttachedDoc,
  type Class,
  type Client,
  type Collection,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  getCurrentAccount,
  type Hierarchy,
  type Mixin,
  type Obj,
  type Ref,
  type RefTo,
  type Tx,
  TxOperations,
  type TxResult,
  type WithLookup,
  type SearchQuery,
  type SearchOptions,
  type SearchResult
} from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import { LiveQuery as LQ } from '@hcengineering/query'
import { type AnySvelteComponent, type IconSize } from '@hcengineering/ui'
import view, { type AttributeEditor } from '@hcengineering/view'
import { deepEqual } from 'fast-equals'
import { onDestroy } from 'svelte'
import { type KeyedAttribute } from '..'
import { OptimizeQueryMiddleware, type PresentationPipeline, PresentationPipelineImpl } from './pipeline'
import plugin from './plugin'

let liveQuery: LQ
let client: TxOperations
let pipeline: PresentationPipeline

const txListeners: Array<(tx: Tx) => void> = []

/**
 * @public
 */
export function addTxListener (l: (tx: Tx) => void): void {
  txListeners.push(l)
}

/**
 * @public
 */
export function removeTxListener (l: (tx: Tx) => void): void {
  const pos = txListeners.findIndex((it) => it === l)
  if (pos !== -1) {
    txListeners.splice(pos, 1)
  }
}

class UIClient extends TxOperations implements Client {
  constructor (
    client: Client,
    private readonly liveQuery: Client
  ) {
    super(client, getCurrentAccount()._id)
  }

  override async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.liveQuery.findAll(_class, query, options)
  }

  override async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return await this.liveQuery.findOne(_class, query, options)
  }

  override async tx (tx: Tx): Promise<TxResult> {
    return await this.client.tx(tx)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return await this.client.searchFulltext(query, options)
  }
}

/**
 * @public
 */
export function getClient (): TxOperations {
  return client
}

/**
 * @public
 */
export async function setClient (_client: Client): Promise<void> {
  if (liveQuery !== undefined) {
    await liveQuery.close()
  }
  if (pipeline !== undefined) {
    await pipeline.close()
  }
  const factories = await _client.findAll(plugin.class.PresentationMiddlewareFactory, {})
  const promises = factories.map(async (it) => await getResource(it.createPresentationMiddleware))
  const creators = await Promise.all(promises)
  // eslint-disable-next-line @typescript-eslint/unbound-method
  pipeline = PresentationPipelineImpl.create(_client, [OptimizeQueryMiddleware.create, ...creators])

  const needRefresh = liveQuery !== undefined
  liveQuery = new LQ(pipeline)
  client = new UIClient(pipeline, liveQuery)

  _client.notify = (tx: Tx) => {
    pipeline.notifyTx(tx).catch((err) => {
      console.log(err)
    })

    liveQuery.tx(tx).catch((err) => {
      console.log(err)
    })

    txListeners.forEach((it) => {
      it(tx)
    })
  }
  if (needRefresh || globalQueries.length > 0) {
    await refreshClient()
  }
}

/**
 * @public
 */
export async function refreshClient (): Promise<void> {
  await liveQuery?.refreshConnect()
  for (const q of globalQueries) {
    q.refreshClient()
  }
}

/**
 * @public
 */
export async function closeClient (): Promise<void> {
  await client?.close()
}

const globalQueries: LiveQuery[] = []

/**
 * @public
 */
export class LiveQuery {
  private oldClass: Ref<Class<Doc>> | undefined
  private oldQuery: DocumentQuery<Doc> | undefined
  private oldOptions: FindOptions<Doc> | undefined
  private oldCallback: ((result: FindResult<any>) => void | Promise<void>) | undefined
  private reqId = 0
  unsubscribe: () => void = () => {}
  clientRecreated = false

  constructor (noDestroy: boolean = false) {
    if (!noDestroy) {
      onDestroy(() => {
        this.unsubscribe()
      })
    } else {
      globalQueries.push(this)
    }
  }

  query<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: FindResult<T>) => void | Promise<void>,
    options?: FindOptions<T>
  ): boolean {
    if (!this.needUpdate(_class, query, callback, options) && !this.clientRecreated) {
      return false
    }
    // We need to prevent callback with old values to be happening
    // One time refresh in case of client recreation
    this.clientRecreated = false
    this.doQuery<T>(++this.reqId, _class, query, callback, options)
    return true
  }

  private doQuery<T extends Doc>(
    id: number,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: FindResult<T>) => void | Promise<void>,
    options: FindOptions<T> | undefined
  ): void {
    if (pipeline === undefined) {
      // We need remember values to perform refresh.
      this.oldCallback = callback
      this.oldClass = _class
      this.oldOptions = options
      this.oldQuery = query

      return
    }
    const piplineQuery = pipeline.subscribe(_class, query, options, () => {
      // Refresh query if pipeline decide it is required.
      this.refreshClient()
    })
    if (id !== this.reqId) {
      // If we have one more request after this one, no need to do something.
      void piplineQuery.then((res) => {
        res.unsubscribe()
      })
      return
    }

    this.unsubscribe()
    this.oldCallback = callback
    this.oldClass = _class
    this.oldOptions = options
    this.oldQuery = query

    const unsub = liveQuery.query(
      _class,
      query,
      (result) => {
        // If we have one more request after this one, no need to do something.
        if (id === this.reqId) {
          void callback(result)
        }
      },
      options
    )
    this.unsubscribe = () => {
      unsub()
      void piplineQuery.then((res) => {
        res.unsubscribe()
      })
      this.oldCallback = undefined
      this.oldClass = undefined
      this.oldOptions = undefined
      this.oldQuery = undefined
      this.unsubscribe = () => {}
    }
  }

  refreshClient (): void {
    this.clientRecreated = true
    if (this.oldClass !== undefined && this.oldQuery !== undefined && this.oldCallback !== undefined) {
      const _class = this.oldClass
      const query = this.oldQuery
      const callback = this.oldCallback
      const options = this.oldOptions
      this.doQuery(++this.reqId, _class, query, callback, options)
    }
  }

  private needUpdate<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: FindResult<T>) => void | Promise<void>,
    options?: FindOptions<T>
  ): boolean {
    if (!deepEqual(_class, this.oldClass)) return true
    if (!deepEqual(query, this.oldQuery)) return true
    if (!deepEqual(callback.toString(), this.oldCallback?.toString())) return true
    if (!deepEqual(options, this.oldOptions)) return true
    return false
  }
}

/**
 * @public
 */
export function createQuery (dontDestroy?: boolean): LiveQuery {
  return new LiveQuery(dontDestroy)
}

/**
 * @public
 */
export function getFileUrl (file: string, size: IconSize = 'full', filename?: string): string {
  if (file.includes('://')) {
    return file
  }
  const uploadUrl = getMetadata(plugin.metadata.UploadURL)

  if (filename !== undefined) {
    return `${uploadUrl as string}/${filename}?file=${file}&size=${size as string}`
  }
  return `${uploadUrl as string}?file=${file}&size=${size as string}`
}

/**
 * @public
 */
export async function getBlobURL (blob: Blob): Promise<string> {
  return await new Promise((resolve) => {
    const reader = new FileReader()

    reader.addEventListener(
      'load',
      () => {
        resolve(reader.result as string)
      },
      false
    )
    reader.readAsDataURL(blob)
  })
}

/**
 * @public
 */
export async function copyTextToClipboard (text: string): Promise<void> {
  try {
    // Safari specific behavior
    // see https://bugs.webkit.org/show_bug.cgi?id=222262
    const clipboardItem = new ClipboardItem({
      'text/plain': Promise.resolve(text)
    })
    await navigator.clipboard.write([clipboardItem])
  } catch {
    // Fallback to default clipboard API implementation
    await navigator.clipboard.writeText(text)
  }
}

/**
 * @public
 */
export type AttributeCategory = 'object' | 'attribute' | 'inplace' | 'collection' | 'array'

/**
 * @public
 */
export const AttributeCategoryOrder = { attribute: 0, inplace: 1, collection: 2, array: 2, object: 3 }

/**
 * @public
 */
export function getAttributePresenterClass (
  hierarchy: Hierarchy,
  attribute: AnyAttribute
): { attrClass: Ref<Class<Doc>>, category: AttributeCategory } {
  let attrClass = attribute.type._class
  let category: AttributeCategory = 'attribute'
  if (hierarchy.isDerived(attrClass, core.class.RefTo)) {
    attrClass = (attribute.type as RefTo<Doc>).to
    category = 'object'
  }
  if (hierarchy.isDerived(attrClass, core.class.TypeMarkup)) {
    category = 'inplace'
  }
  if (hierarchy.isDerived(attrClass, core.class.TypeCollaborativeMarkup)) {
    category = 'inplace'
  }
  if (hierarchy.isDerived(attrClass, core.class.Collection)) {
    attrClass = (attribute.type as Collection<AttachedDoc>).of
    category = 'collection'
  }
  if (hierarchy.isDerived(attrClass, core.class.ArrOf)) {
    const of = (attribute.type as ArrOf<AttachedDoc>).of
    attrClass = of._class === core.class.RefTo ? (of as RefTo<Doc>).to : of._class
    category = 'array'
  }
  return { attrClass, category }
}

function getAttributeEditorNotFoundError (
  _class: Ref<Class<Obj>>,
  key: KeyedAttribute | string,
  exception?: unknown
): string {
  const attributeKey = typeof key === 'string' ? key : key.key
  const error = exception !== undefined ? `, cause: ${exception as string}` : ''

  return `attribute editor not found for class "${_class}", attribute "${attributeKey}"` + error
}

export async function getAttributeEditor (
  client: Client,
  _class: Ref<Class<Obj>>,
  key: KeyedAttribute | string
): Promise<AnySvelteComponent | undefined> {
  const hierarchy = client.getHierarchy()
  const attribute = typeof key === 'string' ? hierarchy.getAttribute(_class, key) : key.attr
  const presenterClass = attribute !== undefined ? getAttributePresenterClass(hierarchy, attribute) : undefined

  if (presenterClass === undefined) {
    return
  }

  let mixin: Ref<Mixin<AttributeEditor>>

  switch (presenterClass.category) {
    case 'collection': {
      mixin = view.mixin.CollectionEditor
      break
    }
    case 'array': {
      mixin = view.mixin.ArrayEditor
      break
    }
    default: {
      mixin = view.mixin.AttributeEditor
    }
  }

  if (attribute.editor != null) {
    try {
      return await getResource(attribute.editor)
    } catch (ex) {
      console.error(getAttributeEditorNotFoundError(_class, key, ex))
    }
  }
  const editorMixin = hierarchy.classHierarchyMixin(presenterClass.attrClass, mixin)

  if (editorMixin?.inlineEditor === undefined) {
    // if (presenterClass.category === 'array') {
    //   // NOTE: Don't show error for array attributes for compatibility with previous implementation
    // } else {
    console.error(getAttributeEditorNotFoundError(_class, key))
    // }
    return
  }

  try {
    return await getResource(editorMixin.inlineEditor)
  } catch (ex) {
    console.error(getAttributeEditorNotFoundError(_class, key, ex))
  }
}

function filterKeys (hierarchy: Hierarchy, keys: KeyedAttribute[], ignoreKeys: string[]): KeyedAttribute[] {
  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())
  keys = keys.filter((k) => !docKeys.has(k.key))
  keys = keys.filter((k) => !ignoreKeys.includes(k.key))
  return keys
}

/**
 * @public
 */
export function getFiltredKeys (
  hierarchy: Hierarchy,
  objectClass: Ref<Class<Doc>>,
  ignoreKeys: string[],
  to?: Ref<Class<Doc>>
): KeyedAttribute[] {
  const keys = [...hierarchy.getAllAttributes(objectClass, to).entries()]
    .filter(([, value]) => value.hidden !== true)
    .map(([key, attr]) => ({ key, attr }))

  return filterKeys(hierarchy, keys, ignoreKeys)
}

/**
 * @public
 */
export function isCollectionAttr (hierarchy: Hierarchy, key: KeyedAttribute): boolean {
  return hierarchy.isDerived(key.attr.type._class, core.class.Collection)
}
