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

import { findParentNode, getNodeType, InputRule, isList, type RawCommands } from '@tiptap/core'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { Fragment, NodeRange, Slice, type NodeType } from '@tiptap/pm/model'
import { Plugin, type Command, type EditorState, type Selection, type Transaction } from '@tiptap/pm/state'
import { canJoin, findWrapping, liftTarget, ReplaceAroundStep } from '@tiptap/pm/transform'
import { type EditorView } from '@tiptap/pm/view'
import { getDataAttribute } from '../../utils'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    todoItem: {
      convertListItems: (listItemTypeOrName: string | NodeType) => ReturnType
    }
  }
}

export const TodoItemExtension = TaskItem.extend({
  name: 'todoItem',
  group: 'listItems',

  addOptions () {
    return {
      nested: true,
      HTMLAttributes: {},
      taskListTypeName: 'todoList'
    }
  },

  addCommands () {
    return {
      sinkListItem:
        (typeOrName) =>
          ({ state, dispatch }) => {
            const type = getNodeType(typeOrName, state.schema)
            return sinkListItem(type, 'listItems')(state, dispatch)
          },
      liftListItem:
        (typeOrName) =>
          ({ state, dispatch }) => {
            const type = getNodeType(typeOrName, state.schema)
            return liftListItem(type, 'listItems')(state, dispatch)
          },
      convertListItems,
      toggleList
    }
  },

  addAttributes () {
    return {
      ...this.parent?.(),
      todoid: getDataAttribute('todoid', { default: null, keepOnSplit: false }),
      userid: getDataAttribute('userid', { default: null, keepOnSplit: false })
    }
  },

  addInputRules () {
    return [todoItemInputRule()]
  },

  addProseMirrorPlugins () {
    return [...(this.parent?.() ?? []), TodoItemDowncastPlugin()]
  }
})

export const TodoListExtension = TaskList.extend({
  name: 'todoList',

  addOptions () {
    return {
      itemTypeName: 'todoItem',
      HTMLAttributes: {}
    }
  }
})

const todoItemInputRule: () => InputRule = () =>
  new InputRule({
    find: /^\s*(\[([( |x|*])?\])\s$/,
    handler: ({ state, match, range }) => {
      const attributes = {
        checked: match[match.length - 1] === 'x' || match[match.length - 1] === '*'
      }

      const type = state.schema.nodes.todoItem

      const tr = state.tr.delete(range.from, range.to)
      const $start = tr.doc.resolve(range.from)
      const blockRange = $start.blockRange()
      if (blockRange === null) return null

      const canReplaceListItem = $start.depth > 2 && $start.node($start.depth - 1).type.name === 'listItem'

      if (canReplaceListItem) {
        const listItemPos = $start.before($start.depth - 1)
        tr.setNodeMarkup(listItemPos, type, attributes)
        return
      }

      const wrapping = findWrapping(blockRange, type, attributes)
      if (wrapping === null) return null

      if (wrapping[0]?.type.name === 'bulletList') {
        wrapping[0] = { type: state.schema.nodes.todoList, attrs: null }
      }

      tr.wrap(blockRange, wrapping)
    }
  })

export function TodoItemDowncastPlugin (): Plugin {
  return new Plugin<any>({
    props: {
      handleKeyDown (view, event) {
        const tr = tryReplaceTodoItemWithListItem(view, view.state.selection, event)
        if (tr !== undefined) {
          view.dispatch(tr)
          return true
        }

        return false
      }
    }
  })
}

const allowedParentForTodoItemReplacement = ['bulletList', 'orderedList']

function tryReplaceTodoItemWithListItem (
  view: EditorView,
  selection: Selection,
  event: KeyboardEvent
): Transaction | undefined {
  if (event.code !== 'Backspace') return

  const { $from, $to } = selection
  if ($from !== $to) return
  if ($from.parent.type.name !== 'paragraph' || $from.parentOffset !== 0 || $from.depth < 3) return

  const listItemNode = $from.node($from.depth - 1)
  const listItemIndex = $from.index($from.depth - 1)

  const listNode = $from.node($from.depth - 2)

  const isBeginningOfTodoItem = listItemIndex === 0 && listItemNode.type.name === 'todoItem'

  if (!isBeginningOfTodoItem) return

  const canReplaceWithListItem = allowedParentForTodoItemReplacement.includes(listNode.type.name)

  if (!canReplaceWithListItem) return

  const todoItemPos = $from.before($from.depth - 1)
  const { tr } = view.state
  tr.setNodeMarkup(todoItemPos, view.state.schema.nodes.listItem, {})

  return tr
}

const convertListItems: RawCommands['convertListItems'] =
  (listItemTypeOrName: string | NodeType) =>
    ({ editor, chain }) => {
      const listItemType = getNodeType(listItemTypeOrName, editor.schema)
      const { extensions } = editor.extensionManager
      const { selection } = editor.state
      const { $from, $to } = selection
      const range = $from.blockRange($to)
      if (range === null) return false

      const parentList = findParentNode((node) => isList(node.type.name, extensions))(selection)
      if (parentList === undefined) return false

      let pos = parentList.pos
      for (const child of parentList.node.children) {
        let shouldConvert = false
        if (listItemType.name === 'listItem') {
          shouldConvert =
          child.type.name === 'todoItem' && child.attrs.checked !== true && typeof child.attrs.todoid !== 'string'
        } else if (listItemType.name === 'todoItem') {
          shouldConvert = child.type !== listItemType
        }
        if (shouldConvert) {
          chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(pos + 1, listItemType)
              return true
            })
            .run()
        }
        pos += child.nodeSize
      }
      return false
    }

