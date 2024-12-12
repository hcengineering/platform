//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { codeBlockOptions } from '@hcengineering/text'
import { type CodeBlockLowlightOptions, CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { createLowlight } from 'lowlight'
import { isChangeEditable } from './editable'
import type { MermaidConfig } from 'mermaid'
import { getCurrentTheme, isThemeDark, themeStore } from '@hcengineering/theme'

import { createRelativePositionFromTypeIndex, type RelativePosition, type Doc as YDoc } from 'yjs'
import { mergeAttributes } from '@tiptap/core'

export interface MermaidOptions extends CodeBlockLowlightOptions {
  ydoc?: YDoc
  ydocContentField?: string
}

export const mermaidOptions: CodeBlockLowlightOptions = {
  ...codeBlockOptions,
  lowlight: createLowlight({ mermaid: mermaidHLJS }),
  defaultLanguage: 'mermaid'
}

const mermaidMetaTxField = 'mermaid-meta-tx'

interface TxMetaContainer {
  nodePatch?: NodePatchSpec
  renderResult?: MermaidRenderResult
  updateDecorations?: boolean
}

interface NodeDecorationState {
  type: 'mermaid'

  diagramBuilder: (view: EditorView) => MermaidRenderResult | null

  folded: boolean
  textContent: string
  selected: boolean
}

function getTxMeta (tx?: Transaction): TxMetaContainer | undefined {
  return tx?.getMeta('mermaid-meta-tx')
}
function setTxMeta (tx: Transaction, meta: TxMetaContainer): Transaction {
  return tx.setMeta(mermaidMetaTxField, meta).setMeta('addToHistory', false)
}

interface NodePatchSpec {
  pos: number
  folded: boolean
  selected: boolean
}

export const MermaidExtension = CodeBlockLowlight.extend<MermaidOptions>({
  name: 'mermaid',
  group: 'block',

  draggable: true,
  selectable: true,

  parseHTML () {
    return [
      {
        tag: 'div.mermaid-diagram',
        preserveWhitespace: 'full'
      }
    ]
  },

  addAttributes () {
    return {
      language: {
        default: 'mermaid'
      }
    }
  },

  renderHTML ({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'mermaid-diagram'
      }),
      [
        'code',
        {
          class: node.attrs.language !== undefined ? this.options.languageClassPrefix + node.attrs.language : null
        },
        0
      ]
    ]
  },

  addCommands () {
    return {}
  },

  addInputRules () {
    return []
  },

  addProseMirrorPlugins () {
    return [...(this.parent?.() ?? []), MermaidDecorator(this.options)]
  },

  addNodeView () {
    return ({ getPos, editor, node, decorations }) => {
      const containerNode = document.createElement('pre')
      containerNode.className = 'proseMermaidDiagram'

      const headerNode = containerNode.appendChild(document.createElement('header'))
      headerNode.contentEditable = 'false'

      const contentNode = containerNode.appendChild(document.createElement('code'))
      contentNode.translate = false
      contentNode.spellcheck = false

      const previewNode = containerNode.appendChild(document.createElement('div'))
      previewNode.className = 'mermaidPreviewContainer'
      previewNode.contentEditable = 'false'

      const languageLabelNode = headerNode.appendChild(document.createElement('button'))

      const languageLabelSpanNode = languageLabelNode.appendChild(document.createElement('span'))
      languageLabelSpanNode.className = 'overflow-label label disabled mr-2'
      languageLabelSpanNode.textContent = 'mermaid'

      const toggleButtonNode = headerNode.appendChild(document.createElement('button'))

      const toggleButtonIconNode = toggleButtonNode.appendChild(document.createElement('div'))
      toggleButtonIconNode.className = 'btn-icon'

      let nodeState: NodeDecorationState = {
        type: 'mermaid',
        folded: false,
        selected: false,
        diagramBuilder: () => null,
        textContent: node.textContent
      }

      const toggleFoldState = (newState: boolean, event?: MouseEvent): void => {
        event?.preventDefault()
        if (typeof getPos !== 'function') return

        const pos = getPos()
        const node = editor.view.state.doc.nodeAt(pos)

        if (node?.type.name !== MermaidExtension.name) return

        const nodePatch: NodePatchSpec = {
          pos,
          folded: !nodeState.folded,
          selected: nodeState.selected
        }

        const tr = setTxMeta(editor.view.state.tr, { nodePatch })

        if (nodePatch.folded) {
          tr.setSelection(NodeSelection.create(editor.view.state.doc, pos))
        } else {
          const selection = TextSelection.findFrom(editor.view.state.doc.resolve(pos + node.nodeSize), -1)
          if (selection !== null) tr.setSelection(selection)
        }

        editor.view.dispatch(tr)
      }

      toggleButtonNode.onmousedown = (e) => {
        toggleFoldState(!nodeState.folded, e)
      }
      previewNode.ondblclick = (e) => {
        toggleFoldState(!nodeState.folded, e)
      }

      previewNode.onclick = (e) => {
        if (typeof getPos !== 'function') return
        const pos = getPos()
        const selection = NodeSelection.create(editor.view.state.doc, pos)
        editor.view.dispatch(editor.view.state.tr.setSelection(selection))
        e.preventDefault()
      }

      const syncState = (decorations: readonly Decoration[]): void => {
        nodeState = decorations.find((d) => d.spec.type === MermaidExtension.name)?.spec ?? nodeState

        const isEmpty = nodeState.textContent.trim().length === 0
        const diagram = nodeState.diagramBuilder?.(editor.view) ?? null
        const error = diagram?.error ?? null
        const diagramNode = error === null ? diagram?.domFragments[0] ?? null : null

        const allowFold = !isEmpty && error === null

        if (nodeState.folded) {
          containerNode.classList.add('folded')
          contentNode.style.display = 'none'
          languageLabelNode.style.display = 'none'
          toggleButtonIconNode.innerHTML = editIconSvg
          toggleButtonNode.className = 'antiButton primary medium sh-no-shape bs-none only-icon'
        } else {
          containerNode.classList.remove('folded')
          contentNode.style.display = ''
          languageLabelNode.style.display = ''
          toggleButtonIconNode.innerHTML = foldIconSvg
          toggleButtonNode.className = 'antiButton link-bordered medium sh-no-shape bs-none only-icon'
        }

        toggleButtonNode.style.display = allowFold ? '' : 'none'
        previewNode.style.display = diagramNode !== null ? '' : 'none'

        if (nodeState.selected) {
          containerNode.classList.add('selected')
        } else {
          containerNode.classList.remove('selected')
        }

        if (!isEmpty && error !== null) {
          languageLabelNode.className =
            'antiButton negative medium sh-no-shape bs-none gap-medium iconR pointer-events-none'
        } else {
          languageLabelNode.className =
            'antiButton link-bordered medium sh-no-shape bs-none gap-medium iconR pointer-events-none'
        }

        while (previewNode.firstChild !== null && previewNode.firstChild !== diagramNode) {
          previewNode.removeChild(previewNode.firstChild)
        }

        if (diagramNode?.parentElement !== previewNode) {
          diagramNode?.parentElement?.removeChild(diagramNode)
        }

        if (diagramNode !== null && previewNode.firstChild !== diagramNode) {
          previewNode.appendChild(diagramNode)
        }

        if (!allowFold && nodeState.folded) {
          toggleFoldState(false)
        }
      }

      const toggleSelection = (newState: boolean): void => {
        if (nodeState.selected === newState) return
        if (typeof getPos !== 'function') return
        const pos = getPos()
        const tr = setTxMeta(editor.view.state.tr, {
          nodePatch: {
            pos,
            folded: nodeState.folded,
            selected: newState
          }
        })
        editor.view.dispatch(tr)
      }

      syncState(decorations)

      return {
        dom: containerNode,
        contentDOM: contentNode,

        selectNode: () => {
          toggleSelection(true)
        },
        deselectNode: () => {
          toggleSelection(false)
        },

        stopEvent: (event) => {
          if (event instanceof DragEvent && !nodeState.folded) {
            event.preventDefault()
          }
        },
        update: (node, decorations) => {
          if (node.type.name !== MermaidExtension.name) return false
          syncState(decorations)
          return true
        }
      }
    }
  }
})

