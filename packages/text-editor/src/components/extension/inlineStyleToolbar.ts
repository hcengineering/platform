import { Extension, isTextSelection } from '@tiptap/core'
import BubbleMenu, { BubbleMenuOptions } from '@tiptap/extension-bubble-menu'

type InlineStyleToolbarOptions = BubbleMenuOptions & {
  getEditorElement: () => HTMLElement | null | undefined
  isShown?: () => boolean
}

export const InlineStyleToolbar = Extension.create<InlineStyleToolbarOptions>({
  defaultOptions: {
    pluginKey: 'inline-style-toolbar',
    element: null,
    tippyOptions: {
      maxWidth: '38rem'
    },
    getEditorElement: () => null
  },
  addExtensions () {
    const options: InlineStyleToolbarOptions = this.options

    return [
      BubbleMenu.configure({
        ...options,
        // to override shouldShow behaviour a little
        // I need to copypaste original function and make a little change
        // with showContextMenu falg
        shouldShow: ({ editor, view, state, oldState, from, to }) => {
          const editorElement = options.getEditorElement()
          // For some reason shouldShow might be called after dismount and
          // after destroing the editor. We should handle this just no to have
          // any errors in runtime
          if (editorElement === null || editorElement === undefined) {
            return false
          }

          if (!editor.isEditable) {
            return false
          }

          const isShown = options.isShown?.() ?? false
          if (isShown) {
            return true
          }

          // When clicking on a element inside the bubble menu the editor "blur" event
          // is called and the bubble menu item is focussed. In this case we should
          // consider the menu as part of the editor and keep showing the menu
          const isChildOfMenu = editorElement.contains(document.activeElement)
          const hasEditorFocus = view.hasFocus() || isChildOfMenu
          if (!hasEditorFocus) {
            return false
          }

          const { doc, selection } = state
          const { empty } = selection

          // Sometime check for `empty` is not enough.
          // Doubleclick an empty paragraph returns a node size of 2.
          // So we check also for an empty text size.
          const isEmptyTextBlock = doc.textBetween(from, to).length === 0 && isTextSelection(state.selection)
          if (empty || isEmptyTextBlock) {
            return false
          }

          return true
        }
      })
    ]
  }
})
