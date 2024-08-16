import { Mark } from '@tiptap/core'

export const name = 'note'
export enum NoteKind {
  Neutral = 'neutral',
  Dangerous = 'dangerous',
  DangerousLight = 'dangerous-light',
  Warning = 'warning',
  WarningLight = 'warning-light',
  Positive = 'positive',
  PositiveLight = 'positive-light',
  Primary = 'primary',
  PrimaryLight = 'primary-light'
}

declare module '@tiptap/core' {
  export interface Commands<ReturnType> {
    [name]: {
      setNote: (text: string, kind: NoteKind) => ReturnType
      unsetNote: () => ReturnType
    }
  }
}

export const NoteBaseExtension = Mark.create({
  name,

  parseHTML () {
    return [
      {
        tag: `span[data-mark="${name}"]`
      }
    ]
  },

  renderHTML ({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, 'data-mark': this.name }, 0]
  },

  addAttributes () {
    return {
      title: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute('title')
        },
        renderHTML: (attributes) => {
          if (attributes.title == null) {
            return {}
          }

          return {
            title: attributes.title
          }
        }
      },
      kind: {
        default: NoteKind.Neutral,
        parseHTML: (element) => {
          return element.getAttribute('data-kind')
        },
        renderHTML: (attributes) => {
          if (attributes.kind == null) {
            return {}
          }

          return {
            'data-kind': attributes.kind,
            class: `theme-text-editor-note-anchor ${attributes.kind}`
          }
        }
      }
    }
  }
})