interface MermaidPluginState {
  decorationSet: DecorationSet
  decorationCache: Map<number | string, NodeDecorationState>

  nodeidCache: Map<number | string, MermaidRenderResult>
  renderCache: Map<string, MermaidRenderResult>
  pendingFragments: Set<string>

  throttle: ThrottledCaller<string | number>
}

interface MermaidRenderResult {
  svg?: string
  error?: {
    name?: string
    message: string
  }
  input: string
  domFragments: HTMLElement[]
  theme: MermaidConfig['theme']
}

async function renderMermaidDiagram (code: string, theme: MermaidConfig['theme']): Promise<MermaidRenderResult> {
  // Has no practical effect now, but in case the Webpack
  // configuration gets changed to split the vendor bundle, it might come in handy
  const mermaid = (await import(/* webpackMode: "lazy-once" */ 'mermaid')).default

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'var(--font-family)',
    logLevel: 5,
    theme,
    suppressErrorRendering: true
  })

  const id = `mermaid-diagram-${Math.random().toString(36).substring(2, 9)}`

  const result: MermaidRenderResult = {
    input: code,
    domFragments: [],
    theme
  }

  try {
    const render = await mermaid.render(id, code)
    result.svg = render.svg
  } catch (e: any) {
    if (typeof e?.message === 'string') {
      result.error = {
        name: e.name,
        message: e.message
      }
    } else {
      result.error = {
        name: 'unknown',
        message: 'unknown'
      }
    }
  }

  return result
}

