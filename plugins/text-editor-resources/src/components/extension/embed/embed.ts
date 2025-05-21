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

import { getMetadata, translate } from '@hcengineering/platform'
import { type ActionContext, copyTextToClipboard } from '@hcengineering/presentation'
import { EmbedNode as BaseEmbedNode, type ReferenceNodeProps } from '@hcengineering/text'
import textEditor from '@hcengineering/text-editor'
import { DebouncedCaller } from '@hcengineering/ui'
import { type Editor, type Range } from '@tiptap/core'
import { Fragment, type Node, type ResolvedPos, Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey, Selection, type Transaction } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'
import tippy from 'tippy.js'
import { SvelteRenderer } from '../../node-view'
import { buildReferenceUrl, parseReferenceUrl } from '../reference'
import EmbedToolbar from './EmbedToolbar.svelte'

export interface EmbedNodeOptions {
  providers: EmbedNodeProvider[]
  boundary?: HTMLElement
  popupContainer?: HTMLElement
}

export interface EmbedNodeViewHandle {
  name: string
  destroy?: () => void
}

export type EmbedNodeView = (root: HTMLDivElement) => EmbedNodeViewHandle | undefined
export type EmbedNodeProvider = (src: string) => Promise<EmbedNodeView | undefined>
export type EmbedNodeProviderConstructor<T> = (options: T) => EmbedNodeProvider

export const EmbedNode = BaseEmbedNode.extend<EmbedNodeOptions>({
  addOptions () {
    return {
      providers: []
    }
  },

  addAttributes () {
    return {
      src: {
        default: null
      }
    }
  },

  parseHTML () {
    return [
      {
        priority: 60,
        tag: `div[data-type="${this.name}"]`,
        getAttrs (node) {
          const src = node.dataset.embedSrc?.trim()
          if (src === undefined) return false
          return { src }
        }
      }
    ]
  },

  renderHTML ({ HTMLAttributes, node }) {
    return [
      'div',
      {
        'data-type': this.name,
        'data-embed-src': node.attrs.src,
        class: 'embed-node'
      },
      [
        'a',
        {
          href: node.attrs.src
        },
        node.attrs.src
      ]
    ]
  },

  addNodeView () {
    return ({ node, HTMLAttributes, editor }) => {
      const providerPromise = matchUrl(this.options.providers, node.attrs.src)

      const root = document.createElement('div')
      root.setAttribute('data-type', this.name)
      root.setAttribute('data-embed-src', node.attrs.src)
      root.classList.add('embed-node')

      let handle: EmbedNodeViewHandle | undefined

      void providerPromise.then((view) => {
        view = view ?? StubEmbedNodeView
        handle = view(root)
        if (handle !== undefined) {
          root.classList.add(`embed-${handle.name}`)
        }
      })

      return {
        dom: root,
        destroy: () => {
          handle?.destroy?.()
        }
      }
    }
  },

  addProseMirrorPlugins () {
    return [EmbedControlPlugin(this.editor, this.options)]
  }
})

export interface EmbedControlState {
  cursor: EmbedControlCursor | null
  providers: EmbedNodeProvider[]
  debounce: {
    updateCursor: DebouncedCaller
  }
}

export interface EmbedControlCursor {
  from: number
  to: number
  node: Node
  src: string
  selected?: boolean
}

export interface EmbedControlTxMeta {
  cursor?: EmbedControlCursor | null
}

const embedControlPluginKey = new PluginKey('embedControlPlugin')

