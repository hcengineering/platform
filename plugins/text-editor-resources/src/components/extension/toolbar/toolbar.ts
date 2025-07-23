//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { notEmpty } from '@hcengineering/core'
import { type AnySvelteComponentWithProps, DebouncedCaller } from '@hcengineering/ui'
import { type Editor, Extension, type Range } from '@tiptap/core'
import { type Node } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'
import { deepEqual } from 'fast-equals'
import tippy, { type Placement, type Props as TippyProps } from 'tippy.js'
import { SvelteRenderer } from '../../node-view'
import EditorToolbar from './EditorToolbar.svelte'
import { type ActionContext } from '@hcengineering/text-editor'

export interface ToolbarCursor<T> {
  source: CursorSource
  tag: string
  range: Range
  props: T
  requireAnchoring?: boolean
  anchor?: HTMLElement
  nodes: NodeWithPos[]
  viewOptions?: ToolbarViewOptions
}

export interface ResolveCursorProps {
  editorState: EditorState
  state: ToolbarControlPluginState
  range: Range
  source: CursorSource
  anchor?: HTMLElement
}

export interface ToolbarProvider<T> {
  name: string
  resolveCursor: (props: ResolveCursorProps) => ToolbarCursor<T> | null
  priority: number
}

export type ToolbarPlacement = Placement
export type ToolbarStyle = 'regular' | 'contrast'

export interface ToolbarViewOptions {
  placement?: Placement
  fallbackPlacements?: Placement[]
  style?: ToolbarStyle
  head?: AnySvelteComponentWithProps
  offset?: [number, number]
  floating?: boolean
}

const defaultToolbarViewOptions: ToolbarViewOptions = {
  placement: 'top-end',
  fallbackPlacements: ['top-start', 'bottom-end', 'bottom-start'],
  style: 'contrast',
  offset: [0, 12]
}

export interface ToolbarOptions {
  providers: Array<ToolbarProvider<any>>
  boundary?: HTMLElement
  popupContainer?: HTMLElement
  context: ActionContext
}

export enum CursorSource {
  Selection = 'selection',
  Mouse = 'mouse'
}

export interface SelectionCursorContext {
  type: CursorSource.Selection
  range: Range
}

export const ToolbarExtension = Extension.create<ToolbarOptions>({
  addProseMirrorPlugins () {
    return [ToolbarControlPlugin(this.editor, this.options)]
  }
})

export interface ToolbarControlTxMeta {
  cursor?: ToolbarCursor<any> | null
  site?: string
  providers?: Array<ToolbarProvider<any>>
}

export const toolbarPluginKey = new PluginKey('dynamicToolbar')

export interface ToolbarControlPluginState {
  providers: Array<ToolbarProvider<any>>
  cursor: ToolbarCursor<any> | null
  debounce: {
    updateCursor: DebouncedCaller
  }
}

export interface NodeWithPos {
  node: Node
  pos: number
}

