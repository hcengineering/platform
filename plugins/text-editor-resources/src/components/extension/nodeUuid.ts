import {
  type CommandProps,
  type Editor,
  Mark,
  getMarkRange,
  getMarkType,
  getMarksBetween,
  mergeAttributes
} from '@tiptap/core'
import { type Node, type Mark as ProseMirrorMark } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

export const nodeUuidName = 'node-uuid'
export const nodeElementQuerySelector = (nodeUuid: string): string => `span[${nodeUuidName}='${nodeUuid}']`

export interface NodeUuidOptions {
  HTMLAttributes: Record<string, any>
  onNodeSelected?: (uuid: string | null) => void
  onNodeClicked?: (uuid: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    [nodeUuidName]: {
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

  return node.marks.find((mark) => mark.type.name === nodeUuidName && mark.attrs[nodeUuidName])
}

export function getNodeElement (editor: Editor, uuid: string): Element | null {
  if (editor === undefined || uuid === '') {
    return null
  }

  return editor.view.dom.querySelector(nodeElementQuerySelector(uuid))
}

export function selectNode (editor: Editor, uuid: string): void {
  if (editor === undefined) {
    return
  }

  const { doc, schema, tr } = editor.view.state
  let foundNode = false
  doc.descendants((node, pos) => {
    if (foundNode) {
      return false
    }

    const nodeUuidMark = node.marks.find(
      (mark) => mark.type.name === NodeUuidExtension.name && mark.attrs[NodeUuidExtension.name] === uuid
    )

    if (nodeUuidMark === undefined) {
      return
    }

    foundNode = true

    // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
    const range = getMarkRange(doc.resolve(pos + 1), schema.marks[NodeUuidExtension.name])

    if (range == null || typeof range !== 'object') {
      return false
    }

    const [$start, $end] = [doc.resolve(range.from), doc.resolve(range.to)]
    editor?.view.dispatch(tr.setSelection(new TextSelection($start, $end)))
    editor.commands.focus()
  })
}

/**
 * This extension allows to add node uuid to the selected text
 * Creates span node with attribute node-uuid
 */
export const NodeUuidExtension = Mark.create<NodeUuidOptions, NodeUuidStorage>({
  name: nodeUuidName,
  exitable: true,
  inclusive: false,
  addOptions () {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes () {
    return {
      [nodeUuidName]: {
        default: null,
        parseHTML: (el) => (el as HTMLSpanElement).getAttribute(nodeUuidName)
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[${nodeUuidName}]`,
        getAttrs: (el) => {
          const value = (el as HTMLSpanElement).getAttribute(nodeUuidName)?.trim()
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
                (markRange) => markRange.mark.type.name === nodeUuidName && markRange.from <= pos && markRange.to >= pos
              ) ?? []
            let nodeUuid: string | null = null

            if (markRanges.length > 0) {
              nodeUuid = markRanges[0].mark.attrs[nodeUuidName]
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
    return {
      setNodeUuid:
        (uuid: string) =>
          ({ commands, state }: CommandProps) => {
            const { doc, selection } = state
            if (selection.empty) {
              return false
            }
            if (doc.rangeHasMark(selection.from, selection.to, getMarkType(nodeUuidName, state.schema))) {
              return false
            }

            return commands.setMark(this.name, { [nodeUuidName]: uuid })
          },
      unsetNodeUuid:
        () =>
          ({ commands }: CommandProps) =>
            commands.unsetMark(this.name)
    }
  },

  addStorage () {
    return {
      activeNodeUuid: null
    }
  },

  onSelectionUpdate () {
    const activeNodeUuidMark = findSelectionNodeUuidMark(this.editor.state)
    const activeNodeUuid =
      activeNodeUuidMark !== null && activeNodeUuidMark !== undefined ? activeNodeUuidMark.attrs[nodeUuidName] : null

    if (this.storage.activeNodeUuid !== activeNodeUuid) {
      this.storage.activeNodeUuid = activeNodeUuid
      this.options.onNodeSelected?.(this.storage.activeNodeUuid)
    }
  }
})
