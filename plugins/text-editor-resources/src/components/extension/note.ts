import { type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { type Node as ProseMirrorNode, type MarkType } from '@tiptap/pm/model'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { getEventPositionElement, showPopup } from '@hcengineering/ui'
import { NoteBaseExtension, type NoteKind, name as noteName } from '@hcengineering/text'

import ConfigureNotePopup from '../note/ConfigureNotePopup.svelte'
import DisplayNotePopup from '../note/DisplayNotePopup.svelte'

export interface NoteOptions {
  readonly: boolean
}

export const NoteExtension = NoteBaseExtension.extend({
  addOptions () {
    return {
      readonly: false
    }
  },

  addCommands () {
    return {
      setNote:
        (text: string, kind: NoteKind) =>
          ({ commands }) => {
            return commands.setMark(this.name, { title: text, kind })
          },
      unsetNote:
        () =>
          ({ commands }) => {
            return commands.unsetMark(this.name)
          }
    }
  },

  addProseMirrorPlugins () {
    return [
      new Plugin({
        key: new PluginKey('handle-note-open'),
        props: {
          decorations (state) {
            // Consider moving to plugin's state to improve performance by skipping
            // creating decorations on transactions that do not affect notes
            const { doc, schema } = state
            const markType = schema.marks[noteName]

            if (markType === undefined) {
              return DecorationSet.empty
            }

            return createDecorations(doc, markType)
          },
          handleKeyDown (view: EditorView, event) {
            const markType = view.state.schema.marks[noteName]

            if (markType === undefined) {
              return false
            }

            switch (event.key) {
              case 'ArrowRight':
                return onArrowRight(view, markType)
              default:
                return false
            }
          }
        }
      })
    ]
  }
})

function onArrowRight (view: EditorView, markType: MarkType | undefined): boolean {
  if (markType === undefined) {
    return false
  }

  const { selection } = view.state
  if (!selection.empty) return false

  const pos = selection.$from
  const inNote = markType.isInSet(pos.marks()) !== undefined

  if (inNote && pos.nodeAfter == null) {
    view.dispatch(view.state.tr.removeStoredMark(markType))
    view.dispatch(view.state.tr.insertText(' '))

    return true
  }

  return false
}

interface NoteWidgetData {
  start: number
  end: number
  title: string
  kind: NoteKind
  nodeType?: string
}

function createDecorations (doc: ProseMirrorNode, markType: MarkType | undefined): DecorationSet {
  // If mark type doesn't exist, return empty decorations
  if (markType === undefined) {
    return DecorationSet.empty
  }

  const decorations: Decoration[] = []
  const notes: NoteWidgetData[] = []

  // Node types that have custom node views and should not have widget decorations
  // Widget decorations at the end of these nodes can interfere with ProseMirror's view update
  const nodesWithCustomViews = new Set(['image', 'embed', 'drawingBoard', 'mermaid', 'reference'])

  const nodeEndMap = new Map<number, string>()

  doc.descendants((node, pos) => {
    const nodeEnd = pos + node.nodeSize
    nodeEndMap.set(nodeEnd, node.type.name)

    const noteMark = node.marks.find((mark) => mark.type.name === markType.name)

    if (noteMark != null) {
      notes.push({
        start: pos,
        end: nodeEnd,
        title: noteMark.attrs.title,
        kind: noteMark.attrs.kind,
        nodeType: node.type.name
      })
    }
  })

  let currentNote: any
  notes.forEach((note) => {
    if (currentNote === undefined) {
      currentNote = note
      return
    }

    if (currentNote.end === note.start && currentNote.kind === note.kind && currentNote.title === note.title) {
      currentNote.end = note.end
      // When merging notes, update nodeType to the node at the end position
      // This is important because widget decorations are placed at the end position
      currentNote.nodeType = note.nodeType
      return
    }

    appendNoteWidget(currentNote, decorations, nodesWithCustomViews, nodeEndMap)
    currentNote = note
  })

  if (currentNote !== undefined) {
    appendNoteWidget(currentNote, decorations, nodesWithCustomViews, nodeEndMap)
  }

  return DecorationSet.create(doc, decorations)
}

function appendNoteWidget (
  note: NoteWidgetData,
  decorations: Decoration[],
  nodesWithCustomViews: Set<string>,
  nodeEndMap: Map<number, string>
): void {
  // Check what node ends at the note's end position using the pre-built map
  // Widget decorations at the end position of nodes with custom views interfere with
  // ProseMirror's view update mechanism (preMatch issue), causing "Cannot read properties
  // of undefined (reading 'children')" errors. The note mark itself will still render via
  // renderHTML, so the note functionality remains intact, just without the visual [] marker widget.
  const nodeTypeAtEnd = nodeEndMap.get(note.end)

  if (nodeTypeAtEnd !== undefined && nodesWithCustomViews.has(nodeTypeAtEnd)) {
    return
  }

  const marker = document.createElement('span')
  marker.classList.add('text-editor-note-marker')
  marker.classList.add('theme-text-editor-note-anchor')
  marker.classList.add(note.kind)
  marker.textContent = '[]'
  marker.title = note.title
  marker.onmousedown = function (event) {
    displayNote(note.title, event)
  }

  decorations.push(Decoration.widget(note.end, () => marker, { side: 0 }))
}

export function displayNote (text: string, event: MouseEvent): void {
  showPopup(
    DisplayNotePopup,
    {
      text
    },
    getEventPositionElement(event)
  )
}

export async function configureNote (editor: Editor, event: MouseEvent): Promise<void> {
  const attributes = editor.getAttributes(noteName)
  const text = attributes.title
  const kind = attributes.kind

  await new Promise<void>((resolve) => {
    showPopup(
      ConfigureNotePopup,
      {
        text,
        kind,
        isNew: !editor.isActive(noteName),
        handleUpdate: (text: string, kind: NoteKind) => {
          editor.commands.setNote(text, kind)
        },
        handleRemove: () => {
          editor.commands.unsetNote()
        }
      },
      getEventPositionElement(event),
      () => {
        resolve()
      }
    )
  })
}

export async function isEditableNote (editor: Editor): Promise<boolean> {
  if (!editor.isEditable) {
    return false
  }

  const noteExt = editor.extensionManager.extensions.find((ext) => ext.name === noteName)

  if (noteExt == null) {
    return false
  }

  return noteExt.options?.readonly !== true
}
