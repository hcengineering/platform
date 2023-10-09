import { Extension } from '@tiptap/core'
import BubbleMenu, { BubbleMenuOptions } from '@tiptap/extension-bubble-menu'

export const InlinePopupExtension: Extension<BubbleMenuOptions> = BubbleMenu.extend({
  addOptions () {
    return {
      ...this.parent?.(),
      pluginKey: 'inline-popup',
      element: null,
      tippyOptions: {
        maxWidth: '38rem',
        appendTo: () => document.body
      }
    }
  }
})
