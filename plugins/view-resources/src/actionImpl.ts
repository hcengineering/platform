//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { escapeCommentJson } from './tableSource'
import contact from '@hcengineering/contact'
import core, {
  type Blob,
  type Class,
  type Doc,
  type DocumentQuery,
  Hierarchy,
  type Ref,
  type Space,
  type TxResult,
  getCurrentAccount,
  makeDocCollabId
} from '@hcengineering/core'
import { type Asset, type IntlString, type Resource, getResource } from '@hcengineering/platform'
import {
  type ContextStore,
  MessageBox,
  contextStore,
  copyTextToClipboardOldBrowser,
  getClient,
  getMarkup,
  hasResource,
  updateAttribute
} from '@hcengineering/presentation'
import { markupToJSON } from '@hcengineering/text'
import { markupToMarkdown } from '@hcengineering/text-markdown'
import {
  type AnyComponent,
  type AnySvelteComponent,
  type PopupAlignment,
  type PopupPosAlignment,
  closeTooltip,
  isPopupPosAlignment,
  locationToUrl,
  navigate,
  showPanel,
  showPopup
} from '@hcengineering/ui'
import { TABLE_METADATA_HTML_ATTRIBUTE, TABLE_METADATA_MARKER, TABLE_METADATA_MIME_TYPE } from '@hcengineering/view'
import { get } from 'svelte/store'
import MoveView from './components/Move.svelte'
import view from './plugin'
import {
  type FocusSelection,
  type SelectDirection,
  type SelectionStore,
  focusStore,
  previewDocument,
  selectionLimit,
  selectionStore
} from './selection'
import { deleteObjects, getObjectId, getObjectLinkFragment, restrictionStore } from './utils'
import workbenchPlugin from '@hcengineering/workbench'
import converter, { type CopyAsMarkdownTableProps } from '@hcengineering/converter'

/**
 * Action to be used for copying text to clipboard.
 * In Safari a request to write to the clipboard must be triggered during a user gesture.
 * A call to clipboard.write or clipboard.writeText outside the scope of a user
 * gesture(such as "click" or "touch" event handlers) will result in the immediate
 * rejection of the promise returned by the API call.
 * https://webkit.org/blog/10855/async-clipboard-api/
 *
 *  * Require props:
 * - textProvider - a function that provides text to be copied.
 * - props - additional text provider props.
 */
async function CopyTextToClipboard (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    textProvider: Resource<(doc: Doc, props?: Record<string, any>) => Promise<string>>
    props?: Record<string, any>
  }
): Promise<void> {
  // Pass a Promise so ClipboardItem is created synchronously within the user gesture (Safari)
  const text = getResource(props.textProvider).then(async (getText) =>
    Array.isArray(doc)
      ? (await Promise.all(doc.map(async (d) => await getText(d, props.props)))).join(',')
      : await getText(doc, props.props)
  )
  await copyText(text, 'text/plain')
}

export async function copyText (text: any, contentType: string = 'text/plain'): Promise<void> {
  try {
    // Check if ClipboardItem is available
    if (typeof ClipboardItem !== 'undefined') {
      const clipboardData: Record<string, any> = {
        [contentType]: text instanceof Promise ? text : Promise.resolve(text)
      }

      const clipboardItem = new ClipboardItem(clipboardData)
      await navigator.clipboard.write([clipboardItem])
    } else {
      // Fallback if ClipboardItem is not available
      if (navigator.clipboard != null && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text instanceof Promise ? await text : text)
      } else {
        copyTextToClipboardOldBrowser(text instanceof Promise ? await text : text)
      }
    }
  } catch (error) {
    // Log error and fallback: only copy main content
    console.error('Failed to copy to clipboard, falling back to plain text:', error)
    if (navigator.clipboard != null && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text instanceof Promise ? await text : text)
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard with writeText, using old browser fallback:', fallbackError)
        copyTextToClipboardOldBrowser(text instanceof Promise ? await text : text)
      }
    } else {
      copyTextToClipboardOldBrowser(text instanceof Promise ? await text : text)
    }
  }
}

/**
 * Copy markdown text to clipboard with optional metadata for refreshable tables.
 * This function is specifically designed for copying markdown tables with metadata
 * that enables refresh, diff, and "see original data" functionality in text editors.
 *
 * @param markdown - The markdown text to copy
 * @param metadata - Optional metadata object containing table information (query, config, document IDs, etc.)
 */
