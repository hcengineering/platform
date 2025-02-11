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
  MeasureMetricsContext,
  TxOperations,
  TxProcessor,
  getCurrentAccount,
  reduceCalls,
  type Account,
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
  type Hierarchy,
  type Mixin,
  type Obj,
  type Ref,
  type RefTo,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Space,
  type Tx,
  type TxApplyIf,
  type TxCUD,
  type TxResult,
  type TypeAny,
  type WithLookup,
  type WorkspaceDataId
} from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import { LiveQuery as LQ } from '@hcengineering/query'
import { getRawCurrentLocation, workspaceId, type AnyComponent, type AnySvelteComponent } from '@hcengineering/ui'
import view, { type AttributeCategory, type AttributeEditor } from '@hcengineering/view'
import { deepEqual } from 'fast-equals'
import { onDestroy } from 'svelte'
import { get, writable } from 'svelte/store'

import { type KeyedAttribute } from '..'
import { OptimizeQueryMiddleware, PresentationPipelineImpl, type PresentationPipeline } from './pipeline'
import plugin from './plugin'

export { reduceCalls } from '@hcengineering/core'

let liveQuery: LQ
let rawLiveQuery: LQ
let client: TxOperations & Client
let pipeline: PresentationPipeline

export type TxListener = (tx: Tx[]) => void
const txListeners: TxListener[] = []

/**
 * @public
 */
export function addTxListener (l: TxListener): void {
  txListeners.push(l)
}

export function getRawLiveQuery (): LQ {
  return rawLiveQuery
}

/**
 * @public
 */
export function removeTxListener (l: TxListener): void {
  const pos = txListeners.findIndex((it) => it === l)
  if (pos !== -1) {
    txListeners.splice(pos, 1)
  }
}

export const uiContext = new MeasureMetricsContext('client-ui', {})

export const pendingCreatedDocs = writable<Record<Ref<Doc>, boolean>>({})

class UIClient extends TxOperations implements Client {
  hook = getMetadata(plugin.metadata.ClientHook)
  constructor (
    client: Client,
    private readonly liveQuery: Client
  ) {
    super(client, getCurrentAccount().primarySocialId)
  }

  protected pendingTxes = new Set<Ref<Tx>>()

  async doNotify (...tx: Tx[]): Promise<void> {
    const pending = get(pendingCreatedDocs)
    let pendingUpdated = false
    tx.forEach((t) => {
      if (this.pendingTxes.has(t._id)) {
        this.pendingTxes.delete(t._id)

        // Only CUD tx can be pending now
        const innerTx = t as TxCUD<Doc>

        if (innerTx._class === core.class.TxCreateDoc) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete pending[innerTx.objectId]
          pendingUpdated = true
        }
      }
    })
    if (pendingUpdated) {
      pendingCreatedDocs.set(pending)
    }

    // We still want to notify about all transactions because there might be queries created after
    // the early applied transaction
    // For old queries there's a check anyway that prevents the same document from being added twice
    await this.provideNotify(...tx)
  }

  private async provideNotify (...tx: Tx[]): Promise<void> {
    try {
      await pipeline.notifyTx(...tx)

      await liveQuery.tx(...tx)

      await rawLiveQuery.tx(...tx)

      txListeners.forEach((it) => {
        it(tx)
      })
    } catch (err: any) {
      Analytics.handleError(err)
      console.log(err)
    }
  }

  override async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (this.hook !== undefined) {
      return await this.hook.findAll(this.liveQuery, _class, query, options)
    }
    return await this.liveQuery.findAll(_class, query, options)
  }

  override async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    if (this.hook !== undefined) {
      return await this.hook.findOne(this.liveQuery, _class, query, options)
    }
    return await this.liveQuery.findOne(_class, query, options)
  }

  override async tx (tx: Tx): Promise<TxResult> {
    void this.notifyEarly(tx)
    if (this.hook !== undefined) {
      return await this.hook.tx(this.client, tx)
    }
    return await this.client.tx(tx)
  }

  private async notifyEarly (tx: Tx): Promise<void> {
    if (tx._class === core.class.TxApplyIf) {
      const applyTx = tx as TxApplyIf

      if ((applyTx.match?.length ?? 0) !== 0 || (applyTx.notMatch?.length ?? 0) !== 0) {
        // Cannot early apply conditional transactions
        return
      }

      await Promise.all(
        applyTx.txes.map(async (atx) => {
          await this.notifyEarly(atx)
        })
      )
      return
    }

    if (!TxProcessor.isExtendsCUD(tx._class)) {
      return
    }

    const innerTx = tx as TxCUD<Doc>
    // Can pre-build some configuration later from the model if this will be too slow.
    const instantTxes = this.getHierarchy().classHierarchyMixin(innerTx.objectClass, plugin.mixin.InstantTransactions)
    if (instantTxes?.txClasses.includes(innerTx._class) !== true) {
      return
    }

    if (innerTx._class === core.class.TxCreateDoc) {
      const pending = get(pendingCreatedDocs)
      pending[innerTx.objectId] = true
      pendingCreatedDocs.set(pending)
    }

    this.pendingTxes.add(tx._id)
    await this.provideNotify(tx)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    if (this.hook !== undefined) {
      return await this.hook.searchFulltext(this.client, query, options)
    }
    return await this.client.searchFulltext(query, options)
  }
}

const hierarchyProxy = new Proxy(
  {},
  {
    get (target, p, receiver) {
      const h = client.getHierarchy()
      return Reflect.get(h, p)
    }
  }
) as TxOperations & Client

