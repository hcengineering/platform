/**
 * @jest-environment jsdom
 */
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

import { Editor, Node } from '@tiptap/core'
import { EmbedNode, type EmbedNodeView } from '../components/extension/embed/embed'
import { setLoadingState } from '../components/extension/toolbar/toolbar'

jest.mock('@hcengineering/text', () => jest.requireActual('../../../../foundations/core/packages/text/src/nodes/embed'))
jest.mock('@hcengineering/presentation', () => ({ copyTextToClipboard: jest.fn() }))
jest.mock('@hcengineering/text-editor', () => ({ __esModule: true, default: {} }))
jest.mock('../components/extension/reference', () => ({
  buildReferenceUrl: jest.fn(),
  parseReferenceUrl: jest.fn()
}))
jest.mock('../components/extension/embed/EmbedToolbarHead.svelte', () => ({}))
jest.mock('../components/extension/toolbar/toolbar', () => ({
  registerToolbarProvider: jest.fn(),
  setLoadingState: jest.fn()
}))

describe('Embed loading lifecycle', () => {
  let editor: Editor
  let resolveView: (view: EmbedNodeView) => void
  let view: jest.MockedFunction<EmbedNodeView>
  let pending: Promise<EmbedNodeView>

  beforeEach(() => {
    jest.clearAllMocks()
    view = jest.fn<ReturnType<EmbedNodeView>, Parameters<EmbedNodeView>>(() => ({ name: 'test' }))
    pending = new Promise<EmbedNodeView>((resolve) => {
      resolveView = resolve
    })
  })

  function createEditor (): Editor {
    return new Editor({
      extensions: [
        Node.create({ name: 'doc', topNode: true, content: 'block+' }),
        Node.create({ name: 'text', group: 'inline' }),
        Node.create({ name: 'paragraph', group: 'block', content: 'inline*', renderHTML: () => ['p', 0] }),
        EmbedNode.configure({ providers: [{ buildView: async () => await pending }] })
      ],
      content: { type: 'doc', content: [{ type: 'embed', attrs: { src: 'https://example.com' } }] }
    })
  }

  afterEach(() => {
    editor.destroy()
  })

  async function finishLoading (): Promise<void> {
    resolveView(view)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }

  it('updates the loading state once when the provider finishes', async () => {
    editor = createEditor()
    await finishLoading()
    expect(jest.mocked(setLoadingState).mock.calls.map(([, pos, loading]) => [pos, loading])).toEqual([
      [0, true],
      [0, false]
    ])
    expect(view).toHaveBeenCalledTimes(1)
  })

  it('does not update position zero or mount a view after the embed is removed', async () => {
    editor = createEditor()
    await Promise.resolve()
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] })
    jest.mocked(setLoadingState).mockClear()
    await finishLoading()
    expect(view).not.toHaveBeenCalled()
    expect(setLoadingState).not.toHaveBeenCalled()
  })

  it('does not start loading after the editor is destroyed', async () => {
    editor = createEditor()
    editor.destroy()
    await finishLoading()
    expect(view).not.toHaveBeenCalled()
    expect(setLoadingState).not.toHaveBeenCalled()
  })
})
