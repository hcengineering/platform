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
import { type Editor, type Range } from '@tiptap/core'
import { Fragment, type Node, type ResolvedPos, Slice } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey, Selection, type Transaction } from '@tiptap/pm/state'
import { AddMarkStep } from '@tiptap/pm/transform'
import { buildReferenceUrl, parseReferenceUrl } from '../reference'
import {
  CursorSource,
  getToolbarControlPluginState,
  getToolbarCursor,
  registerToolbarProvider,
  type ResolveCursorProps,
  setLoadingState,
  type ToolbarCursor,
  updateCursor
} from '../toolbar/toolbar'
import EmbedToolbarHead from './EmbedToolbarHead.svelte'

export interface EmbedNodeOptions {
  providers: EmbedNodeProvider[]
}

export interface EmbedNodeViewHandle {
  name: string
  destroy?: () => void
}

export interface EmbedNodeProvider {
  buildView: (src: string) => Promise<EmbedNodeView | undefined>
  autoEmbedUrl?: (src: string) => boolean
}

export type EmbedNodeView = (editor: Editor, root: HTMLDivElement) => EmbedNodeViewHandle | undefined
export type EmbedNodeProviderConstructor<T> = (options: T) => EmbedNodeProvider

export type EmbedCursor = ToolbarCursor<EmbedCursorProps>

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

      setLoadingState(editor.view, root, true)
      root.setAttribute('block-editor-blur', 'true')

      let handle: EmbedNodeViewHandle | undefined

      void providerPromise
        .then((view) => {
          view = view ?? StubEmbedNodeView
          handle = view(editor, root)
          if (handle !== undefined) {
            root.classList.add(`embed-${handle.name}`)
          }
        })
        .finally(() => {
          setLoadingState(editor.view, root, false)
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
  providers: EmbedNodeProvider[]
}

export interface EmbedCursorProps {
  src: string
}

export interface EmbedControlTxMeta {
  cursor?: EmbedCursorProps | null
}

const embedControlPluginKey = new PluginKey('embedControlPlugin')

export function EmbedControlPlugin (editor: Editor, options: EmbedNodeOptions): Plugin {
  return new Plugin<EmbedControlState>({
    key: embedControlPluginKey,

    state: {
      init () {
        return {
          providers: options.providers
        }
      },
      apply (tr, prev, oldState, newState) {
        return prev
      }
    },

    view (view) {
      registerToolbarProvider<EmbedCursorProps>(view, { name: 'embed', resolveCursor, priority: 50 })
      return {}
    },

    appendTransaction: (transactions, oldState, newState) => {
      if (transactions.length < 2) {
        return null
      }
      const rest = transactions.slice(1)
      for (const tx of rest) {
        if (tx.steps.length !== 1) continue
        const step = tx.steps[0]
        if (!(step instanceof AddMarkStep)) continue
        if (step.mark.type.name !== 'link') continue

        const src = step.mark.attrs.href as string | undefined
        if (src === undefined) continue

        const $pos = newState.doc.resolve(step.from)
        const index = $pos.index()
        const parent = $pos.parent
        if ($pos.depth !== 1 || parent.type.name !== 'paragraph') continue

        let canConvert = true
        for (let i = 0; i < parent.childCount; i++) {
          const child = parent.child(i)
          if (i === index) continue
          if (child.type.name !== 'text') {
            canConvert = false
            break
          }
          if (child.textContent.trim() !== '') {
            canConvert = false
            break
          }
        }

        if (canConvert) {
          const embedTx = tryAutoEmbedUrl(newState, options.providers, step, src)
          if (embedTx !== undefined) {
            return embedTx
          }
        }
      }
    }
  })
}

function tryAutoEmbedUrl (
  state: EditorState,
  providers: EmbedNodeProvider[],
  { from, to }: Range,
  src: string
): Transaction | undefined {
  const provider = providers.find((p) => p.autoEmbedUrl !== undefined && p.autoEmbedUrl(src))
  if (provider === undefined) return
  const embedNode = state.schema.nodes.embed.create({ src })
  const fragment = Fragment.from(embedNode)

  return replacePreviewContent({ from, to }, fragment, state, CursorSource.Selection)
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
    const view = await provider.buildView(url)
    if (view !== undefined) return view
  }
}

