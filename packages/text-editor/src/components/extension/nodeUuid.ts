import { Command, CommandProps, Mark, getMarkType, mergeAttributes } from '@tiptap/core'
import { Node, Mark as ProseMirrorMark } from 'prosemirror-model'
import { EditorState, Plugin, PluginKey } from 'prosemirror-state'

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

const findSelectionNodeUuidMark = (state: EditorState): ProseMirrorMark | undefined => {
  const { doc, selection } = state

  if (selection === null || selection === undefined) {
    return
  }

  let nodeUuidMark: ProseMirrorMark | undefined
  for (const range of selection.ranges) {
    if (nodeUuidMark === undefined) {
      doc.nodesBetween(range.$from.pos, range.$to.pos, (node) => {
        if (nodeUuidMark !== undefined) {
          return false
        }
        nodeUuidMark = findNodeUuidMark(node)
      })
    }
  }

  return nodeUuidMark
}

export const findNodeUuidMark = (node: Node): ProseMirrorMark | undefined => {
  if (node === null || node === undefined) {
    return
  }

  return node.marks.find((mark) => mark.type.name === NAME && mark.attrs[NAME])
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
    const storage: NodeUuidStorage = this.storage
    const plugins = [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('handle-node-uuid-click-plugin'),
        props: {
          handleClick (view, pos) {
            const { doc } = view.state
            const node = doc.nodeAt(pos)
            const nodeUuidMark = node != null ? findNodeUuidMark(node) : undefined

            const nodeUuid = nodeUuidMark != null ? nodeUuidMark.attrs[NAME] : null
            if (nodeUuid !== null) {
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

            return commands.setMark(this.name, { [NAME]: uuid })
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
    const activeNodeUuidMark = findSelectionNodeUuidMark(this.editor.state)
    const activeNodeUuid =
      activeNodeUuidMark !== null && activeNodeUuidMark !== undefined ? activeNodeUuidMark.attrs[NAME] : null

    if (this.storage.activeNodeUuid !== activeNodeUuid) {
      this.storage.activeNodeUuid = activeNodeUuid
      this.options.onNodeSelected?.(this.storage.activeNodeUuid)
    }
  }
})
