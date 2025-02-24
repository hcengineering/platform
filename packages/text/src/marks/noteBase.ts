import { Mark } from '@tiptap/core'
import { getDataAttribute } from '../nodes'

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

  renderHTML ({ HTMLAttributes, mark }) {
    return [
      'span',
      { ...HTMLAttributes, 'data-mark': this.name, class: `theme-text-editor-note-anchor ${mark.attrs.kind}` },
      0
    ]
  },

  addAttributes () {
    return {
      title: {
        default: null
      },
      kind: getDataAttribute('kind', { default: NoteKind.Neutral })
    }
  }
})
