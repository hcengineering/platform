//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { type Editor } from '@tiptap/core'
import { findTable, haveTableRelatedChanges } from '../utils'
import { handleSvg } from './icons'

export const dropMarkerId = 'table-drop-marker'
export const colDragMarkerId = 'table-col-drag-marker'
export const rowDragMarkerId = 'table-row-drag-marker'

export const dropMarkerWidthPx = 1

interface TableDragMarkerDecorationPluginState {
  decorations?: DecorationSet
}

export const TableDragMarkerDecorationPlugin = (editor: Editor): Plugin<TableDragMarkerDecorationPluginState> => {
  const key = new PluginKey('table-cell-drag-marker-decoration-plugin')
  return new Plugin<TableDragMarkerDecorationPluginState>({
    key,
    state: {
      init: () => {
        return {}
      },
      apply (tr, prev, oldState, newState) {
        const table = findTable(newState.selection)
        if (!haveTableRelatedChanges(editor, table, oldState, newState, tr)) {
          return table !== undefined ? prev : {}
        }

        if (prev.decorations !== undefined) {
          const mapped = prev.decorations.map(tr.mapping, tr.doc)
          const existing = mapped.find(table.start, table.start + 1)
          if (existing.length > 0) {
            return { decorations: mapped }
          }
        }

        const decorations = DecorationSet.create(newState.doc, [
          Decoration.widget(table.start, () => createMarkerContainer())
        ])

        return { decorations }
      }
    },
    props: {
      decorations (state) {
        return key.getState(state).decorations
      }
    }
  })
}

function createMarkerContainer (): HTMLElement {
  const el = document.createElement('div')
  el.classList.add('table-drag-marker-container')
  el.appendChild(createDropMarker())
  el.appendChild(createColDragMarker())
  el.appendChild(createRowDragMarker())
  return el
}

function createDropMarker (): DropMarkerHTMLElement {
  const el = document.createElement('div')
  el.id = dropMarkerId
  el.classList.add('table-drop-marker')
  return el
}

function createColDragMarker (): DragMarkerHTMLElement {
  const el = document.createElement('div')
  el.id = colDragMarkerId
  el.classList.add('table-col-drag-marker')
  el.style.display = 'none'

  const btn = el.appendChild(document.createElement('button'))
  btn.innerHTML = handleSvg

  return el
}

function createRowDragMarker (): DragMarkerHTMLElement {
  const el = document.createElement('div')
  el.id = rowDragMarkerId
  el.classList.add('table-row-drag-marker')
  el.style.display = 'none'

  const btn = el.appendChild(document.createElement('button'))
  btn.innerHTML = handleSvg

  return el
}

export type DropMarkerHTMLElement = HTMLElement

export function getDropMarker (): DropMarkerHTMLElement | null {
  return document.getElementById(dropMarkerId) as DropMarkerHTMLElement
}

export function hideDropMarker (element: DropMarkerHTMLElement): void {
  element.style.display = 'none'
}

export function updateColDropMarker (element: DropMarkerHTMLElement, left: number, width: number): void {
  element.style.height = '100%'
  element.style.width = `${width}px`
  element.style.top = '0'
  element.style.left = `${left}px`
  element.style.display = 'block'
}

export function updateRowDropMarker (element: DropMarkerHTMLElement, top: number, height: number): void {
  element.style.width = '100%'
  element.style.height = `${height}px`
  element.style.left = '0'
  element.style.top = `${top}px`
  element.style.display = 'block'
}

export type DragMarkerHTMLElement = HTMLElement

export function getColDragMarker (): DragMarkerHTMLElement | null {
  return document.getElementById(colDragMarkerId) as DragMarkerHTMLElement
}

export function getRowDragMarker (): DragMarkerHTMLElement | null {
  return document.getElementById(rowDragMarkerId) as DragMarkerHTMLElement
}

export function getDragMarker (element: DragMarkerHTMLElement): void {
  element.style.display = 'none'
}

export function hideDragMarker (element: DragMarkerHTMLElement): void {
  element.style.display = 'none'
}

export function updateColDragMarker (element: DragMarkerHTMLElement, left: number, width: number): void {
  element.style.width = `${width}px`
  element.style.left = `${left}px`
  element.style.display = 'block'
}

export function updateRowDragMarker (element: DragMarkerHTMLElement, top: number, height: number): void {
  element.style.height = `${height}px`
  element.style.top = `${top}px`
  element.style.display = 'block'
}
