import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import { ChangeSet } from 'prosemirror-changeset'
import { Plugin } from 'prosemirror-state'

export interface ChangeHighlightOptions {
  multicolor: boolean
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    changeHighlight: {
      /**
       * Set a highlight mark
       */
      setChangeHighlight: (attributes?: { color: string }) => ReturnType
      /**
       * Toggle a highlight mark
       */
      toggleChangeHighlight: (attributes?: { color: string }) => ReturnType
      /**
       * Unset a highlight mark
       */
      unsetChangeHighlight: () => ReturnType
    }
  }
}

export const ChangeHighlight = Mark.create<ChangeHighlightOptions>({
  name: 'changeHighlight',

  addOptions () {
    return {
      multicolor: true,
      HTMLAttributes: {
        changeColor: 'yellow'
      }
    }
  },

  addAttributes () {
    if (!this.options.multicolor) {
      return {}
    }

    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute('color'),
        renderHTML: (attributes) => {
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!attributes.color) {
            return {}
          }

          const color = attributes.color as string

          return {
            color,
            style: `border-top: 1px solid ${color}; border-bottom: 1px solid ${color}; border-radius: 2px;`
          }
        }
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: 'cmark'
      }
    ]
  },

  renderHTML ({ HTMLAttributes }) {
    return ['cmark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands () {
    return {
      setChangeHighlight:
        (attributes) =>
          ({ commands }) => {
            return commands.setMark(this.name, attributes)
          },
      toggleChangeHighlight:
        (attributes) =>
          ({ commands }) => {
            return commands.toggleMark(this.name, attributes)
          },
      unsetChangeHighlight:
        () =>
          ({ commands }) => {
            return commands.unsetMark(this.name)
          }
    }
  }
})

export interface ChangesetExtensionOptions {
  isSuggestMode: () => boolean
}

export const ChangesetExtension = Extension.create<ChangesetExtensionOptions>({
  // addInputRules () {
  //   return [changeSetRule]
  // },
  addProseMirrorPlugins () {
    return [
      new Plugin({
        appendTransaction: (_transactions, oldState, newState) => {
          // no changes
          if (newState.doc === oldState.doc) {
            return
          }
          const tr = newState.tr
          if (this.options.isSuggestMode()) {
            let changes = ChangeSet.create(oldState.doc)

            for (const tr of _transactions) {
              changes = changes.addSteps(tr.doc, tr.mapping.maps, undefined)
            }

            for (const r of changes.changes) {
              const from = r.fromB
              const to = r.toB
              if (r.inserted.length > 0 && from !== to) {
                tr.addMark(from, to, newState.schema.marks.changeHighlight.create({ color: 'lightblue' }))
              }

              if (r.deleted.length > 0) {
                const deletedText = oldState.doc.textBetween(r.fromA, r.toA)
                tr.insertText(deletedText, from)
                tr.addMark(
                  from,
                  from + deletedText.length,
                  newState.schema.marks.changeHighlight.create({ color: 'orange' })
                )
              }
            }
          }
          return tr
        }
      })
    ]
  },
  onCreate () {
    // The editor is ready.
  },
  onUpdate () {
    // The content has changed.
  },
  // onSelectionUpdate ({ editor }) {
  //   // The selection has changed.
  // },
  onTransaction ({ transaction }) {
    // The editor state has changed.
  },
  onFocus ({ event }) {
    // The editor is focused.
  },
  onBlur ({ event }) {
    // The editor isn’t focused anymore.
  },
  onDestroy () {
    // The editor is being destroyed.
  }
})
