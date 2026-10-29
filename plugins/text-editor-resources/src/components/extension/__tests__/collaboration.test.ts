//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type Node, Schema } from '@tiptap/pm/model'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'

import { getChangedRange, revealChange } from '../collaboration'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] }
  }
})

function makeDoc (...paragraphs: string[]): Node {
  return schema.node(
    'doc',
    undefined,
    paragraphs.map((text) => schema.node('paragraph', undefined, text.length > 0 ? schema.text(text) : []))
  )
}

describe('getChangedRange', () => {
  it('returns null for equal documents', () => {
    expect(getChangedRange(makeDoc('one', 'two'), makeDoc('one', 'two'))).toBeNull()
  })

  it('returns a collapsed range where text was removed', () => {
    // "two!" -> "two": the removed "!" was at position 9 (after "two" in the second paragraph)
    expect(getChangedRange(makeDoc('one', 'two!'), makeDoc('one', 'two'))).toEqual({ from: 9, to: 9 })
  })

  it('returns the inserted range in the new document', () => {
    expect(getChangedRange(makeDoc('one', 'two'), makeDoc('one', 'two', 'three'))).toEqual({ from: 10, to: 17 })
  })

  it('handles changes next to identical content', () => {
    expect(getChangedRange(makeDoc('aa'), makeDoc('a'))).toEqual({ from: 2, to: 2 })
    expect(getChangedRange(makeDoc('a'), makeDoc('aa'))).toEqual({ from: 2, to: 3 })
  })
})

describe('revealChange', () => {
  function makeView (state: EditorState): { state: EditorState, dispatch: jest.Mock } {
    const view = {
      state,
      dispatch: jest.fn((tr: Transaction) => {
        view.state = view.state.apply(tr)
      })
    }
    return view
  }

  it('moves the cursor to the changed place and scrolls it into view', () => {
    const before = makeDoc('top', 'bottom!')
    const doc = makeDoc('top', 'bottom')
    const view = makeView(EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1) }))

    revealChange(view as any, before)

    expect(view.dispatch).toHaveBeenCalledTimes(1)
    const tr: Transaction = view.dispatch.mock.calls[0][0]
    expect(tr.scrolledIntoView).toBe(true)
    expect(tr.getMeta('addToHistory')).toBe(false)
    expect(view.state.selection.from).toBe(12)
    expect(view.state.selection.empty).toBe(true)
  })

  it('does nothing when the document did not change', () => {
    const doc = makeDoc('top', 'bottom')
    const view = makeView(EditorState.create({ schema, doc }))

    revealChange(view as any, doc)

    expect(view.dispatch).not.toHaveBeenCalled()
  })
})