function buildState (
  options: MermaidOptions,
  prev: MermaidPluginState,
  doc: ProseMirrorNode,
  tr?: Transaction
): MermaidPluginState {
  const renderCache = new Map(prev.renderCache)
  const nodeidCache = new Map<string | number, MermaidRenderResult>()
  const decorationCache = new Map<string | number, NodeDecorationState>()
  const pendingFragments = new Set(prev.pendingFragments)
  const theme: MermaidConfig['theme'] = isThemeDark(getCurrentTheme()) ? 'dark' : 'default'

  const unusedRenderCache = new Set(renderCache.keys())
  const usedFragments = new Set<HTMLElement>()

  const newRenderCacheEntry = getTxMeta(tr)?.renderResult
  if (newRenderCacheEntry !== undefined) {
    renderCache.set(newRenderCacheEntry.input, newRenderCacheEntry)
  }

  const buildOrReuseFragment = (renderState: MermaidRenderResult | null): HTMLElement | null => {
    if (renderState?.svg === undefined) return null

    const reuse = renderState.domFragments.find((f) => !usedFragments.has(f))
    if (reuse !== undefined) {
      usedFragments.add(reuse)
      return reuse
    }

    const container = document.createElement('div')
    container.className = 'mermaidPreview'
    container.innerHTML = renderState.svg

    renderState.domFragments.push(container)
    usedFragments.add(container)

    return container
  }

  const buildDiagram = (
    node: ProseMirrorNode,
    nodeid: string | number,
    view: EditorView,
    theme: MermaidConfig['theme']
  ): MermaidRenderResult => {
    const textContent = node.textContent
    const nodeRenderState = renderCache.get(textContent)
    const nodeTargetRenderState = nodeRenderState ??
      prev.nodeidCache.get(nodeid) ?? { input: textContent, theme, domFragments: [] }

    unusedRenderCache.delete(textContent)

    nodeidCache.set(nodeid, nodeTargetRenderState)
    const element = buildOrReuseFragment(nodeTargetRenderState)

    if ((nodeRenderState === undefined && !pendingFragments.has(textContent)) || nodeRenderState?.theme !== theme) {
      pendingFragments.add(textContent)

      prev.throttle.call(nodeid, () => {
        renderMermaidDiagram(textContent, theme).then(
          (renderResult) => {
            view.dispatch(setTxMeta(view.state.tr, { renderResult }))
            pendingFragments.delete(textContent)
          },
          (reject) => {
            console.log(reject)
            pendingFragments.delete(textContent)
          }
        )
      })
    }

    return { ...nodeTargetRenderState, domFragments: element !== null ? [element] : [] }
  }

  const decorations: Decoration[] = []
  const lastDecorationSet = tr !== undefined ? prev.decorationSet.map(tr.mapping, tr.doc) : prev.decorationSet

  const nodeStatePatch = getTxMeta(tr)?.nodePatch

  let mIndex = 0
  doc.descendants((node, pos, parent, index) => {
    if (node.type.name !== MermaidExtension.name) {
      return
    }

    // See https://github.com/yjs/y-prosemirror/issues/49
    // Ideally, one would hope that decorations would be recovered through the use of
    // transaction mapping, but with Yjs this is not possible in many cases.
    // So there's a need for dirty hacks to keep the state of the node intact. (See below).
    const yjsdoc = options.ydoc?.getXmlFragment(options.ydocContentField ?? 'content')
    const yid =
      yjsdoc !== undefined ? yRelativePositionToString(createRelativePositionFromTypeIndex(yjsdoc, index)) : undefined
    const nodeid = yid ?? index
    const oldCache = prev.decorationCache
    const oldState =
      (lastDecorationSet.find(pos, pos + node.nodeSize).find((d) => d.spec.type === MermaidExtension.name)
        ?.spec as NodeDecorationState) ??
      (yid !== undefined ? oldCache.get(nodeid) : undefined) ??
      (oldCache.get(mIndex)?.textContent === node.textContent ? oldCache.get(mIndex) : undefined)

    const newState: NodeDecorationState = {
      type: 'mermaid',
      diagramBuilder: (view: EditorView) => buildDiagram(node, nodeid, view, theme),
      folded: oldState?.folded ?? node.textContent.trim().length > 0,
      selected: oldState?.selected ?? false,
      textContent: node.textContent
    }

    if (nodeStatePatch !== undefined && pos === nodeStatePatch.pos) {
      newState.folded = nodeStatePatch.folded
      newState.selected = nodeStatePatch.selected
    }

    if (yid !== undefined) decorationCache.set(yid, newState)
    decorationCache.set(mIndex, newState)
    mIndex++

    decorations.push(Decoration.node(pos, pos + node.nodeSize, {}, newState))
  })

  const decorationSet = DecorationSet.create(doc, decorations)

  if (unusedRenderCache.size >= 16) {
    for (const key of unusedRenderCache) {
      renderCache.delete(key)
    }
  }

  return {
    decorationSet,
    decorationCache,
    renderCache,
    nodeidCache,
    throttle: prev.throttle,
    pendingFragments
  }
}

