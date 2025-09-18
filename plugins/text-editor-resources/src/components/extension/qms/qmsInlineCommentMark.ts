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

import { type CommandProps, type Editor, Mark, getMarkRange, mergeAttributes } from '@tiptap/core'
import { type Node, type Mark as ProseMirrorMark, Fragment, Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

export const qmsInlineCommentMarkName = 'node-uuid'
export const nodeElementQuerySelector = (nodeUuid: string): string => `span[${qmsInlineCommentMarkName}='${nodeUuid}']`

export interface QMSInlineCommentMarkOptions {
  HTMLAttributes: Record<string, any>
  onNodeClicked?: (uuid: string | string[]) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    [qmsInlineCommentMarkName]: {
      setQMSInlineCommentMark: (uuid: string) => ReturnType
      unsetQMSInlineCommentMark: () => ReturnType
    }
  }
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

export function selectNode (editor: Editor, uuid: string): boolean {
  if (editor === undefined) {
    return false
  }

  let foundNode = false

  const { doc, schema, tr } = editor.view.state
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

  return foundNode
}

export const QMSInlineCommentMark = Mark.create<QMSInlineCommentMarkOptions>({
  name: qmsInlineCommentMarkName,
  exitable: true,
  inclusive: false,
  // set to empty string to allow multiple marks of the same type
  // https://prosemirror.net/docs/ref/#model.MarkSpec.excludes
  excludes: '',
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

    const plugins = [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('handle-qms-inline-comment-click-plugin'),
        props: {
          handleClick (view, pos) {
            const marks = view.state.selection.$head
              .marks()
              .filter((mark) => mark.type.name === qmsInlineCommentMarkName)

            const uuids = marks
              .map((mark) => mark.attrs[qmsInlineCommentMarkName])
              .filter((uuid) => uuid !== null && uuid !== undefined && uuid.length > 0)

            if (uuids.length !== 0) {
              options.onNodeClicked?.(uuids)
            }
          }
        }
      }),
      QmsInlineCommentPastePlugin()
    ]

    return plugins
  },

  addCommands () {
    return {
      setQMSInlineCommentMark:
        (uuid: string) =>
          ({ commands, state }: CommandProps) => {
            if (state.selection.empty) {
              return false
            }
            return commands.setMark(this.name, { [qmsInlineCommentMarkName]: uuid })
          },
      unsetQMSInlineCommentMark:
        () =>
          ({ commands }: CommandProps) =>
            commands.unsetMark(this.name)
    }
  }
})

function removeMarkFromNode (node: Node, name: string): Node {
  if (node.isText) {
    return node.mark(node.marks.filter((mark) => mark.type.name !== name))
  }

  if (node.content.size > 0) {
    const nodes: Node[] = []
    node.content.forEach((child) => {
      nodes.push(removeMarkFromNode(child, name))
    })
    return node.copy(Fragment.fromArray(nodes))
  }

  return node
}

export function getMarkUuid (mark: ProseMirrorMark): string | undefined {
  return mark.type.name === qmsInlineCommentMarkName ? mark.attrs[qmsInlineCommentMarkName] : undefined
}

export function QmsInlineCommentPastePlugin (): Plugin {
  return new Plugin({
    key: new PluginKey('qms-inline-comment-paste-plugin'),
    props: {
      transformPasted: (slice, view) => {
        const pastedUuids = new Set<string>()
        slice.content.forEach((node) => {
          node.descendants((descendant) => {
            descendant.marks.forEach((mark) => {
              const uuid = getMarkUuid(mark)
              if (uuid !== undefined) {
                pastedUuids.add(uuid)
              }
            })
          })
        })

        let hasDuplicatedUuids = false
        view.state.doc.descendants((node) => {
          if (hasDuplicatedUuids) return false
          for (const mark of node.marks) {
            const uuid = getMarkUuid(mark)
            if (uuid !== undefined && pastedUuids.has(uuid)) {
              hasDuplicatedUuids = true
              break
            }
          }
        })

        if (hasDuplicatedUuids) {
          const nodes: Node[] = []
          slice.content.forEach((node) => {
            nodes.push(removeMarkFromNode(node, qmsInlineCommentMarkName))
          })
          return new Slice(Fragment.fromArray(nodes), slice.openStart, slice.openEnd)
        }

        return slice
      }
    }
  })
}
