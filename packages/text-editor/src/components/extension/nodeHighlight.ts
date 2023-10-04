import { Extension, mergeAttributes } from '@tiptap/core'
import { NodeUuidExtension, NodeUuidOptions } from './nodeUuid'

export enum NodeHighlightType {
  WARNING = 'warning',
  ADD = 'add',
  DELETE = 'delete'
}
export interface NodeHighlightExtensionOptions extends NodeUuidOptions {
  getNodeHighlightType: (uuid: string) => NodeHighlightType | undefined | null
  isHighlightModeOn: () => boolean
}

/**
 * Extension allows to highlight nodes based on uuid
 */
export const NodeHighlightExtension: Extension<NodeHighlightExtensionOptions> =
  Extension.create<NodeHighlightExtensionOptions>({
    addExtensions () {
      const options: NodeHighlightExtensionOptions = this.options

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

                    if (type === NodeHighlightType.WARNING) {
                      classAttrs.class = 'text-editor-highlighted-node-warning'
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
