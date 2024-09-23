import { Extension, type KeyboardShortcutCommand } from '@tiptap/core'

export interface SubmitOptions {
  submit: () => void
  useModKey?: boolean
}

export const SubmitExtension = Extension.create<SubmitOptions>({
  name: 'submit',
  addKeyboardShortcuts () {
    const shortcuts: Record<string, KeyboardShortcutCommand> = {
      Space: () => {
        if (this.editor.isActive('link')) {
          this.editor.commands.toggleMark('link')
        }
        return false
      }
    }
    const submitHandle = (): boolean => {
      this.options.submit()
      return true
    }

    if (this.options.useModKey === true) {
      shortcuts['Mod-Enter'] = submitHandle
    } else {
      shortcuts.Enter = submitHandle
    }

    return shortcuts
  }
})