export function ToolbarControlPlugin (editor: Editor, options: ToolbarOptions): Plugin {
  return new Plugin<ToolbarControlPluginState>({
    key: toolbarPluginKey,

    state: {
      init: () => {
        return {
          providers: [...options.providers],
          cursor: null,
          debounce: {
            updateCursor: new DebouncedCaller(250)
          }
        }
      },
      apply (tr, prevPluginState, oldState, newState) {
        const prev = { ...prevPluginState }

        const meta = tr.getMeta(toolbarPluginKey) as ToolbarControlTxMeta

        if (meta?.providers !== undefined) {
          prev.providers = [...prev.providers, ...meta.providers]
          prev.providers.sort((a, b) => b.priority - a.priority)
        }

        if (meta?.cursor !== undefined) {
          return { ...prev, cursor: meta.cursor }
        }

        if (tr.docChanged) {
          const prevCursor = prev.cursor
          const source = prevCursor?.source ?? CursorSource.Selection

          const range: Range = {
            from:
              source === CursorSource.Selection
                ? newState.selection.from
                : tr.mapping.map(prevCursor?.range.from ?? 0, -1),
            to:
              source === CursorSource.Selection ? newState.selection.to : tr.mapping.map(prevCursor?.range.to ?? 0, -1)
          }

          const newCursor = resolveCursor({
            editorState: newState,
            state: prev,
            range,
            source
          })

          updateCursor(tr, newCursor, prev, 'docChanged')
          return { ...prev, cursor: newCursor }
        }

        if (!oldState.selection.eq(newState.selection)) {
          const range = { from: newState.selection.from, to: newState.selection.to }
          const cursor = resolveCursor({
            editorState: newState,
            state: prev,
            range,
            source: CursorSource.Selection
          })

          if (cursor !== null) {
            updateCursor(tr, cursor, prev, 'selectionChanged-newCursor')
            return { ...prev, cursor }
          } else if (prev.cursor !== null) {
            updateCursor(tr, null, prev, 'selectionChanged-cursorReset')
            return { ...prev, cursor: null }
          }
        }

        return prev
      }
    },

    view (view) {
      let currCursor: ToolbarCursor<any> | null = null
      let prevCursor: ToolbarCursor<any> | null = null

      let isCursorRangeLoading = false
      let rect: DOMRect = getReferenceRectFromRange(view, 0, 0)

      const getTippyProps = (viewOptions?: ToolbarViewOptions): Partial<TippyProps> => ({
        delay: [0, 0],
        duration: [0, 0],
        getReferenceClientRect,
        inertia: true,
        content: container,
        maxWidth: 800,
        interactive: true,
        trigger: 'manual',
        placement: viewOptions?.placement,
        hideOnClick: 'toggle',
        appendTo: viewOptions?.floating !== true ? options.popupContainer ?? document.body : document.body,
        zIndex: 10001,
        offset: viewOptions?.offset,
        popperOptions: {
          modifiers: [
            {
              name: 'preventOverflow',
              options: {
                boundary: options.boundary ?? document.body,
                padding: 16,
                altAxis: viewOptions?.floating === true,
                tether: viewOptions?.floating !== true
              }
            },
            {
              name: 'flip',
              options: {
                fallbackPlacements: viewOptions?.fallbackPlacements
              }
            }
          ]
        }
      })

      const getReferenceClientRect = (): DOMRect => {
        if (currCursor === null) {
          return rect
        }

        const from = currCursor.range.from
        const to = currCursor.range.to

        isCursorRangeLoading = scanForLoadingState(view, { from, to })
        if (currCursor?.requireAnchoring === true) {
          currCursor.anchor = scanForAnchor(view, currCursor.range)
        }

        if (isCursorRangeLoading) {
          return rect
        }

        const nodes = currCursor.nodes ?? []
        const newRect =
          currCursor.anchor !== undefined
            ? currCursor.anchor.getBoundingClientRect()
            : getReferenceRectFromNodes(view, nodes) ?? getReferenceRectFromRange(view, from, to)

        rect = newRect
        return newRect
      }

      const mousemove = (event: MouseEvent): void => {
        handleMouseMove(view, event)
      }

      let isMouseDown = false
      const mousedown = (event: MouseEvent): void => {
        if (event.target instanceof HTMLElement) {
          const [blockToolbarMouseLock] = scanMarker(event.target, 'blockToolbarMouseLock')
          if (blockToolbarMouseLock) {
            return
          }
        }
        prevCursor = currCursor
        isMouseDown = true
        updateToolbar()
      }

      const mouseup = (event: MouseEvent): void => {
        isMouseDown = false
        updateToolbar()
      }

      const container = document.createElement('div')
      container.dataset.blockCursorUpdate = 'true'

      const renderer = new SvelteRenderer(EditorToolbar, {
        element: container,
        props: { editor, cursor: currCursor, context: options.context }
      })
      renderer.updateProps({ editor, cursor: currCursor })

      const updateToolbar = (): void => {
        getReferenceClientRect()
        killPendingMouseEvents()

        const isSwapping = prevCursor !== null && currCursor !== null && prevCursor.tag !== currCursor.tag
        const shouldRespectMouseDown = !eqCursors(prevCursor, currCursor)
        const shouldShow = !isCursorRangeLoading && currCursor !== null && !(shouldRespectMouseDown && isMouseDown)

        if (isSwapping) {
          tippyNode.hide()
        }

        const viewOptions = currCursor?.viewOptions
        tippyNode.setProps(getTippyProps(viewOptions))

        if (!tippyNode.state.isShown && shouldShow) {
          requestAnimationFrame(() => {
            tippyNode.show()
          })
        }
        if (tippyNode.state.isShown && !shouldShow) {
          tippyNode.hide()
        }

        renderer.updateProps({ editor, cursor: currCursor })
      }

      const killPendingMouseEvents = (): void => {
        const pluginState = getToolbarControlPluginState(editor.state)
        pluginState?.debounce.updateCursor.call(() => {
          /* reset pending mouse move event handling */
        })
      }

      const tippyNode = tippy(view.dom, getTippyProps())

      editor.on('transaction', ({ editor, transaction: tr }) => {
        const meta = tr.getMeta(toolbarPluginKey) as ToolbarControlTxMeta
        const loadingState = tr.getMeta('loadingState') as boolean | undefined
        if (meta?.cursor !== undefined && !eqCursors(currCursor, meta.cursor)) {
          prevCursor = currCursor
          currCursor = meta.cursor !== null ? { ...meta.cursor } : null
        }
        if (meta?.cursor !== undefined || loadingState !== undefined) {
          if (loadingState === true) {
            updateToolbar()
          } else {
            requestAnimationFrame(() => {
              updateToolbar()
            })
          }
        } else if (tr.docChanged) {
          updateToolbar()
        }
      })

      editor.on('blur', (e) => {
        const target = e.event.relatedTarget
        const [ignore] = scanMarker(target as HTMLElement | null, 'blockEditorBlur')

        if (!ignore) {
          view.dispatch(updateCursor(view.state.tr, null, getToolbarControlPluginState(view.state), 'blur'))
        }
      })

      registerToolbarProvider(view, GeneralToolbarProvider)

      window.addEventListener('mousemove', mousemove)
      window.addEventListener('mousedown', mousedown)
      window.addEventListener('mouseup', mouseup)

      return {
        destroy () {
          tippyNode.destroy()
          window.removeEventListener('mousemove', mousemove)
          window.removeEventListener('mousedown', mousedown)
          window.removeEventListener('mouseup', mouseup)
        }
      }
    },

    appendTransaction: (transactions, oldState, newState) => {
      // editor.on('transaction', ...) fires for root transactions
      // but not for internal transactions appended via plugins,
      // so we need to propagate metadata to the rest of transactions.
      let meta: ToolbarControlTxMeta | undefined
      for (const tx of transactions) {
        meta = (tx.getMeta(toolbarPluginKey) as ToolbarControlTxMeta) ?? meta
      }
      if (meta !== undefined) {
        for (const tx of transactions) {
          setToolbarMeta(tx, meta)
        }
      }

      return null
    }
  })
}