export async function copyMarkdown (markdown: string, metadata?: Record<string, any>): Promise<void> {
  if (metadata !== undefined && copyWithMetadata(markdown, metadata)) return
  if (metadata !== undefined && (await copyWithHtmlMetadata(markdown, metadata))) return
  // Last resort for browsers without the async clipboard API: the metadata travels as an HTML
  // comment in the text itself.
  let markdownToCopy = markdown
  if (metadata !== undefined) {
    try {
      markdownToCopy = markdown + '\n' + `${TABLE_METADATA_MARKER}${escapeCommentJson(JSON.stringify(metadata))} -->`
    } catch (e) {
      console.error('Failed to embed metadata in markdown:', e)
    }
  }
  await copyText(markdownToCopy, 'text/plain')
}

function escapeHtml (text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * When the copy event is refused (the click no longer counts after a slow load, or Safari), write
 * clean Markdown as text/plain and keep the metadata in an attribute of the text/html flavour, so
 * it never shows up as text in other apps. Browsers reject custom types in ClipboardItem.
 */
async function copyWithHtmlMetadata (markdown: string, metadata: Record<string, any>): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || typeof navigator.clipboard?.write !== 'function') return false
  try {
    const html = `<pre ${TABLE_METADATA_HTML_ATTRIBUTE}="${escapeHtml(JSON.stringify(metadata))}">${escapeHtml(markdown)}</pre>`
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([markdown], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' })
      })
    ])
    return true
  } catch (e) {
    console.warn('Failed to copy the table with metadata in text/html:', e)
    return false
  }
}

/**
 * Put clean Markdown in text/plain and the metadata in its own clipboard type, so pasting into
 * other apps does not show a JSON comment. Returns false when the browser refuses the copy.
 */
function copyWithMetadata (markdown: string, metadata: Record<string, any>): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false
  let written = false
  const listener = (event: ClipboardEvent): void => {
    if (event.clipboardData === null) return
    event.clipboardData.setData('text/plain', markdown)
    event.clipboardData.setData(TABLE_METADATA_MIME_TYPE, JSON.stringify(metadata))
    event.preventDefault()
    event.stopImmediatePropagation()
    written = true
  }
  document.addEventListener('copy', listener, true)
  try {
    return document.execCommand('copy') && written
  } catch (e) {
    return false
  } finally {
    document.removeEventListener('copy', listener, true)
  }
}

function Delete (
  object: Doc | Doc[],
  evt: Event,
  props?: {
    skipCheck?: boolean
    afterDelete?: () => Promise<void>
    confirmation?: IntlString
  }
): void {
  const skipCheck = props?.skipCheck ?? false
  showPopup(
    contact.component.DeleteConfirmationPopup,
    {
      object,
      skipCheck,
      confirmation: props?.confirmation,
      deleteAction: async () => {
        try {
          const objs = Array.isArray(object) ? object : [object]
          await deleteObjects(getClient(), objs, skipCheck)
          if (props?.afterDelete !== undefined) {
            await props.afterDelete()
          }
        } catch (e) {
          console.error(e)
        }
      }
    },
    undefined
  )
}

function Archive (object: Space | Space[]): void {
  showPopup(
    MessageBox,
    {
      label: view.string.Archive,
      message: view.string.ArchiveConfirm,
      params: { count: Array.isArray(object) ? object.length : 1 },
      action: async () => {
        const objs = Array.isArray(object) ? object : [object]
        const client = getClient()
        const promises: Array<Promise<TxResult>> = []
        for (const obj of objs) {
          promises.push(client.update(obj, { archived: true }))
        }
        await Promise.all(promises)
      }
    },
    undefined
  )
}

function UnArchive (object: Space | Space[]): void {
  showPopup(
    MessageBox,
    {
      label: view.string.UnArchive,
      message: view.string.UnArchiveConfirm,
      params: { count: Array.isArray(object) ? object.length : 1 },
      action: async () => {
        const objs = Array.isArray(object) ? object : [object]
        const client = getClient()
        const promises: Array<Promise<TxResult>> = []
        for (const obj of objs) {
          promises.push(client.update(obj, { archived: false }))
        }
        await Promise.all(promises)
      }
    },
    undefined
  )
}

async function Leave (object: Space | Space[]): Promise<void> {
  const client = getClient()
  const promises: Array<Promise<TxResult>> = []
  const objs = Array.isArray(object) ? object : [object]
  const myAccount = getCurrentAccount().uuid
  for (const obj of objs) {
    if (obj.members.includes(myAccount)) {
      promises.push(client.update(obj, { $pull: { members: myAccount } }))
    }
  }
  await Promise.all(promises)
}