// We need a proxy to handle all the calls to the proper client.
const clientProxy = new Proxy(
  {},
  {
    get (target, p, receiver) {
      if (p === 'getHierarchy') {
        return () => hierarchyProxy
      }
      return Reflect.get(client, p)
    }
  }
) as TxOperations & Client
/**
 * @public
 */
export function getClient (): TxOperations & Client {
  return clientProxy
}

export type OnClientListener = (client: Client, account: Account) => void | Promise<void>
const onClientListeners: OnClientListener[] = []

export function onClient (l: OnClientListener): void {
  onClientListeners.push(l)
  if (client !== undefined) {
    setTimeout(() => {
      void l(client, getCurrentAccount())
    })
  }
}

let txQueue: Tx[] = []

export type RefreshListener = () => void

const refreshListeners = new Set<RefreshListener>()

export function addRefreshListener (r: RefreshListener): void {
  refreshListeners.add(r)
}

/**
 * @public
 */
export async function setClient (_client: Client): Promise<void> {
  pendingCreatedDocs.set({})
  if (liveQuery !== undefined) {
    await liveQuery.close()
  }
  if (rawLiveQuery !== undefined) {
    await rawLiveQuery.close()
  }
  if (pipeline !== undefined) {
    await pipeline.close()
  }

  const needRefresh = liveQuery !== undefined
  rawLiveQuery = new LQ(_client)

  const factories = await _client.findAll(plugin.class.PresentationMiddlewareFactory, {})
  const promises = factories.map(async (it) => await getResource(it.createPresentationMiddleware))
  const creators = await Promise.all(promises)
  // eslint-disable-next-line @typescript-eslint/unbound-method
  pipeline = PresentationPipelineImpl.create(_client, [OptimizeQueryMiddleware.create, ...creators])

  liveQuery = new LQ(pipeline)

  const uiClient = new UIClient(pipeline, liveQuery)

  client = uiClient

  const notifyCaller = reduceCalls(async () => {
    const t = txQueue
    txQueue = []
    await uiClient.doNotify(...t)
  })

  _client.notify = (...tx: Tx[]) => {
    txQueue.push(...tx)
    void notifyCaller()
  }
  if (needRefresh || globalQueries.length > 0) {
    await refreshClient(true)
  }
  const acc = getCurrentAccount()
  onClientListeners.forEach((l) => {
    void l(_client, acc)
  })
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
    for (const listener of refreshListeners.values()) {
      listener()
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

export function getCurrentWorkspaceUrl (): string {
  const wsId = get(workspaceId)
  if (wsId == null) {
    return getRawCurrentLocation().path[1]
  }
  return wsId
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
export function copyTextToClipboardOldBrowser (text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.classList.add('hulyClipboardArea')
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
  } catch (err) {
    console.error(err)
  }
  document.body.removeChild(textarea)
}

/**
 * @public
 */
export async function copyTextToClipboard (text: string | Promise<string>): Promise<void> {
  try {
    // Safari specific behavior
    // see https://bugs.webkit.org/show_bug.cgi?id=222262
    const clipboardItem = new ClipboardItem({
      'text/plain': text instanceof Promise ? text : Promise.resolve(text)
    })
    await navigator.clipboard.write([clipboardItem])
  } catch {
    // Fallback to default clipboard API implementation
    if (navigator.clipboard != null && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text instanceof Promise ? await text : text)
    } else copyTextToClipboardOldBrowser(text instanceof Promise ? await text : text)
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
  keys = keys.filter((k) => !docKeys.has(k.key) || k.attr.editor !== undefined)
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
export function isMarkupAttr (hierarchy: Hierarchy, key: KeyedAttribute): boolean {
  return hierarchy.isDerived(key.attr.type._class, core.class.TypeMarkup)
}

/**
 * @public
 */
export function isCollabAttr (hierarchy: Hierarchy, key: KeyedAttribute): boolean {
  return hierarchy.isDerived(key.attr.type._class, core.class.TypeCollaborativeDoc)
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
  const decodedToken = decodeTokenPayload(getMetadata(plugin.metadata.Token) ?? '')
  console.log('decodedToken', decodedToken)
  return decodedToken.extra?.admin === 'true'
}

export function isSpace (space: Doc): space is Space {
  return isSpaceClass(space._class)
}

export function isSpaceClass (_class: Ref<Class<Doc>>): boolean {
  return client.getHierarchy().isDerived(_class, core.class.Space)
}

export function setPresentationCookie (token: string, workspaceUuid: WorkspaceDataId): void {
  function setToken (path: string): void {
    const res =
      encodeURIComponent(plugin.metadata.Token.replaceAll(':', '-')) +
      '=' +
      encodeURIComponent(token) +
      `; path=${path}`
    console.log('setting cookie', res)
    document.cookie = res
  }
  setToken('/files/' + workspaceUuid)
}

export const upgradeDownloadProgress = writable(-1)

export function setDownloadProgress (percent: number): void {
  if (Number.isNaN(percent)) {
    return
  }

  upgradeDownloadProgress.set(Math.round(percent))
}

export async function loadServerConfig (url: string): Promise<any> {
  let retries = 5
  let res: Response | undefined

  do {
    try {
      res = await fetch(url, { keepalive: true })
      break
    } catch (e: any) {
      retries--
      if (retries === 0) {
        throw new Error(`Failed to load server config: ${e}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (5 - retries)))
    }
  } while (retries > 0)

  if (res === undefined) {
    // In theory should never get here
    throw new Error('Failed to load server config')
  }

  return await res.json()
}
