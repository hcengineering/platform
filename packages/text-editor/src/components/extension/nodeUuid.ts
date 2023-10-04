import { Mark, getMarkAttributes, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

const NAME = 'node-uuid'

export interface NodeUuidOptions {
  HTMLAttributes: Record<string, any>
  onNodeSelected?: (uuid: string | null) => void
  onNodeClicked?: (uuid: string) => void
}

export interface NodeUuidCommands<ReturnType> {
  [NAME]: {
    /**
     * Add uuid mark
     */
    setUuid: (uuid: string) => ReturnType
    /**
     * Unset uuid mark
     */
    unsetUuid: () => ReturnType
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> extends NodeUuidCommands<ReturnType> {}
}

export interface NodeUuidStorage {
  activeNodeUuid: string | null
}

/**
 * This mark allows to add node uuid to the selected text
 * Creates span node with attribute node-uuid
 */
export const NodeUuidExtension = Mark.create<NodeUuidOptions, NodeUuidStorage>({
  name: NAME,
  addOptions () {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes () {
    return {
      [NAME]: {
        default: null,
        parseHTML: (el) => (el as HTMLSpanElement).getAttribute(NAME)
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[${NAME}]`,
        getAttrs: (el) => {
          const value = (el as HTMLSpanElement).getAttribute(NAME)?.trim()
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
    const storage = this.storage
    const plugins = [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('handle-node-uuid-click-plugin'),
        props: {
          handleClick (view) {
            const { schema } = view.state

            const attrs = getMarkAttributes(view.state, schema.marks[NAME])
            const nodeUuid = attrs?.[NAME]
            if (nodeUuid !== null || nodeUuid !== undefined) {
              options.onNodeClicked?.(nodeUuid)
            }

            if (storage.activeNodeUuid !== nodeUuid) {
              storage.activeNodeUuid = nodeUuid
              options.onNodeSelected?.(storage.activeNodeUuid)
            }
          }
        }
      })
    ]

    return plugins
  },

  addCommands () {
    return {
      setUuid:
        (uuid: string) =>
          ({ commands }) =>
            commands.setMark(this.name, { [NAME]: uuid }),
      unsetUuid:
        () =>
          ({ commands }) =>
            commands.unsetMark(this.name)
    }
  },

  addStorage () {
    return {
      activeNodeUuid: null
    }
  },

  onSelectionUpdate () {
    const { $head } = this.editor.state.selection

    const marks = $head.marks()
    let activeNodeUuid = null
    if (marks.length > 0) {
      const nodeUuidMark = this.editor.schema.marks[NAME]
      const activeNodeUuidMark = marks.find((mark) => mark.type === nodeUuidMark)

      if (activeNodeUuidMark !== undefined && activeNodeUuidMark !== null) {
        activeNodeUuid = activeNodeUuidMark.attrs[NAME]
      }
    }

    if (this.storage.activeNodeUuid !== activeNodeUuid) {
      this.storage.activeNodeUuid = activeNodeUuid
      this.options.onNodeSelected?.(this.storage.activeNodeUuid)
    }
  }
})