function resolveCursorChildNode ($pos?: ResolvedPos): { node: Node | null, index: number, offset: number } | null {
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

function resolveCursor (props: ResolveCursorProps): EmbedCursor | null {
  const $pos = props.editorState.doc.resolve(props.range.from)

  const child = resolveCursorChildNode($pos)
  const node = child?.node ?? null

  if (child === null || node === null) return null

  const from = $pos.start() + child.offset
  const to = from + node.nodeSize

  const src = getNodeUrl(node)
  if (src === undefined) return null

  return {
    source: props.source,
    tag: 'embed',
    range: { from, to },
    props: { src },
    nodes: [{ node, pos: $pos.posAtIndex(child.index) }],
    requireAnchoring: node.type.name === 'reference',
    viewOptions: {
      head: {
        component: EmbedToolbarHead
      }
    }
  }
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

export async function shouldShowConvertToLinkPreviewAction (editor: Editor, context: ActionContext): Promise<boolean> {
  if (!editor.isEditable) {
    return false
  }

  const cursor = getEmbedControlCursor(editor.state)
  if (cursor?.nodes[0] === undefined) return false

  const canEmbed = await shouldShowConvertToEmbedPreviewAction(editor, context)

  if (!canEmbed && isLink(cursor.nodes[0].node, true)) {
    return false
  }

  return true
}

export async function shouldShowConvertToEmbedPreviewAction (editor: Editor, context: ActionContext): Promise<boolean> {
  if (!editor.isEditable) {
    return false
  }

  const cursor = getEmbedControlCursor(editor.state)
  if (cursor?.nodes[0] === undefined) return false

  const url = getNodeUrl(cursor.nodes[0].node)
  const view = await matchUrl(getEmbedControlState(editor)?.providers ?? [], url)
  return view !== undefined
}

export async function convertToLinkPreviewAction (editor: Editor, event: MouseEvent): Promise<void> {
  const cursor = getEmbedControlCursor(editor.state)
  if (cursor?.nodes[0] === undefined) return

  const node = cursor.nodes[0].node

  if (node.type.name !== 'embed') return

  const ref = parseReferenceUrl(cursor.props.src)
  const schema = editor.schema

  let fragment: Fragment

  if (ref !== undefined) {
    const refNode = schema.nodes.reference.create(ref)
    fragment = Fragment.from(refNode)
  } else {
    const textNode = schema.text(cursor.props.src)
    const linkMark = schema.marks.link.create({ href: cursor.props.src })
    const textWithLink = textNode.mark([linkMark])
    fragment = Fragment.from(textWithLink)
  }

  const from = cursor.range.from
  const to = cursor.range.to

  const tr = replacePreviewContent({ from, to }, fragment, editor.state, CursorSource.Selection)
  editor.view.dispatch(tr)
}

export async function convertToEmbedPreviewAction (editor: Editor, event: MouseEvent): Promise<void> {
  const cursor = getEmbedControlCursor(editor.state)
  if (cursor?.nodes[0] === undefined) return

  const node = cursor.nodes[0].node

  if (!isLink(node)) return

  const src = getNodeUrl(node)
  if (src === undefined) return

  const embedNode = editor.schema.nodes.embed.create({ src })
  const fragment = Fragment.from(embedNode)

  const from = cursor.range.from
  const to = cursor.range.to

  const tr = replacePreviewContent({ from, to }, fragment, editor.state, CursorSource.Selection)

  editor.view.focus()
  editor.view.dispatch(tr)
}

export function shouldShowLink (cursor: EmbedCursor | null): boolean {
  if (cursor === null) return false

  if (cursor.nodes[0].node.type.name === 'text' && cursor.props.src !== cursor.nodes[0].node.textContent) {
    return true
  }

  if (cursor.nodes[0].node.type.name === 'embed') {
    return true
  }

  return false
}

export async function shouldShowCopyPreviewLinkAction (editor: Editor, context: ActionContext): Promise<boolean> {
  const cursor = getEmbedControlCursor(editor.state)

  if (!shouldShowLink(cursor)) {
    return false
  }

  if (parseReferenceUrl(cursor?.props.src ?? '') !== undefined) {
    return false
  }

  return true
}

export async function copyPreviewLinkAction (editor: Editor, event: MouseEvent): Promise<void> {
  const cursor = getEmbedControlCursor(editor.state)

  const src = cursor?.props.src
  if (typeof src !== 'string') return

  await copyTextToClipboard(src)
}

export async function convertToLinkPreviewActionIsActive (editor: Editor): Promise<boolean> {
  const cursor = getEmbedControlCursor(editor.state)
  return cursor?.nodes[0] !== undefined && isLink(cursor.nodes[0].node)
}

export async function convertToEmbedPreviewActionIsActive (editor: Editor): Promise<boolean> {
  const cursor = getEmbedControlCursor(editor.state)
  if (cursor?.nodes[0] === undefined) return false
  return cursor.nodes[0].node.type.name === 'embed'
}

export function replacePreviewContent (
  { from, to }: Range,
  fragment: Fragment,
  editorState: EditorState,
  source: CursorSource
): Transaction {
  const tr = editorState.tr

  const toolbarState = getToolbarControlPluginState(editorState)
  if (toolbarState === undefined) {
    return tr
  }

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

  const pos = tr.doc.resolve(isOnlyBlockContent ? start : end)

  editorState = editorState.apply(tr)
  const cursor = resolveCursor({
    editorState,
    state: toolbarState,
    range: { from: pos.pos, to: pos.pos },
    source
  })

  updateCursor(tr, cursor)

  return tr
}

const StubEmbedNodeView: EmbedNodeView = (editor: Editor, root: HTMLElement) => {
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

function getEmbedControlCursor (editorState: EditorState): EmbedCursor | null {
  const cursor = getToolbarCursor(editorState)
  if (cursor?.tag !== 'embed') return null
  return cursor as EmbedCursor
}

export function getEmbedControlState (editor: Editor): EmbedControlState | undefined {
  return embedControlPluginKey.getState(editor.view.state) as EmbedControlState | undefined
}