async function Join (object: Space | Space[]): Promise<void> {
  const client = getClient()
  const promises: Array<Promise<TxResult>> = []
  const objs = Array.isArray(object) ? object : [object]
  const myAccount = getCurrentAccount().uuid
  for (const obj of objs) {
    if (!obj.members.includes(myAccount)) {
      promises.push(client.update(obj, { $push: { members: myAccount } }))
    }
  }
  await Promise.all(promises)
}

async function Move (docs: Doc | Doc[]): Promise<void> {
  showPopup(MoveView, { selected: docs })
}

let $focusStore: FocusSelection
focusStore.subscribe((it) => {
  $focusStore = it
})

let $contextStore: ContextStore
contextStore.subscribe((it) => {
  $contextStore = it
})

let $selectionStore: SelectionStore
selectionStore.subscribe((it) => {
  $selectionStore = it
})

export function select (
  evt: Event | undefined,
  offset: 1 | -1 | 0,
  of?: Doc,
  direction?: SelectDirection,
  noScroll?: boolean
): void {
  closeTooltip()
  if ($focusStore.provider?.select !== undefined) {
    $focusStore.provider?.select(offset, of, direction, noScroll)
    evt?.preventDefault()
    previewDocument.update((old) => {
      if (old !== undefined) {
        return $focusStore.focus
      }
    })
  }
}

function SelectItem (doc: Doc | Doc[] | undefined, evt: Event): void {
  const focus = $focusStore.focus
  const provider = $selectionStore.provider ?? $focusStore.provider
  if (focus !== undefined) {
    provider?.selection.update((selection) => {
      const ind = selection.findIndex((it) => it._id === focus._id)
      if (ind === -1) {
        selection.push(focus)
      } else {
        selection.splice(ind, 1)
      }
      return selection
    })
  }
  evt.preventDefault()
}
function SelectItemNone (doc: Doc | undefined, evt: Event): void {
  const provider = $selectionStore.provider ?? $focusStore.provider
  if (provider !== undefined) {
    provider.selection.set([])
    previewDocument.set(undefined)
    evt.preventDefault()
  }
}
function SelectItemAll (doc: Doc | undefined, evt: Event): void {
  const provider = $selectionStore.provider ?? $focusStore.provider
  if (provider !== undefined) {
    const docs = provider.docs() ?? []
    provider.selection.set(docs.slice(0, selectionLimit))
    previewDocument.set(undefined)
    evt.preventDefault()
  }
}

const MoveUp = (doc: Doc | undefined, evt: Event): void => {
  select(evt, -1, $focusStore.focus, 'vertical')
}
const MoveDown = (doc: Doc | undefined, evt: Event): void => {
  select(evt, 1, $focusStore.focus, 'vertical')
}
const MoveLeft = (doc: Doc | undefined, evt: Event): void => {
  select(evt, -1, $focusStore.focus, 'horizontal')
}
const MoveRight = (doc: Doc | undefined, evt: Event): void => {
  select(evt, 1, $focusStore.focus, 'horizontal')
}

function ShowActions (doc: Doc | Doc[] | undefined, evt: Event): void {
  if (get(restrictionStore).disableActions) return
  evt.preventDefault()

  showPopup(view.component.ActionsPopup, { viewContext: $contextStore.getLastContext() }, 'top')
}

function ShowPreview (doc: Doc | Doc[] | undefined, evt: Event): void {
  previewDocument.update((old) => {
    const d = Array.isArray(doc) ? doc[0] : doc
    if (old?._id === d?._id) {
      return undefined
    }
    return d
  })
  evt.preventDefault()
}

async function Open (
  doc: Doc,
  evt: Event,
  props:
    | {
        component?: AnyComponent
      }
    | undefined
): Promise<void> {
  evt.preventDefault()
  const d = Array.isArray(doc) ? doc[0] : doc
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const panelComponent = hierarchy.classHierarchyMixin(d._class, view.mixin.ObjectPanel)
  const component = props?.component ?? panelComponent?.component ?? view.component.EditDoc
  const loc = await getObjectLinkFragment(hierarchy, d, {}, component)
  navigate(loc)
}

