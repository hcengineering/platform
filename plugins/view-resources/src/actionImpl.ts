import { Doc, Hierarchy } from '@anticrm/core'
import { getClient, MessageBox } from '@anticrm/presentation'
import { AnyComponent, closeTooltip, PopupPositionElement, showPanel, showPopup } from '@anticrm/ui'
import { ViewContext } from '@anticrm/view'
import MoveView from './components/Move.svelte'
import { contextStore } from './context'
import view from './plugin'
import { FocusSelection, focusStore, previewDocument, SelectDirection, selectionStore } from './selection'
import { deleteObject } from './utils'

function Delete (object: Doc): void {
  showPopup(
    MessageBox,
    {
      label: view.string.DeleteObject,
      message: view.string.DeleteObjectConfirm,
      params: { count: Array.isArray(object) ? object.length : 1 }
    },
    undefined,
    (result?: boolean) => {
      if (result === true) {
        const objs = Array.isArray(object) ? object : [object]
        for (const o of objs) {
          deleteObject(getClient(), o).catch((err) => console.error(err))
        }
      }
    }
  )
}

async function Move (object: Doc): Promise<void> {
  showPopup(MoveView, { object })
}

let $focusStore: FocusSelection
focusStore.subscribe((it) => {
  $focusStore = it
})

let $contextStore: ViewContext[]
contextStore.subscribe((it) => {
  $contextStore = it
})

export function select (evt: Event | undefined, offset: 1 | -1 | 0, of?: Doc, direction?: SelectDirection): void {
  closeTooltip()
  if ($focusStore.provider?.select !== undefined) {
    $focusStore.provider?.select(offset, of, direction)
    evt?.preventDefault()
    previewDocument.update((old) => {
      if (old !== undefined) {
        return $focusStore.focus
      }
    })
  }
}

function SelectItem (doc: Doc | undefined, evt: Event): void {
  if (doc !== undefined) {
    selectionStore.update((selection) => {
      const ind = selection.findIndex((it) => it._id === doc._id)
      if (ind === -1) {
        selection.push(doc)
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

const MoveUp = (doc: Doc | undefined, evt: Event): void => select(evt, -1, doc, 'vertical')
const MoveDown = (doc: Doc | undefined, evt: Event): void => select(evt, 1, doc, 'vertical')
const MoveLeft = (doc: Doc | undefined, evt: Event): void => select(evt, -1, doc, 'horizontal')
const MoveRight = (doc: Doc | undefined, evt: Event): void => select(evt, 1, doc, 'horizontal')

function ShowActions (doc: Doc | Doc[] | undefined, evt: Event): void {
  evt.preventDefault()

  showPopup(view.component.ActionsPopup, { viewContext: $contextStore[$contextStore.length - 1] }, 'top')
}

function ShowPreview (doc: Doc | undefined, evt: Event): void {
  previewDocument.update((old) => {
    if (old?._id === doc?._id) {
      return undefined
    }
    return doc
  })
  evt.preventDefault()
}

function Open (doc: Doc, evt: Event): void {
  evt.preventDefault()
  showPanel(view.component.EditDoc, doc._id, Hierarchy.mixinOrClass(doc), 'content')
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
    element: PopupPositionElement
    rightSection?: AnyComponent
  }
): void {
  if (Array.isArray(doc)) {
    console.error('Wrong show Panel parameters')
    return
  }
  evt.preventDefault()
  showPanel(
    props.component ?? view.component.EditDoc,
    doc._id,
    Hierarchy.mixinOrClass(doc),
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
function ShowPopup (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    component: AnyComponent
    element: PopupPositionElement
    _id?: string
    _class?: string
    _space?: string
    value?: string
    values?: string
    props?: Record<string, any>
  }
): void {
  const docs = Array.isArray(doc) ? doc : [doc]
  evt.preventDefault()
  let cprops = {
    ...(props?.props ?? {})
  }
  if (docs.length > 0) {
    cprops = {
      ...cprops,
      ...{
        [props._id ?? '_id']: docs[0]._id,
        [props._class ?? '_class']: docs[0]._class,
        [props._space ?? 'space']: docs[0].space,
        [props.value ?? 'value']: docs[0],
        [props.values ?? 'values']: docs
      }
    }
  }

  showPopup(props.component, cprops, props.element)
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

/**
 * @public
 */
export const actionImpl = {
  Delete,
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
  ShowPopup
}
