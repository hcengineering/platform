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

import chunter from '@hcengineering/chunter'
import core, {
  type Account,
  type Markup,
  type Ref,
  type Timestamp,
  generateId,
  getCurrentAccount
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { type ActionContext } from '@hcengineering/presentation'
import type { AnySvelteComponent } from '@hcengineering/ui'
import { type Editor, Extension } from '@tiptap/core'
import { type Node } from '@tiptap/pm/model'
import {
  type EditorState,
  Plugin,
  PluginKey,
  type PluginView,
  type Selection,
  TextSelection,
  type Transaction
} from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import tippy, { type Instance } from 'tippy.js'
import 'tippy.js/animations/shift-toward.css'
import { type Doc as YDoc, type Map as YMap } from 'yjs'
import { SvelteRenderer } from '../node-view'

interface InlineCommentExtensionOptions {
  boundary?: HTMLElement
  popupContainer?: HTMLElement
  commentWidth?: number

  ydoc: YDoc
  ydocExtensionField?: string

  minEditorWidth?: number

  requestSideSpace?: (width: number) => void
}

type InlineCommentDisplayMode = 'compact' | 'full'

interface PointerState {
  hover: Set<string>
  focus: Set<string>
}

interface MetaPatch {
  newCommentRequested?: boolean
  displayModeConstraint?: InlineCommentDisplayMode
  component?: AnySvelteComponent
  pointer?: Partial<PointerState>
  threads?: Map<string, Thread>
}

function getMeta (tx?: Transaction): MetaPatch | undefined {
  return tx?.getMeta('inline-comment')
}

function setMeta (tx: Transaction, meta: MetaPatch): Transaction {
  return tx.setMeta('inline-comment', meta).setMeta('addToHistory', false)
}

function getYDocCommentMap (options: InlineCommentExtensionOptions): YMap<InlineComment> {
  return options.ydoc.getMap(options.ydocExtensionField ?? 'inline-comments')
}

const commentWidth = 320
const commentGap = 16
const decoratedCommentClass = 'proseInlineCommentHighlight'

interface InlineComment {
  _id: string
  _class: string

  thread: string

  message: Markup

  createdOn: Timestamp
  createdBy: Ref<Account>

  editedOn?: Timestamp
}

interface Thread {
  _id: string
  _class: string
  messages: InlineComment[]
}

interface ThreadPresenterProps {
  thread: Thread
  autofocus?: boolean
  collapsed?: boolean
  width?: number
  highlighted?: boolean

  handleSubmit?: (text: string, _id?: string) => void
  handleResolveThread?: (() => void) | undefined
}

const extensionName = 'inlineCommentCollaboration'

export const InlineCommentCollaborationExtension = Extension.create<InlineCommentExtensionOptions>({
  name: extensionName,
  addProseMirrorPlugins () {
    return [...(this.parent?.() ?? []), InlineCommentDecorator(this.options)]
  }
})

interface InlineCommentDecoratorState {
  commentThreads: Map<string, Thread>
  commentViews: Map<string, InlineCommentView>

  decorationSet: DecorationSet
  component?: AnySvelteComponent
  displayMode: InlineCommentDisplayMode
  displayModeConstraint: InlineCommentDisplayMode

  pointer: PointerState

  pendingComment?: { thread: Thread, selection: Selection }
}

const inlineCommentDecoratorKey = new PluginKey('inline-comment-decorator')

function getCommentDecoratorState (editorState: EditorState): InlineCommentDecoratorState | undefined {
  return inlineCommentDecoratorKey.getState(editorState)
}

export function InlineCommentDecorator (options: InlineCommentExtensionOptions): Plugin {
  return new Plugin<InlineCommentDecoratorState>({
    key: inlineCommentDecoratorKey,
    props: {
      decorations (state) {
        return this.getState(state)?.decorationSet
      },
      handleDOMEvents: {
        mousemove: handleInlineCommentMouseHover
      }
    },
    state: {
      init (config, state) {
        const decoratorState: InlineCommentDecoratorState = {
          commentThreads: new Map(),
          decorationSet: DecorationSet.empty,
          displayMode: 'compact',
          displayModeConstraint: 'compact',
          commentViews: new Map(),
          pointer: {
            hover: new Set(),
            focus: new Set()
          }
        }
        return buildCommentDecoratorState(options, decoratorState, state, state)
      },
      apply (tr, prev, oldState, newState) {
        return buildCommentDecoratorState(options, prev, oldState, newState, tr)
      }
    },
    view (view) {
      return initCommentDecoratorView(options, view)
    }
  })
}

function initCommentDecoratorView (options: InlineCommentExtensionOptions, view: EditorView): PluginView {
  const destructors = [
    () => {
      getCommentDecoratorState(view.state)?.commentViews?.forEach((view) => {
        view.destroy()
      })
    }
  ]

  const fetchComponent = async (): Promise<void> => {
    // In the current package structure, it is practically impossible to import anything from here
    // without introducing cyclic dependencies, since text-editor-resources is in the dependency
    // hierarchy of almost all other packages. So any complex Svelte components have to be moved to other packages.
    // In the future, it might be worth considering putting text editor plugins in the text-editor-plugins
    // package so that one can create dependencies on packages such as activity and chunter.
    const component = await getResource(chunter.component.InlineCommentThread)
    view.dispatch(setMeta(view.state.tr, { component }))
  }

  void fetchComponent()

  const elementSize = {
    editor: 0,
    boundary: 0
  }

  const updateSize = (key: keyof typeof elementSize, w: number): void => {
    const prev = { ...elementSize }
    elementSize[key] = w

    const minEditorW = options.minEditorWidth ?? 62 * 16

    const state = getCommentDecoratorState(view.state)

    const canFitSideView = elementSize.boundary - Math.max(elementSize.editor, minEditorW) > commentWidth

    const displayModeNew = canFitSideView ? 'full' : 'compact'
    const displayModeOld = state?.displayMode ?? 'compact'

    if (displayModeNew !== displayModeOld) {
      view.dispatch(setMeta(view.state.tr, { displayModeConstraint: displayModeNew }))
    }

    if (prev.editor !== elementSize.editor && state?.commentViews !== undefined) {
      for (const view of state.commentViews.values()) view.tippynode?.setProps({ duration: 0 })
    }
  }

  if (options.boundary !== undefined && options.requestSideSpace !== undefined) {
    updateSize('editor', view.dom.offsetWidth)
    updateSize('boundary', options.boundary.offsetWidth)

    destructors.push(
      observeSizeChanges(view.dom, (w, h) => {
        updateSize('editor', w)
      }),
      observeSizeChanges(options.boundary, (w, h) => {
        updateSize('boundary', w)
      })
    )
  }

  const commentMap = getYDocCommentMap(options)
  const commentMapObserver = (): void => {
    const threads = fetchCommentThreads(options)
    view.dispatch(setMeta(view.state.tr, { threads }))
  }

  commentMap.observe(commentMapObserver)
  destructors.push(() => {
    commentMap.unobserve(commentMapObserver)
  })
  commentMapObserver()

  return {
    destroy () {
      for (const fn of destructors) fn()
    }
  }
}

function buildCommentDecoratorState (
  options: InlineCommentExtensionOptions,
  prev: InlineCommentDecoratorState,
  oldState: EditorState,
  newState: EditorState,
  tr?: Transaction
): InlineCommentDecoratorState {
  const meta = getMeta(tr)

  const isNewCommentRequested = meta?.newCommentRequested ?? false
  const isDocChanged = tr?.docChanged ?? true
  const isSelectionChanged = !oldState.selection.eq(newState.selection)
  const isUpdateRequested = meta !== undefined

  const pointer: PointerState = {
    focus:
      meta?.pointer?.focus !== undefined
        ? meta.pointer.focus
        : !isSelectionChanged
            ? prev.pointer.focus
            : new Set<string>(),
    hover: meta?.pointer?.hover !== undefined ? meta.pointer.hover : prev.pointer.hover
  }

  let pendingComment: InlineCommentDecoratorState['pendingComment'] = isNewCommentRequested
    ? {
        thread: { _id: generateId(), _class: core.class.Obj, messages: [] },
        selection: newState.selection
      }
    : prev.pendingComment !== undefined && !isSelectionChanged
      ? {
          thread: prev.pendingComment.thread,
          selection: mapSelection(prev.pendingComment.selection)
        }
      : undefined

  const commentThreads = meta?.threads ?? prev.commentThreads
  const commentViews = new Map(prev.commentViews)
  const component = meta?.component ?? prev.component

  const visitedCommentViews: InlineCommentView[] = []
  const settledCommentViews = Array.from(commentViews.values())
    .filter((v) => v.props.thread._id !== pendingComment?.thread?._id)
    .filter((v) => commentThreads.has(v.props.thread._id))

  const displayModeConstraint = meta?.displayModeConstraint ?? prev.displayModeConstraint
  const displayMode = displayModeConstraint === 'full' && settledCommentViews.length > 0 ? 'full' : 'compact'

  let decorationSet = mapDecorationSet(prev.decorationSet)

  const initCommentView = (viewState: InlineCommentViewProps): InlineCommentView => {
    const view = commentViews.get(viewState.thread._id) ?? new InlineCommentView(options, viewState)
    commentViews.set(viewState.thread._id, view)
    visitedCommentViews.push(view)
    return view
  }

  const buildCommentDecorations = (thread: Thread, from: number, to: number, mark?: NodeMark): Decoration[] => {
    const siblings = Array.from(visitedCommentViews)

    const isSelected = isSelectionContainedByRange(newState.selection, from, to)
    const isFocused = pointer.focus.has(thread._id)
    const isHovered = pointer.hover.has(thread._id)
    const isActive = isSelected || isFocused
    const isPendingComment = thread._id === pendingComment?.thread._id

    const isCollapsed = displayMode === 'compact' ? false : !isActive
    const isVisible = displayMode === 'full' || isActive

    const isHighligted = isActive || isHovered || isPendingComment

    const commentViewProps: InlineCommentViewProps = {
      mark,
      siblings,
      thread,
      range: { from, to },
      component,
      showPopup: isVisible,
      boundary: options.boundary,
      popupContainer: options.popupContainer,
      autofocus: isPendingComment,
      displayMode,
      highlighted: isHighligted,
      collapsed: isCollapsed
    }

    const commentView = initCommentView(commentViewProps)

    const commentSpanCSSClass = isHighligted ? `${decoratedCommentClass} active` : `${decoratedCommentClass}`

    const decorations = [
      Decoration.widget(to, (view) => {
        return commentView.build(view, commentViewProps)
      }),
      Decoration.inline(from, to, { class: commentSpanCSSClass })
    ]

    return decorations
  }

  if (displayMode !== prev.displayMode) {
    options.requestSideSpace?.(displayMode === 'compact' ? 0 : commentWidth)
  }

  if (isDocChanged || isSelectionChanged || isUpdateRequested) {
    const decorations: Decoration[] = []
    const ranges = new Map<string, { thread: Thread, from: number, to: number, mark?: NodeMark }>()

    newState.doc.descendants((node, pos) => {
      const marks = getThreadsFromNode(commentThreads, node)

      for (const m of marks) {
        const thread = m.thread
        const part = { from: pos, to: pos + node.nodeSize }
        const range = ranges.get(thread._id) ?? { thread, from: part.from, to: part.to, mark: m.mark }

        if (part.from < range.from) range.from = part.from
        if (part.to > range.to) range.to = part.to

        ranges.set(thread._id, range)
      }
    })

    if (pendingComment !== undefined && ranges.has(pendingComment.thread._id)) {
      pendingComment = undefined
    }

    if (pendingComment !== undefined) {
      const selection = pendingComment.selection
      const range = {
        thread: pendingComment.thread,
        from: selection.from,
        to: selection.to
      }
      ranges.set(pendingComment.thread._id, range)
    }

    const orderedRanges = Array.from(ranges.values()).sort((a, b) => a.from - b.from)

    for (const range of orderedRanges) {
      decorations.push(...buildCommentDecorations(range.thread, range.from, range.to, range.mark))
    }
    decorationSet = DecorationSet.create(newState.doc, decorations)

    const unusedCommentViews = new Set(commentViews.keys())
    for (const view of visitedCommentViews) {
      unusedCommentViews.delete(view.props.thread._id)
    }
    for (const id of unusedCommentViews) {
      commentViews.get(id)?.destroy()
      commentViews.delete(id)
    }
  }

  return {
    commentThreads,
    displayMode,
    displayModeConstraint,
    decorationSet,
    component,
    commentViews,
    pendingComment,
    pointer
  }
}

function handleInlineCommentMouseHover (view: EditorView, event: MouseEvent): void {
  const element = event.target as HTMLElement
  const isValidHoverTarget = element?.classList?.contains(decoratedCommentClass)

  const state = getCommentDecoratorState(view.state)
  if (state === undefined) return

  const threadIds = new Set<string>()

  if (isValidHoverTarget) {
    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
    if (pos === null) return

    const { doc } = view.state
    const rpos = doc.resolve(pos.pos)

    const node = rpos.nodeAfter
    if (node === null) return

    const marks = getThreadsFromNode(state.commentThreads, node)
    if (marks.length < 1) return

    for (const m of marks) {
      threadIds.add(m.thread._id)
    }
  }

  updatePointerState(view, { hover: threadIds })
}

interface InlineCommentViewProps {
  siblings: InlineCommentView[]
  thread: Thread
  range: { from: number, to: number }
  mark?: NodeMark
  showPopup: boolean
  component?: AnySvelteComponent
  boundary?: HTMLElement
  popupContainer?: HTMLElement
  autofocus?: boolean
  collapsed?: boolean
  highlighted?: boolean
  displayMode: InlineCommentDisplayMode
}

interface OffsetRect {
  x: number
  y: number
  width: number
  height: number
}

class InlineCommentView {
  pluginOptions: InlineCommentExtensionOptions
  props: InlineCommentViewProps
  container: HTMLElement | null
  renderer: SvelteRenderer | null
  tippynode: Instance | null
  rect: OffsetRect
  destructors: Array<() => void>

  handlers: {
    handleResolveThread: () => void
    handleSubmit: (text: string, _id?: string) => void
  } | null

  constructor (pluginOptions: InlineCommentExtensionOptions, props: InlineCommentViewProps) {
    this.pluginOptions = pluginOptions
    this.props = props
    this.container = null
    this.renderer = null
    this.tippynode = null
    this.destructors = []
    this.handlers = null

    this.rect = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
  }

  buildComponentProps (view: EditorView): ThreadPresenterProps {
    return {
      thread: this.props.thread,
      autofocus: this.props.autofocus ?? false,
      width: commentWidth,
      highlighted: this.props.highlighted,
      collapsed: this.props.collapsed ?? false,
      handleResolveThread: this.handlers?.handleResolveThread,
      handleSubmit: this.handlers?.handleSubmit
    }
  }

  build (view: EditorView, props?: InlineCommentViewProps): HTMLElement {
    const prevprops = this.props
    if (props !== undefined) this.props = props

    if (this.handlers === null) {
      this.handlers = {
        handleResolveThread: () => {
          resolveThread(this.pluginOptions, view, this.props.thread._id)
        },
        handleSubmit: (text: string, _id?: string) => {
          updateThreadComment(this.pluginOptions, view, { _id, thread: this.props.thread._id, message: text })
        }
      }
    }

    const displayMode = this.props.displayMode
    const placement = displayMode === 'compact' ? 'bottom' : 'right-start'

    const getReferenceClientRect = (): DOMRect => {
      return displayMode === 'full'
        ? getReferenceAnchor(view, this.props.range.from, this.props.range.to)
        : getReferenceRect(view, this.props.range.from, this.props.range.to)
    }

    if (this.tippynode === null && this.props.component !== undefined) {
      this.container = document.createElement('div')

      const listeners: Array<[keyof HTMLElementEventMap, () => void]> = [
        [
          'click',
          (): void => {
            updatePointerState(view, { focus: new Set([this.props.thread._id]) })
          }
        ],
        [
          'mouseenter',
          (): void => {
            updatePointerState(view, { hover: new Set([this.props.thread._id]) })
          }
        ],
        [
          'mouseleave',
          (): void => {
            updatePointerState(view, { hover: new Set([]) })
          }
        ]
      ]

      for (const listener of listeners) {
        this.container.addEventListener(listener[0], listener[1])
        this.destructors.push(() => this.container?.removeEventListener(listener[0], listener[1]))
      }

      this.destructors.push(
        observeSizeChanges(this.container, () => {
          forceUpdateDecorations(view)
        })
      )

      this.tippynode = tippy(view.dom, {
        duration: 100,
        getReferenceClientRect,
        animation: 'shift-toward',
        inertia: true,
        content: this.container,
        maxWidth: commentWidth,
        interactive: true,
        trigger: 'manual',
        placement,
        hideOnClick: 'toggle',
        onDestroy: () => {
          this.renderer?.destroy()
        },
        appendTo: () => this.props.popupContainer ?? document.body,
        zIndex: 10000,
        popperOptions: {
          modifiers: [
            {
              name: 'preventOverflow',
              options: {
                boundary: this.props.boundary ?? view.dom,
                padding: commentGap,
                altAxis: true
              }
            },
            {
              name: 'collectBoxMetrics',
              phase: 'read',
              enabled: true,
              fn: ({ state }) => {
                const offset = state.modifiersData.popperOffsets
                if (offset === undefined) return

                this.rect = {
                  x: offset.x,
                  y: offset.y,
                  width: state.elements.popper.offsetWidth,
                  height: state.elements.popper.offsetHeight
                }
              }
            },
            {
              name: 'adjustSideViewOffsets',
              phase: 'main',
              enabled: true,
              requires: ['preventOverflow', 'collectBoxMetrics'],
              fn: ({ state }) => {
                if (this.props.displayMode !== 'full') return

                const popperOffsets = state.modifiersData.popperOffsets
                if (popperOffsets === undefined) return

                const offsets = { ...popperOffsets }

                const siblings = this.props.siblings.filter((s) => s.props.displayMode === 'full')

                let yOffset = 0
                for (const sibling of siblings) {
                  yOffset = Math.max(yOffset, sibling.rect.y)
                  yOffset += sibling.rect.height + commentGap
                }

                offsets.y = Math.max(offsets.y, yOffset)
                offsets.x += commentGap

                state.modifiersData.popperOffsets = offsets
              }
            }
          ]
        }
      })

      this.destructors.push(() => this.tippynode?.destroy())

      this.renderer = new SvelteRenderer(this.props.component, {
        element: this.container,
        props: this.buildComponentProps(view)
      })
    }

    if (this.props.displayMode !== prevprops.displayMode) {
      this.tippynode?.setProps({ placement, getReferenceClientRect, duration: 0 })
    } else {
      this.tippynode?.setProps({ duration: 100 })
    }

    if (this.props.showPopup) {
      this.tippynode?.show()
    } else {
      this.tippynode?.hide()
    }

    if (props !== undefined && this.props.showPopup) {
      this.renderer?.updateProps(this.buildComponentProps(view))
    }

    this.tippynode?.setProps({})

    return document.createElement('span')
  }

  destroy (): void {
    for (const fn of this.destructors) fn()
  }
}

function eqSets<T> (xs: Set<T>, ys: Set<T>): boolean {
  return xs.size === ys.size && [...xs].every((x) => ys.has(x))
}

function forceUpdateDecorations (view: EditorView): void {
  view.dispatch(setMeta(view.state.tr, {}))
}

function fetchCommentThreads (options: InlineCommentExtensionOptions): Map<string, Thread> {
  const commentMap = getYDocCommentMap(options)
  const threads = new Map<string, Thread>()
  for (const comment of commentMap.values()) {
    const thread = threads.get(comment.thread) ?? {
      _id: comment.thread,
      _class: core.class.Obj,
      messages: []
    }
    thread.messages.push(comment)
    threads.set(thread._id, thread)
  }
  return threads
}

function resolveThread (options: InlineCommentExtensionOptions, editorView: EditorView, thread: string): void {
  const view = getCommentDecoratorState(editorView.state)?.commentViews.get(thread)
  if (view === undefined) return

  const commentMap = getYDocCommentMap(options)

  const keys = Array.from(commentMap.keys())
  for (const key of keys) {
    const comment = commentMap.get(key)
    if (comment?.thread === thread) commentMap.delete(key)
  }

  const { from, to } = view.props.range
  const mark = view.props.mark ?? editorView.state.schema.marks['inline-comment']
  editorView.dispatch(setMeta(editorView.state.tr.removeMark(from, to, mark), {}))
}

function updateThreadComment (
  options: InlineCommentExtensionOptions,
  editorView: EditorView,
  patch: { _id?: string, thread: string, message: string }
): void {
  const view = getCommentDecoratorState(editorView.state)?.commentViews.get(patch.thread)

  const commentMap = getYDocCommentMap(options)

  const existingComment: InlineComment | undefined = patch._id !== undefined ? commentMap.get(patch._id) : undefined

  const account = getCurrentAccount()

  const comment: InlineComment =
    existingComment !== undefined
      ? {
          ...existingComment,
          message: patch.message,
          editedOn: Date.now()
        }
      : {
          _id: generateId(),
          _class: core.class.Obj,
          thread: patch.thread,
          createdBy: account._id,
          createdOn: Date.now(),
          message: patch.message
        }

  if (comment.message !== '') {
    commentMap.set(comment._id, comment)
  } else {
    commentMap.delete(comment._id)
  }

  const thread = fetchCommentThreads(options).get(comment.thread)
  if (thread === undefined) return

  if (view !== undefined) {
    const { from, to } = view.props.range

    let tr = setMeta(editorView.state.tr, {})
    if (thread.messages.length === 0) {
      tr = tr.setSelection(TextSelection.create(editorView.state.doc, 0))
    }
    if (thread.messages.length === 1 && existingComment === undefined) {
      const mark = editorView.state.schema.mark('inline-comment', { thread: thread._id })
      tr = tr.addMark(from, to, mark)
    }
    editorView.dispatch(tr)
  }
}

function updatePointerState (view: EditorView, patch: Partial<PointerState>): void {
  const state = getCommentDecoratorState(view.state)
  if (state === undefined) return

  const pointer = { ...state.pointer }

  let isUpdated = false
  for (const property in patch) {
    const key = property as keyof PointerState
    const newState = patch[key]
    if (newState === undefined || eqSets(pointer[key], newState)) {
      continue
    }
    isUpdated = true
    pointer[key] = newState
  }

  if (isUpdated) {
    view.dispatch(setMeta(view.state.tr, { pointer }))
  }
}

type NodeMark = Node['marks'][0]

function getThreadsFromNode (threads: Map<string, Thread>, node: Node): Array<{ thread: Thread, mark: NodeMark }> {
  const out: ReturnType<typeof getThreadsFromNode> = []

  if (node.type.name !== 'text') return out
  const marks = node?.marks?.filter((m) => m.type.name === 'inline-comment')

  for (const mark of marks) {
    const thread = threads.get(mark.attrs.thread)
    if (thread === undefined) continue
    out.push({ mark, thread })
  }

  return out
}

function observeSizeChanges (element: HTMLElement, callback: (width: number, height: number) => void): () => void {
  let width = element.offsetWidth
  let height = element.offsetHeight

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target !== element) continue

      const w = entry.contentRect.width
      const h = entry.contentRect.height

      if (h !== height || w !== width) {
        width = w
        height = h
        // This call should not be postponed via requestAnimationFrame,
        // otherwise there will be noticeable glitches in rendering.
        // However, there are some cases when rendering converges in several steps,
        // which causes browser warning "ResizeObserver loop completed with undelivered notifications".
        // (Which is generally fine according to the documentation of ResizeObserver itself).
        // For this purpose it is appropriate to selectively disable this error in the webpack
        // overlay for local development.
        callback(width, height)
      }
    }
  })

  resizeObserver.observe(element)

  return () => {
    resizeObserver.disconnect()
  }
}