export function EmbedControlPlugin (editor: Editor, options: EmbedNodeOptions): Plugin {
  return new Plugin<EmbedControlState>({
    key: embedControlPluginKey,
    state: {
      init () {
        return {
          cursor: null,
          providers: options.providers,
          debounce: {
            updateCursor: new DebouncedCaller(250)
          }
        }
      },
      apply (tr, prev, oldState, newState) {
        const meta = tr.getMeta(embedControlPluginKey) as EmbedControlTxMeta
        if (meta?.cursor !== undefined) {
          return { ...prev, cursor: meta.cursor }
        }

        if (tr.docChanged && prev.cursor !== null) {
          const from = tr.mapping.map(prev.cursor.from, -1)
          const cursor = resolveCursor(prev, newState.doc.resolve(from))

          updateCursor(tr, cursor)
          return { ...prev, cursor }
        }

        if (!oldState.selection.eq(newState.selection)) {
          const $pos = newState.doc.resolve(newState.selection.from)
          const cursor = resolveCursor(prev, $pos)

          if (cursor !== null) {
            cursor.selected = true
            updateCursor(tr, cursor)
            return { ...prev, cursor }
          } else if (prev.cursor !== null && prev.cursor.selected === true) {
            updateCursor(tr, null)
            return { ...prev, cursor: null }
          }
        }

        return prev
      }
    },
    view (view) {
      interface State {
        cursor: EmbedControlCursor | null
      }
      let state: State = {
        cursor: null
      }

      const getReferenceClientRect = (): DOMRect => {
        return getReferenceRect(view, state.cursor?.from ?? 0, state.cursor?.to ?? 0)
      }

      const listener = (event: MouseEvent): void => {
        handleMouseMove(view, event)
      }
      window.addEventListener('mousemove', listener)

      const container = document.createElement('div')
      container.dataset.blockCursorUpdate = 'true'

      const renderer = new SvelteRenderer(EmbedToolbar, {
        element: container,
        props: { editor, cursor: state.cursor }
      })
      renderer.updateProps({ editor, cursor: state.cursor })

      const updateState = (newState: State): void => {
        if (newState.cursor?.selected === true) {
          const pluginState = getEmbedControlState(editor)
          pluginState?.debounce.updateCursor.call(() => {
            /* reset pending mouse move event handling */
          })
        }
        if (!tippynode.state.isShown && newState.cursor !== null) {
          tippynode.show()
          tippynode.setProps({})
        }
        if (tippynode.state.isShown && newState.cursor === null) {
          tippynode.hide()
        } else {
          tippynode.setProps({})
        }
        state = newState
        renderer.updateProps({ editor, cursor: state.cursor })
      }

      const tippynode = (this.tippynode = tippy(view.dom, {
        delay: [0, 0],
        duration: [0, 0],
        getReferenceClientRect,
        inertia: true,
        content: container,
        maxWidth: 640,
        interactive: true,
        trigger: 'manual',
        placement: 'top-start',
        hideOnClick: 'toggle',
        onDestroy: () => {},
        appendTo: () => options.popupContainer ?? document.body,
        zIndex: 10000
      }))

      editor.on('transaction', ({ transaction }) => {
        const meta = transaction.getMeta(embedControlPluginKey) as EmbedControlTxMeta
        if (meta?.cursor !== undefined) {
          updateState({ cursor: meta.cursor })
        }
      })

      return {
        destroy () {
          tippynode.destroy()
          window.removeEventListener('mousemove', listener)
        }
      }
    }
  })
}

function updateCursorFromMouseEvent (view: EditorView, event: MouseEvent): void {
  const state = embedControlPluginKey.getState(view.state) as EmbedControlState
  const prevCursor = state?.cursor ?? null

  let target = event?.target as HTMLElement | null
  let blockCursorUpdate = false
  let disableCursor = false

  while (target != null) {
    if (target.dataset.blockCursorUpdate === 'true') {
      blockCursorUpdate = true
    }
    if (target.dataset.disableCursor === 'true') {
      disableCursor = true
    }
    target = target.parentElement
  }

  if (blockCursorUpdate) return

  const coords = { left: event.clientX, top: event.clientY }
  const newCursor = disableCursor ? null : resolveCursor(state, resolveCursorPositionFromCoords(view, coords))

  if (eqCursors(newCursor, prevCursor)) {
    return
  }

  view.dispatch(updateCursor(view.state.tr, newCursor))
}

function eqCursors (c1: EmbedControlCursor | null, c2: EmbedControlCursor | null): boolean {
  const eqRange = c2?.from === c1?.from && c2?.to === c1?.to
  const eqNode = c2?.node === c1?.node || (c2?.node !== undefined && c1?.node !== undefined && c2.node.eq(c1.node))
  return eqRange && eqNode
}

function handleMouseMove (view: EditorView, event: MouseEvent): void {
  const state = embedControlPluginKey.getState(view.state) as EmbedControlState | undefined
  if (state === undefined) return

  state.debounce.updateCursor.call(() => {
    updateCursorFromMouseEvent(view, event)
  })
}

function getNodeUrl (node?: Node | null): string | undefined {
  if (node == null || node === undefined) return

  switch (node.type.name) {
    case 'text': {
      const link = node.marks.find((m) => m.type.name === 'link')
      return link?.attrs.href ?? undefined
    }
    case 'reference': {
      return buildReferenceUrl(node.attrs as ReferenceNodeProps)
    }
    case 'embed': {
      return node.attrs.src
    }
  }
}

async function matchUrl (providers: EmbedControlState['providers'], url?: string): Promise<EmbedNodeView | undefined> {
  if (url === undefined) return

  for (const provider of providers) {
    const view = await provider(url)
    if (view !== undefined) return view
  }
}

