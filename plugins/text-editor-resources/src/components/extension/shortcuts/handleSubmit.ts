import { Extension, type KeyboardShortcutCommand } from '@tiptap/core'

export interface HandleSubmitExtensionOptions {
  submit: () => void
  useModKey?: boolean
}

export const HandleSubmitExtension = Extension.create<HandleSubmitExtensionOptions>({
  name: 'handleSubmit',
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