export function registerToolbarProvider<T> (view: EditorView, provider: ToolbarProvider<T>): void {
  const state = toolbarPluginKey.getState(view.state) as ToolbarControlPluginState | undefined
  if (state === undefined) return

  const meta: ToolbarControlTxMeta = { providers: [provider] }
  view.dispatch(view.state.tr.setMeta(toolbarPluginKey, meta))
}

function handleMouseMove (view: EditorView, event: MouseEvent): void {
  const state = toolbarPluginKey.getState(view.state) as ToolbarControlPluginState | undefined
  if (state === undefined) return

  state.debounce.updateCursor.call(() => {
    updateCursorFromMouseEvent(view, event)
  })
}

export function getToolbarControlPluginState (editorState: EditorState): ToolbarControlPluginState | undefined {
  return toolbarPluginKey.getState(editorState) as ToolbarControlPluginState | undefined
}

export function getToolbarCursor<T> (editorState: EditorState): ToolbarCursor<T> | null {
  const state = getToolbarControlPluginState(editorState)
  return state?.cursor ?? null
}

function resolveCursor (props: ResolveCursorProps): ToolbarCursor<any> | null {
  const providers = props.state.providers

  const priority = [CursorSource.Mouse, CursorSource.Selection]
  let cursors = providers.map((provider) => provider.resolveCursor(props)).filter(notEmpty)

  cursors = priority.map((p) => cursors.filter((c) => c.source === p)).flat()

  const cursor = cursors[0] ?? null
  if (cursor !== null) {
    cursor.viewOptions = { ...defaultToolbarViewOptions, ...cursor.viewOptions }
  }

  return cursor
}