async function OpenInNewTab (
  doc: Doc,
  evt: Event,
  props:
    | {
        component?: AnyComponent
      }
    | undefined
): Promise<void> {
  evt.preventDefault()
  const d = Array.isArray(doc) ? doc[0] : doc
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const panelComponent = hierarchy.classHierarchyMixin(d._class, view.mixin.ObjectPanel)
  const component = props?.component ?? panelComponent?.component ?? view.component.EditDoc
  const loc = await getObjectLinkFragment(hierarchy, d, {}, component)
  if (hasResource(workbenchPlugin.function.OpenInNewTab) === true) {
    const res = await getResource(workbenchPlugin.function.OpenInNewTab)
    await res(loc)
  } else {
    const url = locationToUrl(loc)
    window.open(url, '_blank')
  }
}

/**
 * Quick action for show panel
 * Require props:
 * - component - view.component.EditDoc or another component
 * - element - position
 * - right - some right component
 */
function ShowPanel (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    component?: AnyComponent
    element: PopupPosAlignment
    rightSection?: AnyComponent
  }
): void {
  const d = Array.isArray(doc) ? doc[0] : doc
  evt.preventDefault()
  showPanel(
    props.component ?? view.component.EditDoc,
    d._id,
    Hierarchy.mixinOrClass(d),
    props.element ?? 'content',
    props.rightSection
  )
}

/**
 * Quick action for show popup
 * Props:
 * - _id - object id will be placed into
 * - _class - object _class will be placed into
 * - value - object itself will be placed into
 * - values - all docs will be placed into
 * - props - some basic props, will be merged with key, _class, value, values
 */
async function ShowPopup (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    component: AnyComponent
    element?: PopupPosAlignment | Resource<(e?: Event) => PopupAlignment | undefined>
    _id?: string
    _class?: string
    _space?: string
    value?: string
    values?: string
    props?: Record<string, any>
    fillProps?: Record<string, string>
  }
): Promise<void> {
  const docs = Array.isArray(doc) ? doc : doc !== undefined ? [doc] : []
  const element = await getPopupAlignment(props.element, evt)
  evt.preventDefault()
  const cprops = {
    ...(props?.props ?? {})
  }
  for (const [docKey, propKey] of Object.entries(props.fillProps ?? {})) {
    for (const dv of docs) {
      const dvv = (dv as any)[docKey]
      if (dvv !== undefined) {
        ;(cprops as any)[propKey] = dvv
      }
    }
    if (docKey === '_object') {
      ;(cprops as any)[propKey] = docs[0]
    } else if (docKey === '_objects') {
      ;(cprops as any)[propKey] = docs.length === 1 ? docs[0] : docs
    }
  }

  showPopup(props.component, cprops, element)
}

/**
 * Quick action for show popup
 * Props:
 * - attribute - to show editor for specific attribute
 * - props - some basic props, will be merged with key, _class, value, values
 */
async function ShowEditor (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    element?: PopupPosAlignment | Resource<(e?: Event) => PopupAlignment | undefined>
    attribute: string
    props?: Record<string, any>
  }
): Promise<void> {
  const docs = Array.isArray(doc) ? doc : doc !== undefined ? [doc] : []
  evt.preventDefault()
  let cprops = {
    ...(props?.props ?? {})
  }
  if (docs.length === 1) {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const doc: Doc = docs[0]
    const attribute = hierarchy.getAttribute(doc._class, props.attribute)

    const typeClass = hierarchy.getClass(attribute.type._class)
    const attributeEditorMixin = hierarchy.as(typeClass, view.mixin.AttributeEditor)

    if (attributeEditorMixin?.popup === undefined) {
      throw new Error(`failed to find editor popup for ${typeClass._id}`)
    }

    const editor: AnySvelteComponent = await getResource(attributeEditorMixin.popup)

    cprops = {
      ...cprops,
      ...{
        value: (doc as any)[props.attribute]
      }
    }

    if (editor !== undefined) {
      const identifier = await getObjectId(doc, hierarchy)
      showPopup(
        editor,
        cprops,
        {
          getBoundingClientRect: () => new DOMRect((evt as MouseEvent).clientX, (evt as MouseEvent).clientY)
        },
        (result) => {
          if (result != null) {
            const analyticsProps = {
              objectId: identifier
            }
            void updateAttribute(
              client,
              doc,
              doc._class,
              { key: props.attribute, attr: attribute },
              result,
              false,
              analyticsProps
            )
          }
        }
      )
    }
  }
}

