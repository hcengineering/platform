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
// See the License for the License governing permissions and
// limitations under the License.
//

import {
  type DecorationWithType,
  type Editor,
  NodeView,
  type NodeViewProps,
  type NodeViewRenderer,
  type NodeViewRendererOptions,
  type NodeViewRendererProps
} from '@tiptap/core'
import type { Node as ProseMirrorNode, Slice } from '@tiptap/pm/model'
import { type Decoration, type ViewMutationRecord, type NodeViewConstructor, type DecorationSource } from '@tiptap/pm/view'
import type { ComponentType, SvelteComponent } from 'svelte'

import { createNodeViewContext } from './context'
import { SvelteRenderer } from './svelte-renderer'

export interface SvelteNodeViewRendererOptions extends NodeViewRendererOptions {
  contentAs?: string
  contentClass?: string
  componentProps?: Record<string, any>
  update?: (node: ProseMirrorNode, decorations: DecorationWithType[]) => boolean
}

export interface SvelteNodeViewProps {
  editor: Editor
  node: ProseMirrorNode
  decorations: DecorationWithType[]
  selected: boolean
  extension: any
  getPos: () => number
  updateAttributes: (attributes: Record<string, any>) => void
  deleteNode: () => void
  view: NodeViewRendererProps['view']
  innerDecorations: DecorationSource
  HTMLAttributes: Record<string, any>
  [key: string]: any
}

export type SvelteNodeViewComponent = typeof SvelteComponent | ComponentType

/**
 * Svelte NodeView renderer, inspired by React and Vue implementation by Tiptap
 * https://tiptap.dev/guide/node-views/react/
 */
class SvelteNodeView<
  Component extends SvelteNodeViewComponent = SvelteNodeViewComponent,
  E extends Editor = Editor,
  Options extends SvelteNodeViewRendererOptions = SvelteNodeViewRendererOptions