export function updateCursor (
  tr: Transaction,
  cursor: ToolbarCursor<any> | null,
  state?: ToolbarControlPluginState,
  site?: string
): Transaction {
  state?.debounce?.updateCursor.call(() => {
    /* reset pending mouse move event handling */
  })
  if (eqCursors(state?.cursor ?? null, cursor)) {
    return tr
  }
  return setToolbarMeta(tr, { cursor, site })
}

export function setToolbarMeta (tr: Transaction, meta: ToolbarControlTxMeta): Transaction {
  return tr.setMeta(toolbarPluginKey, meta).setMeta('contextCursorUpdate', true)
}

function updateCursorFromMouseEvent (view: EditorView, event: MouseEvent): void {
  const state = toolbarPluginKey.getState(view.state) as ToolbarControlPluginState | undefined
  if (state === undefined) return

  const prevCursor = state?.cursor ?? null

  const target = event?.target as HTMLElement | null
  const [blockCursorUpdate] = scanMarker(target, 'blockCursorUpdate')
  const [disableCursor] = scanMarker(target, 'disableCursor')

  const anchorElement = target !== null ? findAnchorElement(target, true) : undefined

  if (blockCursorUpdate) return

  const coords = { left: event.clientX, top: event.clientY }
  const range = resolveCursorPositionFromCoords(view, coords)

  if (range === undefined && prevCursor !== null) {
    const isLoading = scanForLoadingState(view, prevCursor.range)
    if (isLoading) return
  }

  let newCursor =
    disableCursor || range === undefined
      ? null
      : resolveCursor({
        editorState: view.state,
        state,
        range,
        source: CursorSource.Mouse,
        anchor: anchorElement
      })

  if (newCursor?.requireAnchoring === true && anchorElement === undefined) {
    newCursor = null
  }

  if (newCursor === null) {
    if (prevCursor?.source === CursorSource.Selection) {
      return
    }
    const selection = view.state.selection
    newCursor = resolveCursor({
      editorState: view.state,
      state,
      range: { from: selection.from, to: selection.to },
      source: CursorSource.Selection
    })
  }

  if (eqCursors(prevCursor, newCursor)) {
    return
  }

  view.dispatch(updateCursor(view.state.tr, newCursor, state, 'mousemove-newCursor'))
}

function scanForLoadingState (view: EditorView, range: Range): boolean {
  let isLoading = false
  view.state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    const element = view.nodeDOM(pos)
    if (!(element instanceof HTMLElement)) return

    if (element.dataset.loading === 'true') {
      isLoading = true
      return false
    }
  })
  return isLoading
}

function scanForAnchor (view: EditorView, range: Range): HTMLElement | undefined {
  let anchor: HTMLElement | undefined
  view.state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    const element = view.nodeDOM(pos)
    if (!(element instanceof HTMLElement)) return

    anchor = findAnchorElement(element)
    if (anchor !== undefined) {
      return false
    }
  })
  return anchor
}

function findAnchorElement (target: HTMLElement, requireHover: boolean = false): HTMLElement | undefined {
  const [, tagetSelfAnchor] = scanMarker(target, 'toolbarAnchor')
  if (tagetSelfAnchor !== null) {
    return tagetSelfAnchor
  }
  const [, anchoringRoot] = scanMarker(target, 'toolbarPreventAnchoring')
  if (anchoringRoot === null) {
    return
  }
  const matches: HTMLElement[] = []
  anchoringRoot?.querySelectorAll('[data-toolbar-anchor="true"]').forEach((el) => {
    if (requireHover && !el.matches(':hover')) {
      return
    }
    matches.push(el as HTMLElement)
  })
  return matches[0]
}

