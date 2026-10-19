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

import { type CommandProps } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import { type Node } from '@tiptap/pm/model'
import { Selection } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'

/**
 * Returns the range in `after` that differs from `before`, or null when both documents are equal.
 */
export function getChangedRange (before: Node, after: Node): { from: number, to: number } | null {
  const from = before.content.findDiffStart(after.content)
  if (from === null) return null

  const end = before.content.findDiffEnd(after.content)
  if (end === null) return { from, to: from }

  // Both ends may overlap when the change is next to identical content (e.g. "aa" -> "a")
  const overlap = from - Math.min(end.a, end.b)
  const to = overlap > 0 ? end.b + overlap : end.b
  return { from, to: Math.max(from, to) }
}

/**
 * Moves the cursor to the place changed between `before` and the current document and scrolls it into view.
 */
export function revealChange (view: EditorView, before: Node): void {
  const doc = view.state.doc
  const range = getChangedRange(before, doc)
  if (range === null) return

  const selection = Selection.near(doc.resolve(range.to), -1)
  view.dispatch(view.state.tr.setSelection(selection).scrollIntoView().setMeta('addToHistory', false))
}

// y-prosemirror restores the selection captured before the undo/redo, so a change made
// outside the viewport stays invisible. Move the cursor to the changed place instead.
function withRevealChange (command: () => (props: CommandProps) => boolean): (props: CommandProps) => boolean {
  return (props) => {
    const { view, dispatch } = props
    if (dispatch === undefined) return command()(props)

    const before = view.state.doc
    const result = command()(props)
    if (result) {
      revealChange(view, before)
    }
    return result
  }
}

export const CollaborationExtension = Collaboration.extend({
  addCommands () {
    const parent = this.parent?.()
    if (parent === undefined) return {}

    const { undo, redo } = parent
    if (undo === undefined || redo === undefined) return parent

    return {
      ...parent,
      undo: () => withRevealChange(undo),
      redo: () => withRevealChange(redo)
    }
  }
})