// Fork of tiptap implementation with support for conversion-based transitions
// https://github.com/ueberdosis/tiptap/blob/f3258d9ee5fb7979102fe63434f6ea4120507311/packages/core/src/commands/toggleList.ts
const toggleList: RawCommands['toggleList'] =
  (listTypeOrName, itemTypeOrName, keepMarks, attributes = {}) =>
    ({ editor, tr, state, dispatch, chain, commands, can }) => {
      const { extensions, splittableMarks } = editor.extensionManager
      const listType = getNodeType(listTypeOrName, state.schema)
      const itemType = getNodeType(itemTypeOrName, state.schema)
      const { selection, storedMarks } = state
      const { $from, $to } = selection
      const range = $from.blockRange($to)

      const marks = storedMarks ?? (selection.$to.parentOffset !== 0 ? selection.$from.marks() : null)

      if (range === null) {
        return false
      }

      const parentList = findParentNode((node) => isList(node.type.name, extensions))(selection)

      if (range.depth >= 1 && parentList !== undefined && range.depth - parentList.depth <= 1) {
      // remove list
        if (parentList.node.type === listType) {
          return commands.liftListItem(itemType)
        }
        // change list type
        if (isList(parentList.node.type.name, extensions) && dispatch !== undefined) {
          if (listType.validContent(parentList.node.content)) {
            return chain()
              .command(() => {
                tr.setNodeMarkup(parentList.pos, listType)
                return true
              })
              .command(() => joinListBackwards(tr, listType))
              .command(() => joinListForwards(tr, listType))
              .convertListItems(itemTypeOrName)
              .run()
          }
          if (state.schema.nodes.bulletList.validContent(parentList.node.content)) {
            return chain()
              .convertListItems(itemTypeOrName)
              .command(() => {
                tr.setNodeMarkup(parentList.pos, listType)
                return true
              })
              .command(() => joinListBackwards(tr, listType))
              .command(() => joinListForwards(tr, listType))
              .run()
          }
        }
      }

      if (keepMarks !== true || marks === null || dispatch === undefined) {
        return (
          chain()
          // try to convert node to default node if needed
            .command(() => {
              const canWrapInList = can().wrapInList(listType, attributes)

              if (canWrapInList) {
                return true
              }

              return commands.clearNodes()
            })
            .wrapInList(listType, attributes)
            .command(() => joinListBackwards(tr, listType))
            .command(() => joinListForwards(tr, listType))
            .run()
        )
      }

      return (
        chain()
        // try to convert node to default node if needed
          .command(() => {
            const canWrapInList = can().wrapInList(listType, attributes)

            const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name))

            tr.ensureMarks(filteredMarks)

            if (canWrapInList) {
              return true
            }

            return commands.clearNodes()
          })
          .wrapInList(listType, attributes)
          .command(() => joinListBackwards(tr, listType))
          .command(() => joinListForwards(tr, listType))
          .run()
      )
    }

