import { Extension, getMarkRange, mergeAttributes, Range } from '@tiptap/core'
import { Plugin, TextSelection } from 'prosemirror-state'
import { NodeUuidExtension, NodeUuidOptions } from './nodeUuid'

export enum NodeHighlightType {
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error'
}
interface NodeHighlightExtensionOptions extends NodeUuidOptions {
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
export const NodeHighlightExtension = Extension.create<NodeHighlightExtensionOptions>({
  addProseMirrorPlugins () {
    const options = this.options
    const plugins = [
      new Plugin({
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

            const [$start, $end] = [doc.resolve(range.from), doc.resolve(range.to)]

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

                  if (type === NodeHighlightType.ERROR) {
                    classAttrs.class = 'text-editor-highlighted-node-error'
                  } else if (type === NodeHighlightType.WARNING) {
                    classAttrs.class = 'text-editor-highlighted-node-warning'
                  } else if (type === NodeHighlightType.SUCCESS) {
                    classAttrs.class = 'text-editor-highlighted-node-success'
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