function resolveCursorPositionFromCoords (view: EditorView, coords: { left: number, top: number }): Range | undefined {
  const posInfo = view.posAtCoords(coords)
  if (posInfo === null) return

  const posInside = posInfo.inside
  const posBase = posInfo.pos

  const $posInside = posInfo.inside >= 0 ? view.state.doc.resolve(posInside) : null
  const $posBase = view.state.doc.resolve(posBase)

  const $pos = $posInside === null ? $posBase : $posInside.nodeAfter?.type.name === 'paragraph' ? $posBase : $posInside

  return { from: $pos.pos, to: $pos.pos }
}

function scanMarker (target: HTMLElement | null, field: string): [boolean, HTMLElement | null] {
  while (target != null) {
    if (target.dataset[field] === 'true') {
      return [true, target]
    }
    target = target.parentElement
  }
  return [false, null]
}

function getReferenceRectFromRange (view: EditorView, from: number, to: number): DOMRect {
  const docSize = view.state.doc.content.size
  const clampedFrom = minmax(from, 0, docSize)
  const clampedTo = minmax(to, 0, docSize)

  const startCoords = view.coordsAtPos(clampedFrom)
  const endCoords = view.coordsAtPos(clampedTo, -1)

  const bounds = {
    top: Math.min(startCoords.top, endCoords.top),
    bottom: Math.max(startCoords.bottom, endCoords.bottom),
    left: Math.min(startCoords.left, endCoords.left),
    right: Math.max(startCoords.right, endCoords.right)
  }

  const rectData = {
    ...bounds,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
    x: bounds.left,
    y: bounds.top
  }

  return {
    ...rectData,
    toJSON: () => rectData
  }
}

function getReferenceRectFromNodes (view: EditorView, nodes: NodeWithPos[]): DOMRect | undefined {
  if (nodes.length < 1) {
    return
  }

  const bounds = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }

  let foundReference = false
  for (const n of nodes) {
    const dom = view.nodeDOM(n.pos) as HTMLElement | null
    if (dom === null || !(dom instanceof HTMLElement)) continue

    const rect = dom.getBoundingClientRect()
    bounds.top = bounds.top === 0 ? rect.top : Math.min(bounds.top, rect.top)
    bounds.left = bounds.left === 0 ? rect.left : Math.min(bounds.left, rect.left)
    bounds.right = bounds.right === 0 ? rect.right : Math.max(bounds.right, rect.right)
    bounds.bottom = bounds.bottom === 0 ? rect.bottom : Math.max(bounds.bottom, rect.bottom)
    foundReference = true
  }

  if (!foundReference) {
    return
  }

  const rectData = {
    ...bounds,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
    x: bounds.left,
    y: bounds.top
  }

  return {
    ...rectData,
    toJSON: () => rectData
  }
}

function minmax (value = 0, min = 0, max = 0): number {
  return Math.min(Math.max(value, min), max)
}

export function setLoadingState (view: EditorView, element: HTMLElement, loading: boolean): void {
  if (loading) {
    element.setAttribute('data-loading', 'true')
  } else {
    element.removeAttribute('data-loading')
    requestAnimationFrame(() => {
      view.dispatch(view.state.tr.setMeta('loadingState', loading))
    })
  }
}

export const GeneralToolbarProvider: ToolbarProvider<any> = {
  name: 'text-general',
  priority: 100,
  resolveCursor: ({ editorState, state, range, source, anchor }) => {
    if (source !== CursorSource.Selection) {
      return null
    }

    const selection = editorState.selection
    if (selection.empty || !(selection instanceof TextSelection)) {
      return null
    }

    const cursor: ToolbarCursor<any> = {
      source,
      tag: 'text',
      range: { from: selection.from, to: selection.to },
      props: {},
      nodes: [],
      viewOptions: {
        placement: 'top',
        fallbackPlacements: ['bottom'],
        style: 'regular',
        floating: true
      }
    }

    return cursor
  }
}

export function eqCursors (c1: ToolbarCursor<any> | null, c2: ToolbarCursor<any> | null): boolean {
  return deepEqual(c1, c2)
}
