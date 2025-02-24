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

import { type EditorState } from '@tiptap/pm/state'
import { Decoration } from '@tiptap/pm/view'

import { handleSvg } from './icons'
import { type TableNodeLocation } from '../types'

export const dropMarkerId = 'table-drop-marker'
export const colDragMarkerId = 'table-col-drag-marker'
export const rowDragMarkerId = 'table-row-drag-marker'

export const dropMarkerWidthPx = 1

export const tableDragMarkerDecoration = (state: EditorState, table: TableNodeLocation): Decoration[] => {
  const dropMarker = document.createElement('div')
  dropMarker.id = dropMarkerId
  dropMarker.classList.add('table-drop-marker')

  const colDragMarker = document.createElement('div')
  colDragMarker.id = colDragMarkerId
  colDragMarker.classList.add('table-col-drag-marker')
  colDragMarker.style.display = 'none'
  const colDragMarkerBtn = colDragMarker.appendChild(document.createElement('button'))
  colDragMarkerBtn.innerHTML = handleSvg

  const rowDragMarker = document.createElement('div')
  rowDragMarker.id = rowDragMarkerId
  rowDragMarker.classList.add('table-row-drag-marker')
  rowDragMarker.style.display = 'none'
  const rowDragMarkerBtn = rowDragMarker.appendChild(document.createElement('button'))
  rowDragMarkerBtn.innerHTML = handleSvg

  return [
    Decoration.widget(table.start, dropMarker),
    Decoration.widget(table.start, colDragMarker),
    Decoration.widget(table.start, rowDragMarker)
  ]
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