function resolveCursorChildNode (
  state: EmbedControlState,
  $pos?: ResolvedPos
): { node: Node | null, index: number, offset: number } | null {
  if ($pos === undefined) return null

  const parent = $pos.parent
  const offset = $pos.pos - $pos.start()

  const childAfter = parent.childAfter(offset)
  let childBefore = parent.childBefore(offset)

  // Special case for reference nodes, since autocomplete adds a space after the node
  if (childBefore.node?.type.name === 'text' && childBefore.node.textContent === ' ' && childBefore.offset > 0) {
    const lookupChild = parent.childBefore(childBefore.offset)
    if (lookupChild.node?.type.name === 'reference') {
      childBefore = lookupChild
    }
  }

  const nodeAfter = getNodeUrl(childAfter.node) !== undefined ? childAfter : null
  const nodeBefore = getNodeUrl(childBefore.node) !== undefined ? childBefore : null

  return nodeAfter ?? nodeBefore
}

function resolveCursor (state: EmbedControlState, $pos?: ResolvedPos): EmbedControlCursor | null {
  if ($pos === undefined) return null

  const child = resolveCursorChildNode(state, $pos)
  const node = child?.node ?? null

  if (child === null || node === null) return null

  const from = $pos.start() + child.offset
  const to = from + node.nodeSize

  const src = getNodeUrl(node)
  if (src === undefined) return null

  return {
    from,
    to,
    node,
    src
  }
}

function resolveCursorPositionFromCoords (
  view: EditorView,
  coords: { left: number, top: number }
): ResolvedPos | undefined {
  const posInfo = view.posAtCoords(coords)
  if (posInfo === null) return

  const posInside = posInfo.inside
  const posBase = posInfo.pos

  const $posInside = posInfo.inside >= 0 ? view.state.doc.resolve(posInside) : null
  const $posBase = view.state.doc.resolve(posBase)

  const $pos = $posInside === null ? $posBase : $posInside.nodeAfter?.type.name === 'paragraph' ? $posBase : $posInside

  return $pos
}

function isLink (node: Node, strict: boolean = false): boolean {
  if (node.type.name === 'text') {
    const mark = node.marks.find((m) => m.type.name === 'link')
    if (mark === undefined) return false
    return strict ? mark.attrs.href === node.textContent : true
  }
  if (node.type.name === 'reference') {
    return true
  }
  return false
}

function updateCursor (tr: Transaction, cursor: EmbedControlCursor | null): Transaction {
  return tr.setMeta(embedControlPluginKey, { cursor }).setMeta('contextCursorUpdate', true)
}

function getEmbedControlState (editor: Editor): EmbedControlState | undefined {
  return embedControlPluginKey.getState(editor.view.state) as EmbedControlState | undefined
}

function getEmbedControlCursor (editor: Editor): EmbedControlCursor | null {
  const state = getEmbedControlState(editor)
  return state?.cursor ?? null
}

export async function shouldShowConvertToLinkPreviewAction (editor: Editor, context: ActionContext): Promise<boolean> {
  if (!editor.isEditable) {
    return false
  }

  if (context.tag !== 'embed-toolbar') {
    return false
  }

  const cursor = getEmbedControlCursor(editor)
  if (cursor?.node === undefined) return false

  const canEmbed = await shouldShowConvertToEmbedPreviewAction(editor, context)

  if (!canEmbed && isLink(cursor.node, true)) {
    return false
  }

  return true
}

export async function shouldShowConvertToEmbedPreviewAction (editor: Editor, context: ActionContext): Promise<boolean> {
  if (!editor.isEditable) {
    return false
  }

  if (context.tag !== 'embed-toolbar') {
    return false
  }

  const cursor = getEmbedControlCursor(editor)
  if (cursor?.node === undefined) return false

  const url = getNodeUrl(cursor.node)
  const view = await matchUrl(getEmbedControlState(editor)?.providers ?? [], url)
  return view !== undefined
}

export async function convertToLinkPreviewAction (editor: Editor, event: MouseEvent): Promise<void> {
  const cursor = getEmbedControlCursor(editor)
  if (cursor?.node === undefined) return

  const node = cursor.node

  if (node.type.name !== 'embed') return

  const ref = parseReferenceUrl(cursor.src)
  const schema = editor.schema

  let fragment: Fragment

  if (ref !== undefined) {
    const refNode = schema.nodes.reference.create(ref)
    fragment = Fragment.from(refNode)
  } else {
    const textNode = schema.text(cursor.src)
    const linkMark = schema.marks.link.create({ href: cursor.src })
    const textWithLink = textNode.mark([linkMark])
    fragment = Fragment.from(textWithLink)
  }

  const from = cursor.from
  const to = cursor.to

  const tr = replacePreviewContent({ from, to }, fragment, editor.state.tr, editor)
  editor.view.dispatch(tr)
}

