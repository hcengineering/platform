import { type Command, type CommandProps, Extension, type Range, getMarkRange, mergeAttributes } from '@tiptap/core'
import { type Node as ProseMirrorNode, type MarkType } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { AddMarkStep, RemoveMarkStep } from '@tiptap/pm/transform'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { NodeUuidExtension, type NodeUuidOptions, findNodeUuidMark } from './nodeUuid'
import { type TextEditorCommand } from '../../types'

export enum NodeHighlightType {
  WARNING = 'warning',
  ADD = 'add',
  DELETE = 'delete'
}

export function highlightUpdateCommand (): TextEditorCommand {
  return ({ commands }) => commands.updateHighlight()
}

export interface NodeHighlightExtensionOptions extends NodeUuidOptions {
  getNodeHighlight: (uuid: string) => { type: NodeHighlightType, isActive?: boolean } | undefined | null
  isHighlightModeOn: () => boolean
  isAutoSelect?: () => boolean
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
function isRange (range: Range | undefined | null | void): range is Range {
  return range !== null && range !== undefined
}

const generateAttributes = (uuid: string, options: NodeHighlightExtensionOptions): Record<string, any> | undefined => {
  if (!options.isHighlightModeOn()) {
    return undefined
  }

  const highlight = options.getNodeHighlight(uuid)
  if (highlight === null || highlight === undefined) {
    return undefined
  }
  const classAttrs: { class?: string } = {}

  if (highlight.type === NodeHighlightType.WARNING) {
    classAttrs.class = 'text-editor-highlighted-node-warning'
  } else if (highlight.type === NodeHighlightType.ADD) {
    classAttrs.class = 'text-editor-highlighted-node-add'
  } else if (highlight.type === NodeHighlightType.DELETE) {
    classAttrs.class = 'text-editor-highlighted-node-delete'
  }

  return highlight.isActive === true
    ? mergeAttributes(classAttrs, { class: 'text-editor-highlighted-node-selected' })
    : classAttrs
}

const NodeHighlight = 'node-highlight'

const NodeHighlightMeta = 'node-highlight'

export interface NodeHighlightCommands<ReturnType> {
  [NodeHighlight]: {
    /**
     * Force all nodes to be re-rendered
     */
    updateHighlight: () => ReturnType
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> extends NodeHighlightCommands<ReturnType> {}
}

/**
 * Extension allows to highlight nodes based on uuid
 */
export const NodeHighlightExtension: Extension<NodeHighlightExtensionOptions> =
  Extension.create<NodeHighlightExtensionOptions>({
    name: NodeHighlight,

    addProseMirrorPlugins () {
      const options = this.options

      const plugins = [
        ...(this.parent?.() ?? []),
        new Plugin({
          key: new PluginKey('node-highlight-click-plugin'),
          props: {
            handleClick (view, pos) {
              if (!options.isHighlightModeOn() || options.isAutoSelect?.() !== true) {
                return
              }
              const { schema, doc, tr } = view.state

              const range = getMarkRange(doc.resolve(pos), schema.marks[NodeUuidExtension.name])

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
          key: new PluginKey('node-highlight-decoration-plugin'),
          state: {
            init (_config, state): DecorationSet {
              const { doc, schema } = state
              const markType = schema.marks[NodeUuidExtension.name]
              return createDecorations(doc, markType, options)
            },

            apply (tr, decorations, oldState, newState) {
              const markType = newState.schema.marks[NodeUuidExtension.name]

              if (tr.getMeta(NodeHighlightMeta) !== undefined) {
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
      const result: NodeHighlightCommands<Command>[typeof NodeHighlight] = {
        updateHighlight:
          () =>
            ({ view: { dispatch, state } }: CommandProps) => {
              dispatch(state.tr.setMeta(NodeHighlightMeta, ''))
              return true
            }
      }

      return result
    },

    addExtensions () {
      const options: NodeHighlightExtensionOptions = this.options
      return [
        NodeUuidExtension.extend({
          addOptions (): NodeUuidOptions {
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
  options: NodeHighlightExtensionOptions
): DecorationSet => {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    const nodeUuidMark = findNodeUuidMark(node)

    if (nodeUuidMark !== null && nodeUuidMark !== undefined) {
      const nodeUuid = nodeUuidMark.attrs[NodeUuidExtension.name]
      const attributes = generateAttributes(nodeUuid, options)
      if (attributes === null || attributes === undefined) {
        return
      }

      // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
      const range = getMarkRange(doc.resolve(pos + 1), markType)
      if (!isRange(range)) {
        return
      }

      decorations.push(Decoration.inline(range.from, range.to, attributes))
    }
  })

  return DecorationSet.create(doc, decorations)
}
