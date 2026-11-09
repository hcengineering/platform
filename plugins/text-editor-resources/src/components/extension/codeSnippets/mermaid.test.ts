/** @jest-environment jsdom */

//
// Copyright © 2026 TraceX SAS.
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

import type { PrintContext } from '@hcengineering/presentation'
import type { Editor, NodeViewRendererProps } from '@tiptap/core'
import { Schema } from '@tiptap/pm/model'
import { Decoration, DecorationSet, type NodeView } from '@tiptap/pm/view'
import { MermaidExtension } from './mermaid'

jest.mock('@hcengineering/text', () => ({ codeBlockOptions: {} }))
jest.mock('@hcengineering/mermaid', () => ({ renderMermaidSvg: jest.fn() }))
jest.mock('@hcengineering/platform', () => ({ translate: jest.fn(async () => 'Failed to preview') }))
jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { string: { FailedToPreview: 'failed-to-preview' } }
}))
jest.mock('@hcengineering/theme', () => ({}))
jest.mock('@hcengineering/ui', () => ({ showPopup: jest.fn() }))
jest.mock('lowlight', () => ({ createLowlight: jest.fn() }))
jest.mock('./MermaidPopup.svelte', () => ({}))

const schema = new Schema({
  nodes: {
    doc: { content: 'mermaid' },
    text: {},
    mermaid: { content: 'text*' }
  }
})

interface Diagram {
  svg?: string
  error?: { message: string }
  domFragments: HTMLElement[]
}

interface DiagramDecoration {
  type: string
  textContent: string
  folded: boolean
  selected: boolean
  diagramBuilder: jest.Mock<Diagram, []>
}

function createView (
  printContext?: PrintContext,
  code: string = 'graph TD; A-->B'
): {
  view: NodeView
  render: (diagram: Diagram) => void
} {
  const extension = MermaidExtension.configure({ printContext })
  const addNodeView = extension.config.addNodeView!
  const context: Partial<ThisParameterType<typeof addNodeView>> = { options: extension.options }
  const factory = addNodeView.call(context as ThisParameterType<typeof addNodeView>)
  if (factory === null) throw new Error('Mermaid node view renderer is not configured')
  const node = schema.node('mermaid', undefined, code === '' ? undefined : schema.text(code))
  const editor: Partial<Editor> = {}
  const spec: DiagramDecoration = {
    type: 'mermaid',
    textContent: node.textContent,
    folded: false,
    selected: false,
    diagramBuilder: jest.fn<Diagram, []>(() => ({ domFragments: [] }))
  }
  const decorations = [Decoration.node(0, node.nodeSize, {}, spec)]
  const props: Partial<NodeViewRendererProps> = { node, editor: editor as Editor, decorations, getPos: () => 0 }
  const view = factory(props as NodeViewRendererProps)
  return {
    view,
    render: (diagram) => {
      spec.diagramBuilder.mockReturnValue(diagram)
      view.update?.(node, decorations, DecorationSet.empty)
    }
  }
}

describe('Mermaid print readiness', () => {
  const finish = jest.fn()
  const printContext: Partial<PrintContext> = { registerResource: jest.fn(() => finish) }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('keeps the resource pending until the SVG is mounted', () => {
    const { view, render } = createView(printContext as PrintContext)
    expect(printContext.registerResource).toHaveBeenCalledTimes(1)
    expect(finish).not.toHaveBeenCalled()
    const fragment = document.createElement('div')
    fragment.innerHTML = '<svg></svg>'
    finish.mockImplementationOnce(() => {
      expect(view.dom?.contains(fragment)).toBe(true)
    })
    render({ svg: '<svg></svg>', domFragments: [fragment] })
    expect(finish).toHaveBeenCalledTimes(1)
    view.destroy?.()
    expect(finish).toHaveBeenCalledTimes(1)
  })

  it('replaces a failed diagram with an explicit placeholder and releases the resource', async () => {
    const { view, render } = createView(printContext as PrintContext)
    render({ error: { message: 'Invalid diagram' }, domFragments: [] })
    await Promise.resolve()
    expect(view.dom?.textContent).toContain('Failed to preview')
    expect(finish).toHaveBeenCalledTimes(1)
    view.destroy?.()
  })

  it('handles the rendering deadline with a placeholder and ignores a late result', async () => {
    const { view, render } = createView(printContext as PrintContext)
    const options = jest.mocked(printContext.registerResource!).mock.calls[0][0]
    expect(options?.timeoutMs).toBe(15000)
    options?.onTimeout?.()
    await Promise.resolve()
    expect(view.dom?.textContent).toContain('Failed to preview')
    expect(finish).toHaveBeenCalledTimes(1)
    const fragment = document.createElement('div')
    fragment.innerHTML = '<svg></svg>'
    render({ svg: '<svg></svg>', domFragments: [fragment] })
    expect(view.dom?.contains(fragment)).toBe(false)
    view.destroy?.()
    expect(finish).toHaveBeenCalledTimes(1)
  })

  it('releases a destroyed node without waiting for the rendering deadline', () => {
    const { view } = createView(printContext as PrintContext)
    view.destroy?.()
    expect(finish).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('does not impose a rendering deadline on the ordinary editor', () => {
    const { view, render } = createView()
    expect(jest.getTimerCount()).toBe(0)
    expect(printContext.registerResource).not.toHaveBeenCalled()
    const fragment = document.createElement('div')
    render({ svg: '<svg></svg>', domFragments: [fragment] })
    expect(view.dom?.contains(fragment)).toBe(true)
    view.destroy?.()
  })

  it('does not wait for an empty diagram', () => {
    const { view } = createView(printContext as PrintContext, '')
    expect(printContext.registerResource).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
    view.destroy?.()
  })
})