export function MermaidDecorator (options: MermaidOptions): Plugin {
  return new Plugin<MermaidPluginState>({
    key: new PluginKey('mermaid-decorator'),
    props: {
      decorations (state) {
        return this.getState(state)?.decorationSet
      }
    },
    state: {
      init (config, state) {
        return buildState(
          options,
          {
            decorationSet: DecorationSet.create(state.doc, []),
            decorationCache: new Map(),
            nodeidCache: new Map(),
            renderCache: new Map(),
            throttle: new ThrottledCaller(150),
            pendingFragments: new Set()
          },
          state.doc
        )
      },
      apply (tr, prev, oldState, newState) {
        if (tr.docChanged || isChangeEditable(tr) || getTxMeta(tr) !== undefined) {
          return buildState(options, prev, newState.doc, tr)
        }

        return prev
      }
    },
    view (editorView) {
      const unsubscribe = themeStore.subscribe(() => {
        editorView.dispatch(setTxMeta(editorView.state.tr, { updateDecorations: true }))
      })

      return {
        destroy () {
          unsubscribe()
        }
      }
    }
  })
}

class ThrottledCaller<T> {
  timers = new Map<T, number>()
  delay: number

  lookup (key: T): number {
    return this.timers.get(key) ?? 0
  }

  update (key: T, increment: number = 0): number {
    const ticks = this.lookup(key) + increment
    this.timers.set(key, ticks)
    if (ticks === 0) this.timers.delete(key)
    return ticks
  }

