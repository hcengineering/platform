import { Extension, Range, getMarkRange, mergeAttributes } from '@tiptap/core'
import { NodeUuidExtension, NodeUuidOptions, NodeUuidStorage, findNodeUuidMark } from './nodeUuid'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export enum NodeHighlightType {
  WARNING = 'warning',
  ADD = 'add',
  DELETE = 'delete'
}
export interface NodeHighlightExtensionOptions extends NodeUuidOptions {
  getNodeHighlightType: (uuid: string) => NodeHighlightType | undefined | null
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

  const type = options.getNodeHighlightType(uuid)
  if (type === null || type === undefined) {
    return undefined
  }
  const classAttrs: { class?: string } = {}

  if (type === NodeHighlightType.WARNING) {
    classAttrs.class = 'text-editor-highlighted-node-warning'
  } else if (type === NodeHighlightType.ADD) {
    classAttrs.class = 'text-editor-highlighted-node-add'
  } else if (type === NodeHighlightType.DELETE) {
    classAttrs.class = 'text-editor-highlighted-node-delete'
  }

  return classAttrs
}

/**
 * Extension allows to highlight nodes based on uuid
 */
export const NodeHighlightExtension: Extension<NodeHighlightExtensionOptions, NodeUuidStorage> =
  Extension.create<NodeHighlightExtensionOptions>({
    addStorage (): NodeUuidStorage {
      return { activeNodeUuid: null }
    },
    addProseMirrorPlugins () {
      const options = this.options
      const storage: NodeUuidStorage = this.storage

      const plugins = [
        ...(this.parent?.() ?? []),
        new Plugin({
          key: new PluginKey('handle-node-highlight-click-plugin'),
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
          key: new PluginKey('node-highlight-click-decorations-plugin'),
          props: {
            decorations (state) {
              if (!options.isHighlightModeOn()) {
                return undefined
              }
              const decorations: Decoration[] = []
              const { doc, schema } = state
              doc.descendants((node, pos) => {
                const nodeUuidMark = findNodeUuidMark(node)

                if (nodeUuidMark !== null && nodeUuidMark !== undefined) {
                  const nodeUuid = nodeUuidMark.attrs[NodeUuidExtension.name]
                  const attributes = generateAttributes(nodeUuid, options)
                  if (attributes === null || attributes === undefined) {
                    return
                  }

                  // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
                  const range = getMarkRange(doc.resolve(pos + 1), schema.marks[NodeUuidExtension.name])
                  if (!isRange(range)) {
                    return
                  }

                  decorations.push(
                    Decoration.inline(
                      range.from,
                      range.to,
                      mergeAttributes(
                        attributes,
                        nodeUuid === storage.activeNodeUuid ? { class: 'text-editor-highlighted-node-selected' } : {}
                      )
                    )
                  )
                }
              })

              return DecorationSet.empty.add(doc, decorations)
            }
          }
        })
      ]

      return plugins
    },
    addExtensions () {
      const options: NodeHighlightExtensionOptions = this.options
      const storage: NodeUuidStorage = this.storage
      return [
        NodeUuidExtension.extend({
          addOptions (): NodeUuidOptions {
            return {
              ...this.parent?.(),
              ...options,
              onNodeSelected: (uuid: string) => {
                storage.activeNodeUuid = uuid
                options.onNodeSelected?.(uuid)
              }
            }
          }
        })
      ]
    }
  })