export async function convertToEmbedPreviewAction (editor: Editor, event: MouseEvent): Promise<void> {
  const cursor = getEmbedControlCursor(editor)
  if (cursor?.node === undefined) return

  const node = cursor.node

  if (!isLink(node)) return

  const src = getNodeUrl(node)
  if (src === undefined) return

  const embedNode = editor.schema.nodes.embed.create({ src })
  const fragment = Fragment.from(embedNode)

  const from = cursor.from
  const to = cursor.to

  const tr = editor.state.tr
  replacePreviewContent({ from, to }, fragment, tr, editor)

  editor.view.focus()
  editor.view.dispatch(tr)
}

export function shouldShowLink (cursor: EmbedControlCursor | null): boolean {
  if (cursor === null) return false

  if (cursor.node.type.name === 'text' && cursor.src !== cursor.node.textContent) {
    return true
  }

  if (cursor.node.type.name === 'embed') {
    return true
  }

  return false
}

export async function shouldShowCopyPreviewLinkAction (editor: Editor, context: ActionContext): Promise<boolean> {
  const cursor = getEmbedControlCursor(editor)

  if (!shouldShowLink(cursor)) {
    return false
  }

  if (parseReferenceUrl(cursor?.src ?? '') !== undefined) {
    return false
  }

  return true
}

export async function copyPreviewLinkAction (editor: Editor, event: MouseEvent): Promise<void> {
  const cursor = getEmbedControlCursor(editor)

  const src = cursor?.src
  if (typeof src !== 'string') return

  await copyTextToClipboard(src)
}

export async function convertToLinkPreviewActionIsActive (editor: Editor): Promise<boolean> {
  const cursor = getEmbedControlCursor(editor)
  return cursor?.node !== undefined && isLink(cursor.node)
}

export async function convertToEmbedPreviewActionIsActive (editor: Editor): Promise<boolean> {
  const cursor = getEmbedControlCursor(editor)
  if (cursor?.node === undefined) return false
  return cursor.node.type.name === 'embed'
}

export function replacePreviewContent (
  { from, to }: Range,
  fragment: Fragment,
  tr: Transaction,
  editor: Editor
): Transaction {
  const state = getEmbedControlState(editor)
  if (state === undefined) return tr

  const slice = new Slice(fragment, 0, 0)
  tr.replaceRange(from, to, slice)

  const start = tr.mapping.map(from, -1)
  const end = start + slice.size

  let isOnlyBlockContent = true

  fragment.forEach((node) => {
    node.check()
    isOnlyBlockContent = isOnlyBlockContent ? node.isBlock : false
  })

  const selection = isOnlyBlockContent
    ? Selection.near(tr.doc.resolve(start), 1)
    : Selection.near(tr.doc.resolve(end + 1), 1)

  tr.setSelection(selection)

  const cursor = resolveCursor(state, tr.doc.resolve(isOnlyBlockContent ? start : end))
  updateCursor(tr, cursor)

  return tr
}

const StubEmbedNodeView: EmbedNodeView = (root: HTMLElement) => {
  const hint = document.createElement('p')
  const hintIcon = hint.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
  const hintSpan = hint.appendChild(document.createElement('span'))

  const embed = async (): Promise<void> => {
    const hintText = await translate(textEditor.string.UnableToLoadEmbeddedContent, {})
    hintSpan.textContent = hintText

    const iconUrl = getMetadata(textEditor.icon.EmbedPreview) ?? ''
    if (iconUrl !== '') {
      root.appendChild(document.createTextNode(' '))
      hintIcon.setAttribute('class', 'svg-small')
      hintIcon.setAttribute('fill', 'currentColor')
      const use = hintIcon.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'use'))
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', iconUrl)
    }
  }

  void embed()
  root.appendChild(hint)

  return {
    name: 'stub'
  }
}

function getReferenceRect (view: EditorView, from: number, to: number): DOMRect {
  const minPos = 0
  const maxPos = view.state.doc.content.size
  const resolvedFrom = minmax(from, minPos, maxPos)
  const resolvedEnd = minmax(to, minPos, maxPos)
  const start = view.coordsAtPos(resolvedFrom)
  const end = view.coordsAtPos(resolvedEnd, -1)
  const top = Math.min(start.top, end.top)
  const bottom = Math.max(start.bottom, end.bottom)
  const left = Math.min(start.left, end.left)
  const right = Math.max(start.right, end.right)
  const width = right - left
  const height = bottom - top
  const x = left
  const y = top
  const data = {
    top,
    bottom,
    left,
    right,
    width,
    height,
    x,
    y
  }

  return {
    ...data,
    toJSON: () => data
  }
}

function minmax (value = 0, min = 0, max = 0): number {
  return Math.min(Math.max(value, min), max)
}
