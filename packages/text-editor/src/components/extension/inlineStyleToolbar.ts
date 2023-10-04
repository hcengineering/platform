import { Editor, Extension, isTextSelection } from '@tiptap/core'
import { BubbleMenuOptions } from '@tiptap/extension-bubble-menu'
import { Plugin, PluginKey } from 'prosemirror-state'
import { InlinePopupExtension } from './inlinePopup'

export type InlineStyleToolbarOptions = BubbleMenuOptions & {
  isSupported: () => boolean
  isSelectionOnly?: () => boolean
}

export interface InlineStyleToolbarStorage {
  isShown: boolean
}

const handleFocus = (editor: Editor, options: InlineStyleToolbarOptions, storage: InlineStyleToolbarStorage): void => {
  if (!options.isSupported()) {
    return
  }

  if (editor.isEmpty) {
    return
  }

  if (options.isSelectionOnly?.() === true && editor.view.state.selection.empty) {
    return
  }

  storage.isShown = true
}

export const InlineStyleToolbarExtension = Extension.create<InlineStyleToolbarOptions, InlineStyleToolbarStorage>({
  pluginKey: new PluginKey('inline-style-toolbar'),
  addProseMirrorPlugins () {
    const options = this.options
    const storage = this.storage
    const editor = this.editor

    const plugins = [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('inline-style-toolbar-click-plugin'),
        props: {
          handleClick () {
            handleFocus(editor, options, storage)
          }
        }
      })
    ]

    return plugins
  },
  addStorage () {
    return {
      isShown: false
    }
  },
  addExtensions () {
    const options: InlineStyleToolbarOptions = this.options

    return [
      InlinePopupExtension.configure({
        ...options,
        shouldShow: ({ editor, view, state, oldState, from, to }) => {
          if (!this.options.isSupported()) {
            return false
          }

          if (editor.isDestroyed || !editor.isEditable) {
            return false
          }

          if (this.storage.isShown) {
            return true
          }

          // For some reason shouldShow might be called after dismount and
          // after destroing the editor. We should handle this just no to have
          // any errors in runtime
          const editorElement = editor.view.dom
          if (editorElement === null || editorElement === undefined) {
            return false
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
  },
  onFocus () {
    handleFocus(this.editor, this.options, this.storage)
  },
  onSelectionUpdate () {
    this.storage.isShown = false
  },
  onUpdate () {
    this.storage.isShown = false
  }
})
