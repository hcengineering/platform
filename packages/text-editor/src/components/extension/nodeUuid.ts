import { Mark, mergeAttributes } from '@tiptap/core'

const NAME = 'node-uuid'

export interface NodeUuidOptions {
  HTMLAttributes: Record<string, any>
  onNodeSelected?: (uuid: string | null) => any
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
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
    this.storage.activeNodeUuid = null
    if (marks.length > 0) {
      const nodeUuidMark = this.editor.schema.marks[NAME]
      const activeNodeUuidMark = marks.find((mark) => mark.type === nodeUuidMark)

      if (activeNodeUuidMark !== undefined && activeNodeUuidMark !== null) {
        this.storage.activeNodeUuid = activeNodeUuidMark.attrs[NAME]
      }
    }

    this.options.onNodeSelected?.(this.storage.activeNodeUuid)
  }
})
