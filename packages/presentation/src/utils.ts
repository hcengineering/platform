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

import { Analytics } from '@hcengineering/analytics'
import core, {
  TxOperations,
  concatLink,
  getCurrentAccount,
  reduceCalls,
  type AnyAttribute,
  type ArrOf,
  type AttachedDoc,
  type BlobLookup,
  type Class,
  type Client,
  type Collection,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type MeasureClient,
  type MeasureDoneOperation,
  type Mixin,
  type Obj,
  type Blob as PlatformBlob,
  type Ref,
  type RefTo,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Space,
  type Tx,
  type TxResult,
  type TypeAny,
  type WithLookup
} from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import { LiveQuery as LQ } from '@hcengineering/query'
import { getRawCurrentLocation, workspaceId, type AnyComponent, type AnySvelteComponent } from '@hcengineering/ui'
import view, { type AttributeCategory, type AttributeEditor } from '@hcengineering/view'
import { deepEqual } from 'fast-equals'
import { onDestroy } from 'svelte'
import { get } from 'svelte/store'
import { type KeyedAttribute } from '..'
import { OptimizeQueryMiddleware, PresentationPipelineImpl, type PresentationPipeline } from './pipeline'
import plugin from './plugin'
export { reduceCalls } from '@hcengineering/core'

let liveQuery: LQ
let client: TxOperations & MeasureClient
let pipeline: PresentationPipeline

const txListeners: Array<(...tx: Tx[]) => void> = []

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

class UIClient extends TxOperations implements Client, MeasureClient {
  constructor (
    client: MeasureClient,
    private readonly liveQuery: Client
  ) {
    super(client, getCurrentAccount()._id)
  }

  afterMeasure: Tx[] = []
  measureOp?: MeasureDoneOperation

  async doNotify (...tx: Tx[]): Promise<void> {
    if (this.measureOp !== undefined) {
      this.afterMeasure.push(...tx)
    } else {
      try {
        await pipeline.notifyTx(...tx)

        await liveQuery.tx(...tx)

        txListeners.forEach((it) => {
          it(...tx)
        })
      } catch (err: any) {
        Analytics.handleError(err)
        console.log(err)
      }
    }
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

  async measure (operationName: string): Promise<MeasureDoneOperation> {
    // return await (this.client as MeasureClient).measure(operationName)
    const mop = await (this.client as MeasureClient).measure(operationName)
    this.measureOp = mop
    return async () => {
      const result = await mop()
      this.measureOp = undefined
      if (this.afterMeasure.length > 0) {
        const txes = this.afterMeasure
        this.afterMeasure = []
        for (const tx of txes) {
          await this.doNotify(tx)
        }
      }
      return result
    }
  }
}

/**
 * @public
 */
export function getClient (): TxOperations & MeasureClient {
  return client
}

/**
 * @public
 */
export async function setClient (_client: MeasureClient): Promise<void> {
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
  const uiClient = new UIClient(pipeline, liveQuery)
  client = uiClient

  _client.notify = (...tx: Tx[]) => {
    void uiClient.doNotify(...tx)
  }
  if (needRefresh || globalQueries.length > 0) {
    await refreshClient(true)
  }
}

/**
 * @public
 */
export async function refreshClient (clean: boolean): Promise<void> {
  if (!(liveQuery?.isClosed() ?? true)) {
    await liveQuery?.refreshConnect(clean)
    for (const q of globalQueries) {
      q.refreshClient()
    }
  }
}

/**
 * @public
 */
export async function purgeClient (): Promise<void> {
  await liveQuery?.close()
  await pipeline?.close()
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
    void this.reducedDoQuery(++this.reqId, _class, query, callback as any, options)
    return true
  }

  reducedDoQuery = reduceCalls(
    async (
      id: number,
      _class: Ref<Class<Doc>>,
      query: DocumentQuery<Doc>,
      callback: (result: FindResult<Doc>) => void | Promise<void>,
      options: FindOptions<Doc> | undefined
    ) => {
      this.doQuery(id, _class, query, callback, options)
    }
  )

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

export async function getBlobHref (
  _blob: PlatformBlob | undefined,
  file: Ref<PlatformBlob>,
  filename?: string
): Promise<string> {
  let blob = _blob as BlobLookup
  if (blob?.downloadUrl === undefined) {
    blob = (await getClient().findOne(core.class.Blob, { _id: file })) as BlobLookup
  }
  return blob?.downloadUrl ?? getFileUrl(file, filename)
}

export function getCurrentWorkspaceUrl (): string {
  const wsId = get(workspaceId)
  if (wsId == null) {
    return getRawCurrentLocation().path[1]
  }
  return wsId
}

/**
 * @public
 */
export function getFileUrl (file: Ref<PlatformBlob>, filename?: string): string {
  if (file.includes('://')) {
    return file
  }
  const frontUrl = getMetadata(plugin.metadata.FrontUrl) ?? window.location.origin
  let uploadUrl = getMetadata(plugin.metadata.UploadURL) ?? ''
  if (!uploadUrl.includes('://')) {
    uploadUrl = concatLink(frontUrl ?? '', uploadUrl)
  }
  return `${uploadUrl}/${getCurrentWorkspaceUrl()}${filename !== undefined ? '/' + encodeURIComponent(filename) : ''}?file=${file}`
}

export function sizeToWidth (size: string): number | undefined {
  let width: number | undefined
  switch (size) {
    case 'inline':
    case 'tiny':
    case 'card':
    case 'x-small':
    case 'smaller':
    case 'small':
      width = 32
      break
    case 'medium':
      width = 64
      break
    case 'large':
      width = 256
      break
    case 'x-large':
      width = 512
      break
    case '2x-large':
      width = 1024
      break
  }
  return width
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
  if (hierarchy.isDerived(attrClass, core.class.TypeCollaborativeDoc)) {
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

  if (attribute.type._class === core.class.TypeAny) {
    const _type: TypeAny = attribute.type as TypeAny<AnyComponent>
    return await getResource(_type.editor ?? _type.presenter)
  }

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

/**
 * @public
 */
export function decodeTokenPayload (token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch (err: any) {
    console.error(err)
    return {}
  }
}

export function isAdminUser (): boolean {
  return decodeTokenPayload(getMetadata(plugin.metadata.Token) ?? '').admin === 'true'
}

export function isSpace (space: Doc): space is Space {
  return getClient().getHierarchy().isDerived(space._class, core.class.Space)
}

export function setPresentationCookie (token: string, workspaceId: string): void {
  function setToken (path: string): void {
    document.cookie =
      encodeURIComponent(plugin.metadata.Token.replaceAll(':', '-')) +
      '=' +
      encodeURIComponent(token) +
      `; path=${path}`
  }
  setToken('/files/' + workspaceId)
}