function mapDecorationSet (set: DecorationSet, tr?: Transaction): DecorationSet {
  return tr !== undefined ? set.map(tr.mapping, tr.doc) : set
}

function mapSelection (sel: Selection, tr?: Transaction): Selection {
  return tr !== undefined ? sel.map(tr.doc, tr.mapping) : sel
}

function minmax (value = 0, min = 0, max = 0): number {
  return Math.min(Math.max(value, min), max)
}

function getReferenceAnchor (view: EditorView, from: number, to: number): DOMRect {
  const minPos = 0
  const maxPos = view.state.doc.content.size
  const resolvedFrom = minmax(from, minPos, maxPos)
  const resolvedEnd = minmax(to, minPos, maxPos)
  const start = view.coordsAtPos(resolvedFrom)
  const end = view.coordsAtPos(resolvedEnd, -1)

  const top = Math.min(start.top, end.top)
  const editorRect = view.dom.getBoundingClientRect()

  const data = {
    top,
    bottom: top,
    left: editorRect.left,
    right: editorRect.right,
    width: editorRect.width,
    height: 0,
    x: editorRect.x,
    y: top
  }

  return {
    ...data,
    toJSON: () => data
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

export async function createInlineComment (editor: Editor, event: MouseEvent): Promise<void> {
  editor.view.dispatch(setMeta(editor.state.tr, { newCommentRequested: true }))
}

function isSelectionContainedByRange (selection: Selection, from: number, to: number): boolean {
  return selection.from >= from && selection.to <= to
}

export async function shouldShowCreateInlineCommentAction (editor: Editor, ctx: ActionContext): Promise<boolean> {
  if (!editor.isEditable) {
    return false
  }

  const extension = editor.extensionManager.extensions.find((e) => e.name === extensionName)
  if (extension === undefined) return false

  return true
}
