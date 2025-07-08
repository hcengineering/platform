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

import {
  type CommandProps,
  type Editor,
  Mark,
  getMarkRange,
  getMarkType,
  getMarksBetween,
  mergeAttributes
} from '@tiptap/core'
import { type Node, type Mark as ProseMirrorMark } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

export const qmsInlineCommentMarkName = 'node-uuid'
export const nodeElementQuerySelector = (nodeUuid: string): string => `span[${qmsInlineCommentMarkName}='${nodeUuid}']`

export interface QMSInlineCommentMarkOptions {
  HTMLAttributes: Record<string, any>
  onNodeSelected?: (uuid: string | null) => void
  onNodeClicked?: (uuid: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    [qmsInlineCommentMarkName]: {
      setQMSInlineCommentMark: (uuid: string) => ReturnType
      unsetQMSInlineCommentMark: () => ReturnType
    }
  }
}

export interface QMSInlineCommentMarkStorage {
  activeQMSInlineComment: string | null
}

const findSelectionQMSInlineCommentMark = (state: EditorState): ProseMirrorMark | undefined => {
  const { doc, selection } = state

  if (selection === null || selection === undefined) {
    return
  }

  let nodeUuidMark: ProseMirrorMark | undefined
  for (const range of selection.ranges) {
    if (nodeUuidMark === undefined) {
      doc.nodesBetween(range.$from.pos, range.$to.pos, (node) => {
        if (nodeUuidMark !== undefined) {
          return false
        }
        nodeUuidMark = findQMSInlineCommentMark(node)
      })
    }
  }

  return nodeUuidMark
}

export const findQMSInlineCommentMark = (node: Node): ProseMirrorMark | undefined => {
  if (node === null || node === undefined) {
    return
  }

  return node.marks.find((mark) => mark.type.name === qmsInlineCommentMarkName && mark.attrs[qmsInlineCommentMarkName])
}

export function getNodeElement (editor: Editor, uuid: string): Element | null {
  if (editor === undefined || uuid === '') {
    return null
  }

  return editor.view.dom.querySelector(nodeElementQuerySelector(uuid))
}

export function selectNode (editor: Editor, uuid: string): void {
  if (editor === undefined) {
    return
  }

  const { doc, schema, tr } = editor.view.state
  let foundNode = false
  doc.descendants((node, pos) => {
    if (foundNode) {
      return false
    }

    const nodeUuidMark = node.marks.find(
      (mark) => mark.type.name === QMSInlineCommentMark.name && mark.attrs[QMSInlineCommentMark.name] === uuid
    )

    if (nodeUuidMark === undefined) {
      return
    }

    foundNode = true

    // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
    const range = getMarkRange(doc.resolve(pos + 1), schema.marks[QMSInlineCommentMark.name])

    if (range == null || typeof range !== 'object') {
      return false
    }

    const [$start, $end] = [doc.resolve(range.from), doc.resolve(range.to)]
    editor?.view.dispatch(tr.setSelection(new TextSelection($start, $end)))
    editor.commands.focus()
  })
}

export const QMSInlineCommentMark = Mark.create<QMSInlineCommentMarkOptions, QMSInlineCommentMarkStorage>({
  name: qmsInlineCommentMarkName,
  exitable: true,
  inclusive: false,
  addOptions () {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes () {
    return {
      [qmsInlineCommentMarkName]: {
        default: null,
        parseHTML: (el) => (el as HTMLSpanElement).getAttribute(qmsInlineCommentMarkName)
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[${qmsInlineCommentMarkName}]`,
        getAttrs: (el) => {
          const value = (el as HTMLSpanElement).getAttribute(qmsInlineCommentMarkName)?.trim()
          if (value === null || value === undefined || value.length === 0) {
            return false
          }

          return null
        }
      }
    ]
  },

  renderHTML ({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addProseMirrorPlugins () {
    const options = this.options
    const storage: QMSInlineCommentMarkStorage = this.storage
    const plugins = [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('handle-qms-inline-comment-click-plugin'),
        props: {
          handleClick (view, pos) {
            const from = Math.max(0, pos - 1)
            const to = Math.min(view.state.doc.content.size, pos + 1)
            const markRanges =
              getMarksBetween(from, to, view.state.doc)?.filter(
                (markRange) =>
                  markRange.mark.type.name === qmsInlineCommentMarkName && markRange.from <= pos && markRange.to >= pos
              ) ?? []
            let nodeUuid: string | null = null

            if (markRanges.length > 0) {
              nodeUuid = markRanges[0].mark.attrs[qmsInlineCommentMarkName]
            }

            if (nodeUuid !== null) {
              options.onNodeClicked?.(nodeUuid)
            }

            if (storage.activeQMSInlineComment !== nodeUuid) {
              storage.activeQMSInlineComment = nodeUuid
              options.onNodeSelected?.(storage.activeQMSInlineComment)
            }
          }
        }
      })
    ]

    return plugins
  },

  addCommands () {
    return {
      setQMSInlineCommentMark:
        (uuid: string) =>
          ({ commands, state }: CommandProps) => {
            const { doc, selection } = state
            if (selection.empty) {
              return false
            }
            if (doc.rangeHasMark(selection.from, selection.to, getMarkType(qmsInlineCommentMarkName, state.schema))) {
              return false
            }

            return commands.setMark(this.name, { [qmsInlineCommentMarkName]: uuid })
          },
      unsetQMSInlineCommentMark:
        () =>
          ({ commands }: CommandProps) =>
            commands.unsetMark(this.name)
    }
  },

  addStorage () {
    return {
      activeQMSInlineComment: null
    }
  },

  onSelectionUpdate () {
    const activeQMSInlineCommentMark = findSelectionQMSInlineCommentMark(this.editor.state)
    const activeQMSInlineComment =
      activeQMSInlineCommentMark !== null && activeQMSInlineCommentMark !== undefined
        ? activeQMSInlineCommentMark.attrs[qmsInlineCommentMarkName]
        : null

    if (this.storage.activeQMSInlineComment !== activeQMSInlineComment) {
      this.storage.activeQMSInlineComment = activeQMSInlineComment
      this.options.onNodeSelected?.(this.storage.activeQMSInlineComment)
    }
  }
})
