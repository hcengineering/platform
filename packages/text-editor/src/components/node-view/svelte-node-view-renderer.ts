//
// Copyright © 2023 Hardcore Engineering Inc.
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

import {
  type DecorationWithType,
  type Editor,
  NodeView,
  type NodeViewProps,
  type NodeViewRenderer,
  type NodeViewRendererOptions
} from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { ComponentType, SvelteComponent } from 'svelte'

import { createNodeViewContext } from './context'
import { SvelteRenderer } from './svelte-renderer'

export interface SvelteNodeViewRendererOptions extends NodeViewRendererOptions {
  update?: (node: ProseMirrorNode, decorations: DecorationWithType[]) => boolean
  contentAs?: string
  contentClass?: string
  componentProps?: Record<string, any>
}

export type SvelteNodeViewProps = NodeViewProps & Record<string, any>

export type SvelteNodeViewComponent = typeof SvelteComponent | ComponentType

/**
 * Svelte NodeView renderer, inspired by React and Vue implementation by Tiptap
 * https://tiptap.dev/guide/node-views/react/
 */
class SvelteNodeView extends NodeView<SvelteNodeViewComponent, Editor, SvelteNodeViewRendererOptions> {
  renderer!: SvelteRenderer

  contentDOMElement!: HTMLElement | null

  isEditable!: boolean

  override mount (): void {
    const props: SvelteNodeViewProps = {
      editor: this.editor,
      node: this.node,
      decorations: this.decorations,
      selected: false,
      extension: this.extension,
      getPos: () => this.getPos(),
      updateAttributes: (attributes = {}) => {
        this.updateAttributes(attributes)
      },
      deleteNode: () => {
        this.deleteNode()
      },
      ...(this.options.componentProps ?? {})
    }

    this.isEditable = this.editor.isEditable

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

    this.editor.on('update', this.handleEditorUpdate.bind(this))

    this.renderer = new SvelteRenderer(this.component, { element: target, props, context })
  }

  override get dom (): HTMLElement {
    if (this.renderer.element.firstElementChild?.hasAttribute('data-node-view-wrapper') === false) {
      throw Error('Please use the NodeViewWrapper component for your node view.')
    }

    return this.renderer.element
  }

  override get contentDOM (): HTMLElement | null {
    if (this.node.isLeaf) {
      return null
    }

    return this.contentDOMElement
  }

  update (node: ProseMirrorNode, decorations: DecorationWithType[]): boolean {
    if (typeof this.options.update === 'function') {
      return this.options.update(node, decorations)
    }

    if (node.type !== this.node.type) {
      return false
    }

    if (node === this.node && this.decorations === decorations) {
      return true
    }

    this.node = node
    this.decorations = decorations

    this.renderer.updateProps({ node, decorations })

    return true
  }

  selectNode (): void {
    this.renderer.updateProps({ selected: true })
  }

  deselectNode (): void {
    this.renderer.updateProps({ selected: false })
  }

  handleEditorUpdate (): void {
    if (this.isEditable !== this.editor.isEditable) {
      this.isEditable = this.editor.isEditable
      this.renderer.updateProps({ editor: this.editor })
    }
  }

  destroy (): void {
    this.renderer.destroy()
    this.contentDOMElement = null
    this.editor.off('update', this.handleEditorUpdate.bind(this))
  }
}

const SvelteNodeViewRenderer = (
  component: SvelteNodeViewComponent,
  options: Partial<SvelteNodeViewRendererOptions>
): NodeViewRenderer => {
  return (props) => new SvelteNodeView(component, props, options)
}

export default SvelteNodeViewRenderer
