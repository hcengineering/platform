import { Doc, Hierarchy } from '@anticrm/core'
import { getClient, MessageBox } from '@anticrm/presentation'
import { showPanel, showPopup } from '@anticrm/ui'
import MoveView from './components/Move.svelte'
import view from './plugin'
import { FocusSelection, focusStore, SelectDirection, selectionStore, previewDocument } from './selection'
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
          deleteObject(getClient(), o).catch(err => console.error(err))
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

export function select (evt: Event|undefined, offset: 1 | -1 | 0, of?: Doc, direction?: SelectDirection): void {
  if ($focusStore.provider?.select !== undefined) {
    $focusStore.provider?.select(offset, of, direction)
    evt?.preventDefault()
    previewDocument.update(old => {
      if (old !== undefined) {
        return $focusStore.focus
      }
    })
  }
}

function SelectItem (doc: Doc | undefined, evt: Event): void {
  if (doc !== undefined) {
    selectionStore.update((selection) => {
      const ind = selection.findIndex(it => it._id === doc._id)
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
}

function ShowPreview (doc: Doc | undefined, evt: Event): void {
  previewDocument.update(old => {
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
  Open
}
