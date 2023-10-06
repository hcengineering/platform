import { Command, CommandProps, Mark, getMarkAttributes, getMarkType, mergeAttributes } from '@tiptap/core'
import { Mark as ProseMirrorMark } from 'prosemirror-model'
import { EditorState, Plugin, PluginKey } from 'prosemirror-state'

const NAME = 'node-uuid'

export interface NodeUuidOptions {
  HTMLAttributes: Record<string, any>
  onNodeAttributes?: (uuid: string) => Record<string, any> | undefined
  onNodeSelected?: (uuid: string | null) => void
  onNodeClicked?: (uuid: string) => void
}

export interface NodeUuidCommands<ReturnType> {
  [NAME]: {
    /**
     * Add uuid mark
     */
    setNodeUuid: (uuid: string) => ReturnType
    /**
     * Unset uuid mark
     */
    unsetNodeUuid: () => ReturnType
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> extends NodeUuidCommands<ReturnType> {}
}

export interface NodeUuidStorage {
  activeNodeUuid: string | null
}

const generateNodeUuidAttributes = (uuid: string | undefined, options: NodeUuidOptions): Record<string, any> => {
  if (!uuid) {
    return {}
  }

  return mergeAttributes(options.onNodeAttributes?.(uuid) ?? {}, { [NAME]: uuid })
}

const findNodeUuidMark = (state: EditorState): ProseMirrorMark | undefined => {
  if (!state.selection) {
    return
  }

  let nodeUuidMark: ProseMirrorMark | undefined
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
    if (nodeUuidMark != null) {
      return false
    }
    nodeUuidMark = node.marks.find((mark) => mark.type.name === NAME && mark.attrs[NAME])
  })

  return nodeUuidMark
}

/**
 * This extension allows to add node uuid to the selected text
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
        parseHTML: (el) => (el as HTMLSpanElement).getAttribute(NAME),
        renderHTML: (attrs) => {
          const uuid: string | undefined = attrs[NAME]

          return mergeAttributes(attrs, generateNodeUuidAttributes(uuid, this.options))
        }
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
    const storage: NodeUuidStorage = this.storage
    const plugins = [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('handle-node-uuid-click-plugin'),
        props: {
          handleClick (view) {
            const attrs = getMarkAttributes(view.state, view.state.schema.marks[NAME])
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
    const result: NodeUuidCommands<Command>[typeof NAME] = {
      setNodeUuid:
        (uuid: string) =>
          ({ commands, state }: CommandProps) => {
            const { doc, selection } = state
            if (selection.empty) {
              return false
            }
            if (doc.rangeHasMark(selection.from, selection.to, getMarkType(NAME, state.schema))) {
              return false
            }

            return commands.setMark(this.name, generateNodeUuidAttributes(uuid, this.options))
          },
      unsetNodeUuid:
        () =>
          ({ commands }: CommandProps) =>
            commands.unsetMark(this.name)
    }

    return result
  },

  addStorage () {
    return {
      activeNodeUuid: null
    }
  },

  onSelectionUpdate () {
    const activeNodeUuidMark = findNodeUuidMark(this.editor.state)
    const activeNodeUuid = (activeNodeUuidMark != null) ? activeNodeUuidMark.attrs[NAME] : null

    if (this.storage.activeNodeUuid !== activeNodeUuid) {
      this.storage.activeNodeUuid = activeNodeUuid
      this.options.onNodeSelected?.(this.storage.activeNodeUuid)
    }
  }
})