> extends NodeView<Component, E, Options> {
  private readonly renderer!: SvelteRenderer
  declare public decorations: DecorationWithType[]
  declare public editor: E
  declare public node: ProseMirrorNode
  declare public getPos: () => number
  declare public readonly options: Options
  public isEditable: boolean
  public contentDOMElement: HTMLElement | null = null
  declare public readonly extension: any
  declare public isDragging: boolean
  declare public view: NodeViewRendererProps['view']
  declare public innerDecorations: DecorationSource
  declare public HTMLAttributes: NodeViewRendererProps['HTMLAttributes']

  constructor (
    component: Component,
    prop: NodeViewRendererProps,
    options?: Partial<Options>
  ) {
    super(component, prop, options ?? {})
    this.editor = prop.editor as E
    this.node = prop.node
    this.extension = prop.extension
    this.getPos = typeof prop.getPos === 'function' ? prop.getPos : () => -1
    this.options = options as Options ?? {} as Options
    this.isEditable = this.editor.isEditable
    const props: SvelteNodeViewProps = {
      editor: this.editor,
      node: this.node,
      decorations: this.decorations,
      selected: false,
      extension: this.extension,
      getPos: this.getPos,
      updateAttributes: this.updateAttributes.bind(this),
      deleteNode: this.deleteNode.bind(this),
      view: prop.view,
      innerDecorations: prop.innerDecorations,
      HTMLAttributes: prop.HTMLAttributes
    }

    const contentAs = this.options.contentAs ?? (this.node.isInline ? 'span' : 'div')
    const contentClass = this.options.contentClass ?? `node-${this.node.type.name}`

    const target = document.createElement(contentAs)
    target.classList.add(contentClass)

    this.contentDOMElement = null
    const context = createNodeViewContext({
      onDragStart: this.onDragStart.bind(this),
      onContentElement: (element) => {
        this.contentDOMElement = element
      }
    })

    this.renderer = new SvelteRenderer(this.component, { element: target, props, context })

    this.editor.on('update', this.handleEditorUpdate.bind(this))
    this.editor.on('selectionUpdate', this.handleSelectionUpdate.bind(this))
  }

  get dom (): HTMLElement {
    if (this.renderer.element.firstElementChild?.hasAttribute('data-node-view-wrapper') === false) {
      throw Error('Please use the NodeViewWrapper component for your node view.')
    }

    return this.renderer.element
  }

  get contentDOM (): HTMLElement | null {
    if (this.node.isLeaf) {
      return null
    }

    return this.contentDOMElement
  }

  public stopEvent (event: Event): boolean {
    if (typeof this.options.stopEvent === 'function') {
      return this.options.stopEvent({ event })
    }
    return false
  }

  public update (node: ProseMirrorNode, decorations: readonly Decoration[]): boolean {
    if (typeof this.options.update === 'function') {
      return this.options.update(node, decorations as DecorationWithType[])
    }

    if (node.type !== this.node.type) {
      return false
    }

    if (node === this.node && this.decorations === decorations) {
      return true
    }

    this.node = node
    this.decorations = decorations as DecorationWithType[]

    this.renderer.updateProps({ node, decorations: decorations as DecorationWithType[] })

    return true
  }

  public selectNode (): void {
    this.renderer.updateProps({ selected: true })
    this.renderer.element.classList.add('ProseMirror-selectednode')
  }

  public deselectNode (): void {
    this.renderer.updateProps({ selected: false })
    this.renderer.element.classList.remove('ProseMirror-selectednode')
  }

  public handleEditorUpdate (): void {
    if (this.isEditable !== this.editor.isEditable) {
      this.isEditable = this.editor.isEditable
      this.renderer.updateProps({ editor: this.editor })
    }
  }

  public handleSelectionUpdate (): void {
    const { from, to } = this.editor.state.selection
    const pos = this.getPos()

    if (typeof pos !== 'number') {
      return
    }

    if (from <= pos && to >= pos + this.node.nodeSize) {
      if (this.renderer.props.selected === true) {
        return
      }

      this.selectNode()
    } else {
      if (this.renderer.props.selected !== true) {
        return
      }

      this.deselectNode()
    }
  }

  public destroy (): void {
    this.renderer.destroy()
    this.editor.off('update', this.handleEditorUpdate.bind(this))
    this.editor.off('selectionUpdate', this.handleSelectionUpdate.bind(this))
    this.contentDOMElement = null
  }

  public updateAttributes (attributes: Record<string, any>): void {
    if (!this.editor.isEditable) {
      return
    }

    const transaction = this.editor.state.tr.setNodeMarkup(
      this.getPos(),
      undefined,
      {
        ...this.node.attrs,
        ...attributes
      }
    )

    this.editor.view.dispatch(transaction)
  }

  public deleteNode (): void {
    if (!this.editor.isEditable) {
      return
    }

    const from = this.getPos()
    const to = from + this.node.nodeSize

    const transaction = this.editor.state.tr.delete(from, to)
    this.editor.view.dispatch(transaction)
  }

  public onDragStart (event: DragEvent): void {
    const { view } = this
    const slice = view.state.selection.content()
    view.dragging = { slice, move: true }

    const target = event.target as HTMLElement
    if (target) {
      target.style.opacity = '0.3'
      event.dataTransfer?.setDragImage(target, 0, 0)
    }

    this.isDragging = true
  }

  public ignoreMutation(mutation: ViewMutationRecord): boolean {
    if (typeof this.options.ignoreMutation === 'function') {
      return this.options.ignoreMutation({ mutation })
    }

    return true
  }
}

const SvelteNodeViewRenderer = <
  Component extends SvelteNodeViewComponent = SvelteNodeViewComponent,
  E extends Editor = Editor,
  Options extends SvelteNodeViewRendererOptions = SvelteNodeViewRendererOptions
>(
  component: Component,
  options: Partial<Options> = {} as Partial<Options>
): NodeViewRenderer => {
  return (props) => new SvelteNodeView<Component, E, Options>(component, props, options)
}

export default SvelteNodeViewRenderer
