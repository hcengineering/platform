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

import { type TextEditorCommand } from '@hcengineering/text-editor'
import { type Command, type CommandProps, Extension, type Range, getMarkRange, mergeAttributes } from '@tiptap/core'
import { type MarkType, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { AddMarkStep, RemoveMarkStep } from '@tiptap/pm/transform'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  QMSInlineCommentMark,
  type QMSInlineCommentMarkOptions,
  findQMSInlineCommentMark,
  getMarkUuid
} from './qmsInlineCommentMark'

export enum CommentHighlightType {
  WARNING = 'warning',
  ADD = 'add',
  DELETE = 'delete'
}

export function highlightUpdateCommand (): TextEditorCommand {
  return ({ commands }) => commands.updateHighlight()
}

export interface QMSInlineCommentExtensionOptions extends QMSInlineCommentMarkOptions {
  getNodeHighlight: (uuid: string) => { type: CommentHighlightType, isActive?: boolean } | undefined | null
  isHighlightModeOn: () => boolean
  isAutoSelect?: () => boolean
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
function isRange (range: Range | undefined | null | void): range is Range {
  return range !== null && range !== undefined
}

const generateAttributes = (
  uuid: string,
  options: QMSInlineCommentExtensionOptions
): Record<string, any> | undefined => {
  if (!options.isHighlightModeOn()) {
    return undefined
  }

  const highlight = options.getNodeHighlight(uuid)
  if (highlight === null || highlight === undefined) {
    return undefined
  }
  const classAttrs: { class?: string } = {}

  if (highlight.type === CommentHighlightType.WARNING) {
    classAttrs.class = 'text-editor-highlighted-node-warning'
  } else if (highlight.type === CommentHighlightType.ADD) {
    classAttrs.class = 'text-editor-highlighted-node-add'
  } else if (highlight.type === CommentHighlightType.DELETE) {
    classAttrs.class = 'text-editor-highlighted-node-delete'
  }

  return highlight.isActive === true
    ? mergeAttributes(classAttrs, { class: 'text-editor-highlighted-node-selected' })
    : classAttrs
}

const ExtensionName = 'qms-inline-comment'

export interface QMSInlineCommentCommands<ReturnType> {
  [ExtensionName]: {
    /**
     * Force all nodes to be re-rendered
     */
    updateHighlight: () => ReturnType
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> extends QMSInlineCommentCommands<ReturnType> {}
}

export const QMSInlineCommentExtension: Extension<QMSInlineCommentExtensionOptions> =
  Extension.create<QMSInlineCommentExtensionOptions>({
    name: ExtensionName,

    addProseMirrorPlugins () {
      const options = this.options

      const plugins = [
        ...(this.parent?.() ?? []),
        new Plugin({
          key: new PluginKey('qms-inline-comment-click-plugin'),
          props: {
            handleClick (view, pos) {
              if (!options.isHighlightModeOn() || options.isAutoSelect?.() !== true) {
                return
              }
              const { schema, doc, tr } = view.state

              const $pos = doc.resolve(pos)
              if ($pos.nodeAfter === null) {
                return false
              }

              const qmsInlineCommentMark = findQMSInlineCommentMark($pos.nodeAfter)
              if (qmsInlineCommentMark === undefined) {
                return false
              }

              const range = getMarkRange($pos, schema.marks[QMSInlineCommentMark.name], qmsInlineCommentMark.attrs)

              if (!isRange(range)) {
                return false
              }

              const { from, to } = range
              const [$start, $end] = [doc.resolve(from), doc.resolve(to)]

              view.dispatch(tr.setSelection(new TextSelection($start, $end)))

              return true
            }
          }
        }),

        new Plugin({
          key: new PluginKey('qms-inline-comment-decoration-plugin'),
          state: {
            init (_config, state): DecorationSet {
              const { doc, schema } = state
              const markType = schema.marks[QMSInlineCommentMark.name]
              return createDecorations(doc, markType, options)
            },

            apply (tr, decorations, oldState, newState) {
              const markType = newState.schema.marks[QMSInlineCommentMark.name]

              if (tr.getMeta(ExtensionName) !== undefined) {
                return createDecorations(tr.doc, markType, options)
              }

              if (!tr.docChanged) {
                return decorations.map(tr.mapping, tr.doc)
              }

              // update all decorations when transaction has mark changes
              if (
                tr.steps.some(
                  (step) =>
                    (step instanceof AddMarkStep && step.mark.type === markType) ||
                    (step instanceof RemoveMarkStep && step.mark.type === markType)
                )
              ) {
                return createDecorations(tr.doc, markType, options)
              }

              // update all decorations when changed content has mark changes
              let hasMarkChanges = false
              tr.mapping.maps.forEach((map, index) => {
                if (hasMarkChanges) return

                map.forEach((oldStart, oldEnd, newStart, newEnd) => {
                  const oldDoc = tr.docs[index]
                  const newDoc = tr.docs[index + 1] ?? tr.doc

                  if (
                    oldDoc.rangeHasMark(oldStart, oldEnd, markType) !== newDoc.rangeHasMark(newStart, newEnd, markType)
                  ) {
                    hasMarkChanges = true
                  }
                })
              })

              if (hasMarkChanges) {
                return createDecorations(tr.doc, markType, options)
              }

              return decorations.map(tr.mapping, tr.doc)
            }
          },
          props: {
            decorations (state) {
              return this.getState(state)
            }
          }
        })
      ]

      return plugins
    },

    addCommands () {
      const result: QMSInlineCommentCommands<Command>[typeof ExtensionName] = {
        updateHighlight:
          () =>
            ({ view: { dispatch, state } }: CommandProps) => {
              dispatch(state.tr.setMeta(ExtensionName, ''))
              return true
            }
      }

      return result
    },

    addExtensions () {
      const options: QMSInlineCommentExtensionOptions = this.options
      return [
        QMSInlineCommentMark.extend({
          addOptions (): QMSInlineCommentMarkOptions {
            return {
              ...this.parent?.(),
              ...options
            }
          }
        })
      ]
    }
  })

const createDecorations = (
  doc: ProseMirrorNode,
  markType: MarkType,
  options: QMSInlineCommentExtensionOptions
): DecorationSet => {
  const decorations: Decoration[] = []

  doc.descendants((descendant, pos) => {
    descendant.marks.forEach((mark) => {
      const uuid = getMarkUuid(mark)
      if (uuid !== undefined) {
        const attributes = generateAttributes(uuid, options)
        if (attributes === null || attributes === undefined) {
          return
        }

        // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
        const range = getMarkRange(doc.resolve(pos + 1), markType, mark.attrs)
        if (!isRange(range)) {
          return
        }

        decorations.push(Decoration.inline(range.from, range.to, attributes))
      }
    })
  })

  return DecorationSet.create(doc, decorations)
}
