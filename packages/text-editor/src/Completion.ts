import { Node, mergeAttributes } from '@tiptap/core'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'

export interface CompletionOptions {
  HTMLAttributes: Record<string, any>
  renderLabel: (props: { options: CompletionOptions, node: any }) => string
  suggestion: Omit<SuggestionOptions, 'editor'>
}

// export const CompletionPluginKey = new PluginKey('completion')

export const Completion = Node.create<CompletionOptions>({
  name: 'reference',

  addOptions () {
    return {
      HTMLAttributes: {},
      renderLabel ({ options, node }) {
        // eslint-disable-next-line
        return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`
      },
      suggestion: {
        char: '@',
        // pluginKey: CompletionPluginKey,
        command: ({ editor, range, props }) => {
          // increase range.to by one when the next node is of type "text"
          // and starts with a space character
          const nodeAfter = editor.view.state.selection.$to.nodeAfter
          const overrideSpace = nodeAfter?.text?.startsWith(' ')

          if (overrideSpace !== undefined && overrideSpace) {
            // eslint-disable-next-line
            range.to += 1
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props
              },
              {
                type: 'text',
                text: ' '
              }
            ])
            .run()
        },
        allow: ({ editor, range }) => {
          if (range.from > editor.state.doc.content.size) return false
          const $from = editor.state.doc.resolve(range.from)
          const type = editor.schema.nodes[this.name]
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          return !!$from.parent.type.contentMatch.matchType(type)
        }
      }
    }
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes () {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          // eslint-disable-next-line
          if (!attributes.id) {
            return {}
          }

          return {
            'data-id': attributes.id
          }
        }
      },

      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          // eslint-disable-next-line
          if (!attributes.label) {
            return {}
          }

          return {
            'data-label': attributes.label
          }
        }
      },
      objectclass: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-objectclass'),
        renderHTML: (attributes) => {
          // eslint-disable-next-line
          if (!attributes.objectclass) {
            return {}
          }

          return {
            'data-objectclass': attributes.objectclass
          }
        }
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[data-type="${this.name}"]`
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': this.name }, this.options.HTMLAttributes, HTMLAttributes),
      this.options.renderLabel({
        options: this.options,
        node
      })
    ]
  },

  renderText ({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node
    })
  },

  addKeyboardShortcuts () {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false
          const { selection } = state
          const { empty, anchor } = selection

          if (!empty) {
            return false
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true

              // eslint-disable-next-line
              tr.insertText(this.options.suggestion.char || '', pos, pos + node.nodeSize)

              return false
            }
          })

          return isMention
        })
    }
  },

  addProseMirrorPlugins () {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})
