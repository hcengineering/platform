import { Extension, Range, getMarkRange, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { NodeUuidExtension, NodeUuidOptions } from './nodeUuid'

export enum NodeHighlightType {
  INFO = 'info',
  ADD = 'add',
  DELETE = 'delete'
}
export interface NodeHighlightExtensionOptions extends NodeUuidOptions {
  getNodeHighlightType: (uuid: string) => NodeHighlightType | undefined | null
  isHighlightModeOn: () => boolean
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
function isRange (range: Range | undefined | null | void): range is Range {
  return range !== null && range !== undefined
}

/**
 * Extension allows to highlight nodes based on uuid
 */
export const NodeHighlightExtension: Extension<NodeHighlightExtensionOptions> =
  Extension.create<NodeHighlightExtensionOptions>({
    addProseMirrorPlugins () {
      const options = this.options
      const plugins = [
        ...(this.parent?.() ?? []),
        new Plugin({
          key: new PluginKey('handle-node-highlight-click-plugin'),
          props: {
            handleClick (view, pos) {
              if (!options.isHighlightModeOn()) {
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
        })
      ]

      return plugins
    },

    addExtensions () {
      const options = this.options

      return [
        NodeUuidExtension.extend({
          addOptions () {
            return {
              ...this.parent?.(),
              ...options
            }
          },
          addAttributes () {
            return {
              [NodeUuidExtension.name]: {
                renderHTML: (attrs) => {
                  // get uuid from parent mark (NodeUuidExtension) attributes
                  const uuid = attrs[NodeUuidExtension.name]
                  const classAttrs: { class?: string } = {}

                  if (options.isHighlightModeOn()) {
                    const type = options.getNodeHighlightType(uuid)

                    if (type === NodeHighlightType.INFO) {
                      classAttrs.class = 'text-editor-highlighted-node-info'
                    } else if (type === NodeHighlightType.ADD) {
                      classAttrs.class = 'text-editor-highlighted-node-add'
                    } else if (type === NodeHighlightType.DELETE) {
                      classAttrs.class = 'text-editor-highlighted-node-delete'
                    }
                  }

                  return mergeAttributes(attrs, classAttrs)
                }
              }
            }
          }
        })
      ]
    }
  })
