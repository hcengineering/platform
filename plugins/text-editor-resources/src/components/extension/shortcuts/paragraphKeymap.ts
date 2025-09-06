import { Extension } from '@tiptap/core'

export const ParagraphKeymapExtension = Extension.create({
  name: 'paragraphKeymap',
  addKeyboardShortcuts () {
    return {
      'Shift-Enter': () => {
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
      }
    }
  }
})