  constructor (delay: number = 150) {
    this.delay = delay
  }

  call (key: T, callback: () => void): void {
    const instant = this.lookup(key) === 0
    if (instant) callback()

    this.update(key, 1)
    setTimeout(() => {
      const ticks = this.update(key, -1)
      if (ticks === 0 && !instant) callback()
    }, this.delay)
  }
}

function yRelativePositionToString (id: RelativePosition): string | undefined {
  if (id.item?.client === undefined) return
  return `${id.item.client}_${id.item.clock}`
}

// There is no public implementation of memraid syntax for higlightjs, while implementations for
// other highlighting tools are either incomplete or outdated (even the one used in the official live editor).
// This is a crude (broken) and incomplete port of the grammar.
function mermaidHLJS (hljs: any): any {
  return {
    case_insensitive: false,
    contains: [
      // Comments
      hljs.COMMENT('%%', '%%', {}),

      // Style definitions
      {
        className: 'style',
        begin: /^([ \t]*(?:classDef|linkStyle|style)[ \t]+[\w$-]+[ \t]+)\w.*[^\s;]/m,
        keywords: {
          name: 'classDef linkStyle style'
        },
        contains: [
          {
            className: 'property',
            begin: /\b\w[\w-]*(?=[ \t]*:)/
          },
          {
            className: 'operator',
            begin: /:/
          },
          {
            className: 'punctuation',
            begin: /,/
          }
        ]
      },

      // Inter-arrow labels
      {
        className: 'operator',
        begin:
          /([^<>ox.=-])(?:-[-.]|==)(?![<>ox.=-])[ \t]*(?:"[^"\r\n]*"|[^\s".=-](?:[^\r\n.=-]*[^\s.=-])?)[ \t]*(?:\.+->?|--+[->]|==+[=>])(?![<>ox.=-])/,
        contains: [
          {
            className: 'operator',
            begin: /(?:\.+->?|--+[->]|==+[=>])$/
          },
          {
            className: 'string',
            begin: /^([\s\S]{2}[ \t]*)\S(?:[\s\S]*\S)?/
          },
          {
            className: 'arrow-head',
            begin: /^\S+/
          }
        ]
      },

      // Arrow types
      {
        className: 'operator',
        variants: [
          { begin: /(?<=^|[^{}|o.-])[|}][|o](?:--|\.\.)[|o][|{](?![{}|o.-])/ },
          {
            begin:
              /(?<=^|[^<>ox.=-])(?:[<ox](?:==+|--+|-\.*-)[>ox]?|(?:==+|--+|-\.*-)[>ox]|===+|---+|-\.+-)(?![<>ox.=-])/
          },
          { begin: /(?<=^|[^<>()x-])(?:--?(?:>>|[x>)])(?![<>()x])|(?:<<|[x<(])--?(?!-))/ },
          { begin: /(?<=^|[^<>|*o.-])(?:[*o]--|--[*o]|<\|?(?:--|\.\.)|(?:--|\.\.)\|?>|--|\.\.)(?![<>|*o.-])/ }
        ]
      },

      // Labels
      {
        className: 'string',
        begin: /(^|[^|<])\|(?:[^\r\n"|]|"[^"\r\n]*")+\|/
      },

      // Text elements
      {
        className: 'string',
        begin: /(?:[([{]+|\b>)(?:[^\r\n"()[\]{}]|"[^"\r\n]*")+(?:[)\]}]+|>)/
      },

      // Strings
      {
        className: 'string',
        begin: /"[^"\r\n]*"/
      },

      // Annotations
      {
        className: 'keyword',
        begin: /<<(?:abstract|choice|enumeration|fork|interface|join|service)>>|\[\[(?:choice|fork|join)\]\]/i
      },

      // Keywords
      {
        className: 'keyword',
        variants: [
          {
            begin:
              /(^[ \t]*)(?:action|callback|class|classDef|classDiagram|click|direction|erDiagram|flowchart|gantt|gitGraph|graph|journey|link|linkStyle|pie|requirementDiagram|sequenceDiagram|stateDiagram|stateDiagram-v2|style|subgraph)(?![\w$-])/m
          },
          {
            begin:
              /(^[ \t]*)(?:activate|alt|and|as|autonumber|deactivate|else|end(?:[ \t]+note)?|loop|opt|par|participant|rect|state|note[ \t]+(?:over|(?:left|right)[ \t]+of))(?![\w$-])/im
          }
        ]
      },

      // Entities
      {
        className: 'variable',
        begin: /#[a-z0-9]+;/
      },

      // Operators
      {
        className: 'operator',
        begin: /(\w[ \t]*)&(?=[ \t]*\w)|:::|:/
      }
    ]
  }
}

const editIconSvg = `<svg class="svg-medium" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M14,13.1H9.2c-0.3,0-0.5,0.2-0.5,0.5s0.2,0.5,0.5,0.5H14c0.3,0,0.5-0.2,0.5-0.5S14.3,13.1,14,13.1z"></path><path d="M11.4,7.1C11.4,7.1,11.4,7.1,11.4,7.1c1.2-1.6,1.3-1.6,1.3-1.6C12.9,5,13,4.5,12.9,4c-0.1-0.5-0.4-0.9-0.8-1.2 c0,0-1.1-0.9-1.1-0.9c-0.8-0.7-2.1-0.6-2.8,0.3c0,0,0,0,0,0l-6.3,7.9c-0.3,0.4-0.4,0.9-0.3,1.4l0.5,2.3c0.1,0.2,0.3,0.4,0.5,0.4 c0,0,0,0,0,0l2.4,0c0.5,0,1-0.2,1.3-0.6C8.9,10.2,10.5,8.2,11.4,7.1C11.4,7.1,11.4,7.1,11.4,7.1z M8.9,2.8c0.3-0.4,1-0.5,1.4-0.1 c0,0,1.2,0.9,1.2,0.9c0.2,0.1,0.4,0.3,0.4,0.6c0.1,0.2,0,0.5-0.1,0.7c0,0-0.4,0.5-0.9,1.2L8.1,3.9L8.9,2.8z M5.5,12.9 C5.4,13,5.2,13.1,5,13.1l-2,0l-0.5-1.9c0-0.2,0-0.4,0.1-0.5l4.8-6l2.8,2.2C8.9,8.6,6.8,11.2,5.5,12.9z"></path>
</svg>`

const foldIconSvg = `<svg class="svg-medium" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M14.1464 1.14645C14.3417 0.951184 14.6583 0.951184 14.8535 1.14645C15.0477 1.34063 15.0488 1.6548 14.8567 1.85031L10.707 5.99999H14V6.99999H8.99996V1.99999H9.99996V5.29299L14.1464 1.14645Z"></path>
  <path d="M1.99996 8.99999V9.99999H5.29296L1.14645 14.1464C0.951184 14.3417 0.951184 14.6583 1.14645 14.8535C1.34171 15.0488 1.65829 15.0488 1.85355 14.8535L5.99996 10.707V14H6.99996V8.99999H1.99996Z"></path>
</svg>`
