import { Extension } from '@tiptap/core'

export interface SubmitOptions {
  submit: () => void
}

export const SubmitExtension = Extension.create<SubmitOptions>({
  addKeyboardShortcuts () {
    return {
      'Ctrl-Enter': () => {
        const res = this.editor.commands.splitListItem('listItem')
        if (!res) {
          this.editor.commands.first(({ commands }) => [
            () => commands.newlineInCode(),
            () => commands.createParagraphNear(),
            () => commands.liftEmptyBlock(),
            () => commands.splitBlock()
          ])
        }
        return true
      },
      'Shift-Enter': () => {
        this.editor.commands.setHardBreak()
        return true
      },
      Enter: () => {
        this.options.submit()
        return true
      },
      Space: () => {
        if (this.editor.isActive('link')) {
          this.editor.commands.toggleMark('link')
        }
        return false
      }
    }
  }
})
