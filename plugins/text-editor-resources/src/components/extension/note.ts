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

            return createDecorations(doc, markType)
          },
          handleKeyDown (view: EditorView, event) {
            const markType = view.state.schema.marks[noteName]
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

function onArrowRight (view: EditorView, markType: MarkType): boolean {
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
}

function createDecorations (doc: ProseMirrorNode, markType: MarkType): DecorationSet {
  const decorations: Decoration[] = []
  const notes: NoteWidgetData[] = []

  doc.descendants((node, pos) => {
    const noteMark = node.marks.find((mark) => mark.type.name === markType.name)

    if (noteMark != null) {
      notes.push({
        start: pos,
        end: pos + node.nodeSize,
        title: noteMark.attrs.title,
        kind: noteMark.attrs.kind
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
      return
    }

    appendNoteWidget(currentNote, decorations)
    currentNote = note
  })

  if (currentNote !== undefined) {
    appendNoteWidget(currentNote, decorations)
  }

  return DecorationSet.create(doc, decorations)
}

function appendNoteWidget (note: NoteWidgetData, decorations: Decoration[]): void {
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