// Fork of tiptap implementation with support for conversion-based transitions
// https://github.com/ueberdosis/tiptap/blob/f3258d9ee5fb7979102fe63434f6ea4120507311/packages/core/src/commands/toggleList.ts
const joinListBackwards = (tr: Transaction, listType: NodeType): boolean => {
  const list = findParentNode((node) => node.type === listType)(tr.selection)
  if (list === undefined) {
    return true
  }

  const before = tr.doc.resolve(Math.max(0, list.pos - 1)).before(list.depth)

  if (before === undefined) {
    return true
  }

  const nodeBefore = tr.doc.nodeAt(before)
  const canJoinBackwards = list.node.type === nodeBefore?.type && canJoin(tr.doc, list.pos)

  if (!canJoinBackwards) {
    return true
  }

  tr.join(list.pos)

  return true
}

// Fork of tiptap implementation with support for conversion-based transitions
// https://github.com/ueberdosis/tiptap/blob/f3258d9ee5fb7979102fe63434f6ea4120507311/packages/core/src/commands/toggleList.ts
const joinListForwards = (tr: Transaction, listType: NodeType): boolean => {
  const list = findParentNode((node) => node.type === listType)(tr.selection)
  if (list === undefined) {
    return true
  }

  const after = tr.doc.resolve(list.start).after(list.depth)

  if (after === undefined) {
    return true
  }

  const nodeAfter = tr.doc.nodeAt(after)
  const canJoinForwards = list.node.type === nodeAfter?.type && canJoin(tr.doc, after)

  if (!canJoinForwards) {
    return true
  }

  tr.join(after)

  return true
}

// Fork of prosemiror implementation with group matching support
// https://github.com/ProseMirror/prosemirror-schema-list/blob/e65a144f2285178a20cbdea5b0ee16925be7d6c5/src/schema-list.ts
export function liftListItem (type: NodeType, group: string): Command {
  return function (state: EditorState, dispatch?: (tr: Transaction) => void) {
    const { $from, $to } = state.selection
    const range = $from.blockRange(
      $to,
      (node) => (node.childCount > 0 && node.firstChild?.type?.isInGroup(group)) ?? false
    )
    if (range === null) return false
    if (dispatch === undefined) return true
    if ($from.node(range.depth - 1).type.isInGroup(group)) {
      return liftToOuterList(state, dispatch, type, group, range)
    } else {
      return liftOutOfList(state, dispatch, range)
    }
  }
}

// Fork of prosemiror implementation with group matching support
// https://github.com/ProseMirror/prosemirror-schema-list/blob/e65a144f2285178a20cbdea5b0ee16925be7d6c5/src/schema-list.ts
function liftToOuterList (
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  type: NodeType,
  group: string,
  range: NodeRange
): boolean {
  const tr = state.tr
  const end = range.end
  const endOfList = range.$to.end(range.depth)
  if (end < endOfList) {
    // There are siblings after the lifted items, which must become
    // children of the last item
    tr.step(
      new ReplaceAroundStep(
        end - 1,
        endOfList,
        end,
        endOfList,
        new Slice(Fragment.from(type.create(null, range.parent.copy())), 1, 0),
        1,
        true
      )
    )
    range = new NodeRange(tr.doc.resolve(range.$from.pos), tr.doc.resolve(endOfList), range.depth)
  }
  const target = liftTarget(range)
  if (target == null) return false
  tr.lift(range, target)
  const $after = tr.doc.resolve(tr.mapping.map(end, -1) - 1)
  if (canJoin(tr.doc, $after.pos) && $after.nodeBefore?.type === $after.nodeAfter?.type) tr.join($after.pos)
  dispatch(tr.scrollIntoView())
  return true
}

