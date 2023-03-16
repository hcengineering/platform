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
  AnyAttribute,
  ArrOf,
  AttachedDoc,
  Class,
  Client,
  Collection,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  getCurrentAccount,
  Hierarchy,
  Mixin,
  Obj,
  Ref,
  RefTo,
  Tx,
  TxOperations,
  TxResult,
  WithLookup
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { getMetadata, getResource, IntlString } from '@hcengineering/platform'
import { LiveQuery as LQ } from '@hcengineering/query'
import { onDestroy } from 'svelte'
import { deepEqual } from 'fast-equals'
import { IconSize, DropdownIntlItem, AnySvelteComponent } from '@hcengineering/ui'
import view, { AttributeEditor } from '@hcengineering/view'
import contact, { AvatarType, AvatarProvider } from '@hcengineering/contact'
import presentation, { KeyedAttribute } from '..'

let liveQuery: LQ
let client: TxOperations

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
  constructor (client: Client, private readonly liveQuery: LQ) {
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
    return await super.tx(tx)
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
export function setClient (_client: Client): void {
  liveQuery = new LQ(_client)
  client = new UIClient(_client, liveQuery)
  _client.notify = (tx: Tx) => {
    liveQuery.tx(tx).catch((err) => console.log(err))

    txListeners.forEach((it) => it(tx))
  }
}

/**
 * @public
 */
export class LiveQuery {
  private oldClass: Ref<Class<Doc>> | undefined
  private oldQuery: DocumentQuery<Doc> | undefined
  private oldOptions: FindOptions<Doc> | undefined
  private oldCallback: ((result: FindResult<any>) => void) | undefined
  unsubscribe = () => {}

  constructor (dontDestroy: boolean = false) {
    if (!dontDestroy) {
      onDestroy(() => {
        this.unsubscribe()
      })
    }
  }

  query<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: FindResult<T>) => void,
    options?: FindOptions<T>
  ): boolean {
    if (!this.needUpdate(_class, query, callback, options)) {
      return false
    }
    this.unsubscribe()
    this.oldCallback = callback
    this.oldClass = _class
    this.oldOptions = options
    this.oldQuery = query
    const unsub = liveQuery.query(_class, query, callback, options)
    this.unsubscribe = () => {
      unsub()
      this.oldCallback = undefined
      this.oldClass = undefined
      this.oldOptions = undefined
      this.oldQuery = undefined
      this.unsubscribe = () => {}
    }
    return true
  }

  private needUpdate<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: FindResult<T>) => void,
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
export function getFileUrl (file: string, size: IconSize = 'full'): string {
  const uploadUrl = getMetadata(login.metadata.UploadUrl)
  const token = getMetadata(login.metadata.LoginToken)
  const url = `${uploadUrl as string}?file=${file}&token=${token as string}&size=${size as string}`
  return url
}

/**
 * @public
 */
export async function getBlobURL (blob: Blob): Promise<string> {
  return await new Promise((resolve) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => resolve(reader.result as string), false)
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

export function getAvatarTypeDropdownItems (hasGravatar: boolean): DropdownIntlItem[] {
  return [
    {
      id: AvatarType.COLOR,
      label: contact.string.UseColor
    },
    {
      id: AvatarType.IMAGE,
      label: contact.string.UseImage
    },
    ...(hasGravatar
      ? [
          {
            id: AvatarType.GRAVATAR,
            label: contact.string.UseGravatar
          }
        ]
      : [])
  ]
}

export function getAvatarProviderId (avatar?: string | null): Ref<AvatarProvider> | undefined {
  if (avatar === null || avatar === undefined || avatar === '') {
    return
  }
  if (!avatar.includes('://')) {
    return contact.avatarProvider.Image
  }
  const [schema] = avatar.split('://')

  switch (schema) {
    case AvatarType.GRAVATAR:
      return contact.avatarProvider.Gravatar
    case AvatarType.COLOR:
      return contact.avatarProvider.Color
  }
}

/**
 * @public
 */
export type AssigneeCategory =
  | 'CurrentUser'
  | 'Assigned'
  | 'PreviouslyAssigned'
  | 'ProjectLead'
  | 'ProjectMembers'
  | 'Members'
  | 'Other'

const assigneeCategoryTitleMap: Record<AssigneeCategory, IntlString> = Object.freeze({
  CurrentUser: presentation.string.CategoryCurrentUser,
  Assigned: presentation.string.Assigned,
  PreviouslyAssigned: presentation.string.CategoryPreviousAssigned,
  ProjectLead: presentation.string.CategoryProjectLead,
  ProjectMembers: presentation.string.CategoryProjectMembers,
  Members: presentation.string.Members,
  Other: presentation.string.CategoryOther
})

/**
 * @public
 */
export const assigneeCategoryOrder: AssigneeCategory[] = [
  'CurrentUser',
  'Assigned',
  'PreviouslyAssigned',
  'ProjectLead',
  'ProjectMembers',
  'Members',
  'Other'
]

/**
 * @public
 */
export function getCategorytitle (category: AssigneeCategory | undefined): IntlString {
  const cat: AssigneeCategory = category ?? 'Other'
  return assigneeCategoryTitleMap[cat]
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

  const typeClass = hierarchy.getClass(presenterClass.attrClass)
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

  let editorMixin = hierarchy.as(typeClass, mixin)
  let parent = typeClass.extends

  while (editorMixin.inlineEditor === undefined && parent !== undefined) {
    const parentClass = hierarchy.getClass(parent)
    editorMixin = hierarchy.as(parentClass, mixin)
    parent = parentClass.extends
  }

  if (editorMixin.inlineEditor === undefined) {
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