function UpdateDocument (doc: Doc | Doc[], evt: Event, props: Record<string, any>): void {
  async function update (): Promise<void> {
    if (props?.key !== undefined && props?.value !== undefined) {
      if (Array.isArray(doc)) {
        for (const d of doc) {
          await getClient().update(d, { [props.key]: props.value })
        }
      } else {
        await getClient().update(doc, { [props.key]: props.value })
      }
    }
  }
  if (props?.ask === true) {
    showPopup(MessageBox, {
      label: props.label ?? view.string.LabelYes,
      message: props.message ?? view.string.LabelYes,
      action: async () => {
        await update()
      }
    })
  } else {
    void update()
  }
}

function ValueSelector (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    actionPopup: AnyComponent

    attribute: string

    // Class object finder
    _class?: Ref<Class<Doc>>
    query?: DocumentQuery<Doc>
    // Will copy values from selection document to query
    // If set of docs passed, will do $in for values.
    fillQuery?: Record<string, string>

    // A list of fields with matched values to perform action.
    docMatches?: string[]
    searchField?: string

    // Or list of values to select from
    values?: Array<{ icon?: Asset, label: IntlString, id: number | string }>

    placeholder?: IntlString
  }
): void {
  showPopup(view.component.ValueSelector, { ...props, value: doc, width: 'large' }, 'top')
}

function AttributeSelector (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    actionPopup: AnyComponent

    attribute: string

    values?: Array<{ icon?: Asset, label: IntlString, id: number | string }>

    isAction?: boolean

    valueKey?: string
  }
): void {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docArray = Array.isArray(doc) ? doc : [doc]
  const attribute = hierarchy.getAttribute(docArray[0]._class, props.attribute)
  showPopup(
    props.actionPopup,
    { ...props, [props.valueKey ?? 'value']: docArray, width: 'large' },
    'top',
    async (result) => {
      if (result != null) {
        for (const docEl of docArray) {
          const identifier = await getObjectId(docEl, hierarchy)
          const analyticsProps = {
            objectId: identifier
          }
          void updateAttribute(
            client,
            docEl,
            docEl._class,
            { key: props.attribute, attr: attribute },
            result,
            false,
            analyticsProps
          )
        }
      }
    }
  )
}

async function getPopupAlignment (
  element?: PopupPosAlignment | Resource<(e?: Event) => PopupAlignment | undefined>,
  evt?: Event
): Promise<PopupAlignment | undefined> {
  if (element === undefined) {
    return undefined
  }
  if (isPopupPosAlignment(element)) {
    return element
  }
  try {
    const alignmentGetter: (e?: Event) => PopupAlignment | undefined = await getResource(element)
    return alignmentGetter(evt)
  } catch (e) {
    return element as PopupAlignment
  }
}

async function CopyDocumentMarkdown (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    contentClass: Ref<Class<Doc>>
    contentField: string
  }
): Promise<void> {
  const docs = Array.isArray(doc) ? doc : doc !== undefined ? [doc] : []
  if (docs.length !== 1) {
    return
  }
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const contentClass = hierarchy.getClass(props.contentClass)
  if (contentClass == null) {
    return
  }
  const contentField = hierarchy.findAttribute(props.contentClass, props.contentField)
  if (contentField == null) {
    return
  }
  if (contentField.type._class === core.class.TypeCollaborativeDoc) {
    // Pass a Promise so ClipboardItem is created synchronously within the user gesture (Safari)
    const content = getMarkup(
      makeDocCollabId(docs[0], props.contentField),
      (docs[0] as any)[props.contentField] as Ref<Blob>
    ).then((c) => (c !== null ? markupToMarkdown(markupToJSON(c)) : ''))
    await copyText(content, 'text/plain')
  }
}

/**
 * CopyAsMarkdownTable action implementation.
 * The converter dialog resolves the viewlet context and the table source in one place.
 * @public
 */
async function CopyAsMarkdownTableAction (doc: Doc | Doc[], evt: Event, props: CopyAsMarkdownTableProps): Promise<void> {
  const copyFn = await getResource(converter.actionImpl.CopyAsMarkdownTable)
  await copyFn(doc, evt, props)
}

/**
 * @public
 */
export const actionImpl = {
  CopyTextToClipboard,
  Delete,
  Archive,
  UnArchive,
  Join,
  Leave,
  Move,
  MoveUp,
  MoveDown,
  MoveLeft,
  MoveRight,
  SelectItem,
  SelectItemNone,
  SelectItemAll,
  ShowActions,
  ShowPreview,
  Open,
  OpenInNewTab,
  UpdateDocument,
  ShowPanel,
  ShowPopup,
  ShowEditor,
  ValueSelector,
  AttributeSelector,
  CopyDocumentMarkdown,
  CopyAsMarkdownTable: CopyAsMarkdownTableAction
}
