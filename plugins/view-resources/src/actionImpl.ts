import { Class, Doc, DocumentQuery, Hierarchy, Ref, Space, TxResult } from '@hcengineering/core'
import { Asset, IntlString, Resource, getResource } from '@hcengineering/platform'
import { MessageBox, getClient, updateAttribute, ContextStore, contextStore } from '@hcengineering/presentation'
import {
  AnyComponent,
  AnySvelteComponent,
  PopupAlignment,
  PopupPosAlignment,
  closeTooltip,
  isPopupPosAlignment,
  navigate,
  showPanel,
  showPopup
} from '@hcengineering/ui'
import MoveView from './components/Move.svelte'
import view from './plugin'
import { FocusSelection, SelectDirection, focusStore, previewDocument, selectionStore } from './selection'
import { deleteObjects, getObjectLinkFragment } from './utils'
import contact from '@hcengineering/contact'

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
  const getText = await getResource(props.textProvider)
  try {
    // Safari specific behavior
    // see https://bugs.webkit.org/show_bug.cgi?id=222262
    const text = Array.isArray(doc)
      ? (await Promise.all(doc.map(async (d) => await getText(d, props.props)))).join(',')
      : await getText(doc, props.props)
    const clipboardItem = new ClipboardItem({
      'text/plain': text
    })
    await navigator.clipboard.write([clipboardItem])
  } catch {
    // Fallback to default clipboard API implementation
    const text = Array.isArray(doc)
      ? (await Promise.all(doc.map(async (d) => await getText(d, props.props)))).join(',')
      : await getText(doc, props.props)
    await navigator.clipboard.writeText(text)
  }
}

function Delete (object: Doc | Doc[]): void {
  showPopup(
    contact.component.DeleteConfirmationPopup,
    {
      object,
      deleteAction: async () => {
        const objs = Array.isArray(object) ? object : [object]
        await deleteObjects(getClient(), objs).catch((err) => console.error(err))
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
  if (focus !== undefined) {
    selectionStore.update((selection) => {
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
  selectionStore.set([])
  previewDocument.set(undefined)
  evt.preventDefault()
}
function SelectItemAll (doc: Doc | undefined, evt: Event): void {
  const docs = $focusStore.provider?.docs() ?? []
  selectionStore.set(docs)
  previewDocument.set(undefined)
  evt.preventDefault()
}

const MoveUp = (doc: Doc | undefined, evt: Event): void => select(evt, -1, $focusStore.focus, 'vertical')
const MoveDown = (doc: Doc | undefined, evt: Event): void => select(evt, 1, $focusStore.focus, 'vertical')
const MoveLeft = (doc: Doc | undefined, evt: Event): void => select(evt, -1, $focusStore.focus, 'horizontal')
const MoveRight = (doc: Doc | undefined, evt: Event): void => select(evt, 1, $focusStore.focus, 'horizontal')

function ShowActions (doc: Doc | Doc[] | undefined, evt: Event): void {
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

    if (attributeEditorMixin === undefined || attributeEditorMixin.popup === undefined) {
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
      console.log('EVT', evt)
      showPopup(
        editor,
        cprops,
        {
          getBoundingClientRect: () => new DOMRect((evt as MouseEvent).clientX, (evt as MouseEvent).clientY)
        },
        (result) => {
          if (result != null) {
            void updateAttribute(client, doc, doc._class, { key: props.attribute, attr: attribute }, result)
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
    showPopup(
      MessageBox,
      {
        label: props.label ?? view.string.LabelYes,
        message: props.message ?? view.string.LabelYes
      },
      undefined,
      (result: boolean) => {
        if (result) {
          void update()
        }
      }
    )
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
  }
): void {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docArray = Array.isArray(doc) ? doc : [doc]
  const attribute = hierarchy.getAttribute(docArray[0]._class, props.attribute)
  showPopup(props.actionPopup, { ...props, value: docArray, width: 'large' }, 'top', (result) => {
    console.log(result)
    if (result != null) {
      for (const docEl of docArray) {
        void updateAttribute(client, docEl, docEl._class, { key: props.attribute, attr: attribute }, result)
      }
    }
  })
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

/**
 * @public
 */
export const actionImpl = {
  CopyTextToClipboard,
  Delete,
  Archive,
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
  UpdateDocument,
  ShowPanel,
  ShowPopup,
  ShowEditor,
  ValueSelector,
  AttributeSelector
}
