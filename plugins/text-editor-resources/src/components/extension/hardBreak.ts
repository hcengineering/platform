import { type KeyboardShortcutCommand } from '@tiptap/core'
import HardBreak, { type HardBreakOptions as HardBreakOptionsBase } from '@tiptap/extension-hard-break'

export interface HardBreakOptions extends HardBreakOptionsBase {
  shortcuts?: 'full' | 'compact'
}

export const HardBreakExtension = HardBreak.extend<HardBreakOptions>({
  addKeyboardShortcuts () {
    let shortcuts: Record<string, KeyboardShortcutCommand> = {}

    switch (this.options.shortcuts) {
      case 'compact':
        shortcuts = {
          'Ctrl-Enter': () => this.editor.commands.setHardBreak(),
          'Alt-Enter': () => this.editor.commands.setHardBreak()
        }
        break
      case 'full':
      default:
        shortcuts = {
          'Shift-Enter': () => this.editor.commands.setHardBreak()
        }
        break
    }

    return shortcuts
  }
})
