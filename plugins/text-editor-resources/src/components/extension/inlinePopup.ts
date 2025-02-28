import { type Extension } from '@tiptap/core'
import BubbleMenu, { type BubbleMenuOptions } from '@tiptap/extension-bubble-menu'

export const InlinePopupExtension: Extension<BubbleMenuOptions> = BubbleMenu.extend({
  addOptions () {
    return {
      ...this.parent?.(),
      pluginKey: 'inline-popup',
      element: null as any,
      tippyOptions: {
        maxWidth: '46rem',
        zIndex: 500,
        appendTo: () => document.body
      }
    }
  }
})
