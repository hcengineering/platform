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

import { isAtStartOfNode, isNodeActive, type Editor } from '@tiptap/core'
import ListKeymap, { listHelpers, type ListKeymapOptions } from '@tiptap/extension-list-keymap'
import { type ResolvedPos, type Node } from '@tiptap/pm/model'
import { type EditorState } from '@tiptap/pm/state'

/**
 * Workaround for the original ListKeymap extension issue that
 * https://github.com/ueberdosis/tiptap/issues/4368
 */
export const ListKeymapExtension = ListKeymap.extend<ListKeymapOptions>({
  addKeyboardShortcuts () {
    const handleBackspace = (editor: Editor): boolean => {
      let handled = false

      if (!editor.state.selection.empty) {
        return false
      }

      this.options.listTypes.forEach(({ itemName, wrapperNames }) => {
        if (editor.state.schema.nodes[itemName] === undefined) {
          return
        }
        if (handleListItemBackspace(editor, itemName, wrapperNames)) {
          handled = true
        }
      })

      return handled
    }

    const handleDelete = (editor: Editor): boolean => {
      let handled = false

      if (!editor.state.selection.empty) {
        return false
      }

      this.options.listTypes.forEach(({ itemName }) => {
        if (editor.state.schema.nodes[itemName] === undefined) {
          return
        }
        if (listHelpers.handleDelete(editor, itemName)) {
          handled = true
        }
      })

      return handled
    }

    const handleBackspaceSafe = (editor: Editor): boolean => {
      try {
        return handleBackspace(editor)
      } catch (e) {
        console.log(e)
        return false
      }
    }

    const handleDeleteSafe = (editor: Editor): boolean => {
      try {
        return handleDelete(editor)
      } catch (e) {
        console.log(e)
        return false
      }
    }

    return {
      Backspace: ({ editor }) => handleBackspaceSafe(editor),
      'Mod-Backspace': ({ editor }) => handleBackspaceSafe(editor),
      Delete: ({ editor }) => handleDeleteSafe(editor),
      'Mod-Delete': ({ editor }) => handleDeleteSafe(editor)
    }
  }
})

export const handleListItemBackspace = (editor: Editor, name: string, parentListTypes: string[]): boolean => {
  // this is required to still handle the undo handling
  if (editor.commands.undoInputRule()) {
    return true
  }

  // if the selection is not collapsed
  // we can rely on the default backspace behavior
  if (editor.state.selection.from !== editor.state.selection.to) {
    return false
  }

  // if the current item is NOT inside a list item &
  // the previous item is a list (orderedList or bulletList)
  // move the cursor into the list and delete the current item
  if (!isNodeActive(editor.state, name) && listHelpers.hasListBefore(editor.state, name, parentListTypes)) {
    const { $anchor } = editor.state.selection

    const $listPos = editor.state.doc.resolve($anchor.before() - 1)

    const listDescendants: Array<{ node: Node, pos: number }> = []

    $listPos.node().descendants((node, pos) => {
      if (node.type.isInGroup('listItems')) {
        listDescendants.push({ node, pos })
      }
    })

    const lastItem = listDescendants.at(-1)

    if (lastItem === undefined) {
      return false
    }

    const $lastItemPos = editor.state.doc.resolve($listPos.start() + lastItem.pos + 1)

    return editor
      .chain()
      .cut({ from: $anchor.start() - 1, to: $anchor.end() + 1 }, $lastItemPos.end())
      .joinForward()
      .run()
  }

  // if the cursor is not inside the current node type
  // do nothing and proceed
  if (!isNodeActive(editor.state, name)) {
    return false
  }

  const $from = editor.state.selection.$from
  const parentOffset = $from.depth > 0 ? $from.index($from.depth - 1) : 0

  // if the cursor is not at the start of a node
  // do nothing and proceed
  if (!isAtStartOfNode(editor.state) || parentOffset > 0) {
    return false
  }

  const listItemPos = findListItemPos(editor.state)
  if (listItemPos === null) {
    return false
  }

  const $prev = editor.state.doc.resolve(listItemPos.$pos.pos - 2)
  const prevNode = $prev.node(listItemPos.depth)

  const previousListItemHasSubList = listItemHasSubList(prevNode)

  if (hasListItemBefore(editor.state)) {
    // if the previous item is a list item and doesn't have a sublist, join the list items
    if (!previousListItemHasSubList) {
      return editor.commands.joinItemBackward()
    } else {
      return editor.chain().sinkListItem(name).joinItemBackward().run()
    }
  }

  // otherwise in the end, a backspace should
  // always just lift the list item if
  // joining / merging is not possible
  return editor.chain().liftListItem(name).run()
}

const findListItemPos = (state: EditorState): { $pos: ResolvedPos, depth: number } | null => {
  const { $from } = state.selection

  let currentNode = null
  let currentDepth = $from.depth
  let currentPos = $from.pos
  let targetDepth: number | null = null

  while (currentDepth > 0 && targetDepth === null) {
    currentNode = $from.node(currentDepth)

    if (currentNode.type.isInGroup('listItems')) {
      targetDepth = currentDepth
    } else {
      currentDepth -= 1
      currentPos -= 1
    }
  }

  if (targetDepth === null) {
    return null
  }

  return { $pos: state.doc.resolve(currentPos), depth: targetDepth }
}

const listItemHasSubList = (node?: Node): boolean => {
  if (node === undefined) {
    return false
  }

  let hasSubList = false

  node.descendants((child) => {
    if (child.type.isInGroup('listItems')) {
      hasSubList = true
    }
  })

  return hasSubList
}

const hasListItemBefore = (state: EditorState): boolean => {
  const { $anchor } = state.selection

  const $targetPos = state.doc.resolve($anchor.pos - 2)

  if ($targetPos.index() === 0) {
    return false
  }

  if (!($targetPos.nodeBefore?.type.isInGroup('listItems') ?? false)) {
    return false
  }

  return true
}