// Fork of prosemiror implementation with group matching support
// https://github.com/ProseMirror/prosemirror-schema-list/blob/e65a144f2285178a20cbdea5b0ee16925be7d6c5/src/schema-list.ts
function liftOutOfList (state: EditorState, dispatch: (tr: Transaction) => void, range: NodeRange): boolean {
  const tr = state.tr
  const list = range.parent
  // Merge the list items into a single big item
  for (let pos = range.end, i = range.endIndex - 1, e = range.startIndex; i > e; i--) {
    pos -= list.child(i).nodeSize
    tr.delete(pos - 1, pos + 1)
  }
  const $start = tr.doc.resolve(range.start)
  const item = $start.nodeAfter
  if (tr.mapping.map(range.end) !== range.start + ($start.nodeAfter?.nodeSize ?? 0)) return false
  const atStart = range.startIndex === 0
  const atEnd = range.endIndex === list.childCount
  const parent = $start.node(-1)
  const indexBefore = $start.index(-1)
  if (
    !parent.canReplace(
      indexBefore + (atStart ? 0 : 1),
      indexBefore + 1,
      item?.content.append(atEnd ? Fragment.empty : Fragment.from(list))
    )
  ) {
    return false
  }
  const start = $start.pos
  const end = start + (item?.nodeSize ?? 0)
  // Strip off the surrounding list. At the sides where we're not at
  // the end of the list, the existing list is closed. At sides where
  // this is the end, it is overwritten to its end.
  tr.step(
    new ReplaceAroundStep(
      start - (atStart ? 1 : 0),
      end + (atEnd ? 1 : 0),
      start + 1,
      end - 1,
      new Slice(
        (atStart ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))).append(
          atEnd ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))
        ),
        atStart ? 0 : 1,
        atEnd ? 0 : 1
      ),
      atStart ? 0 : 1
    )
  )
  dispatch(tr.scrollIntoView())
  return true
}

// Fork of prosemiror implementation with group matching support
// https://github.com/ProseMirror/prosemirror-schema-list/blob/e65a144f2285178a20cbdea5b0ee16925be7d6c5/src/schema-list.ts
export function sinkListItem (itemType: NodeType, group: string): Command {
  return function (state, dispatch) {
    const { $from, $to } = state.selection

    const range = $from.blockRange(
      $to,
      (node) => (node.childCount > 0 && node.firstChild?.type.isInGroup?.(group)) ?? false
    )
    if (range === null) return false

    const startIndex = range.startIndex
    if (startIndex === 0) return false

    const parent = range.parent
    const nodeBefore = parent.child(startIndex - 1)
    if (!nodeBefore.type.isInGroup(group)) return false

    if (dispatch !== undefined) {
      const nestedBefore = nodeBefore.lastChild !== null && nodeBefore.lastChild.type === parent.type
      const inner = Fragment.from(nestedBefore ? itemType.create() : null)
      const slice = new Slice(
        Fragment.from(itemType.create(null, Fragment.from(parent.type.create(null, inner)))),
        nestedBefore ? 3 : 1,
        0
      )
      const before = range.start
      const after = range.end
      dispatch(
        state.tr
          .step(new ReplaceAroundStep(before - (nestedBefore ? 3 : 1), after, before, after, slice, 1, true))
          .scrollIntoView()
      )
    }
    return true
  }
}
