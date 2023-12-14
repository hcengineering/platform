import { type Command, type CommandProps, Mark, getMarkType, getMarksBetween, mergeAttributes } from '@tiptap/core'
import { type Node, type Mark as ProseMirrorMark } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state'

const NAME = 'node-uuid'

export const nodeElementQuerySelector = (nodeUuid: string): string => `span[${NAME}='${nodeUuid}']`

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
  exitable: true,
  inclusive: false,
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
            const from = Math.max(0, pos - 1)
            const to = Math.min(view.state.doc.content.size, pos + 1)
            const markRanges =
              getMarksBetween(from, to, view.state.doc)?.filter(
                (markRange) => markRange.mark.type.name === NAME && markRange.from <= pos && markRange.to >= pos
              ) ?? []
            let nodeUuid: string | null = null

            if (markRanges.length > 0) {
              nodeUuid = markRanges[0].mark.attrs[NAME]
            }

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
