import { Extension, isTextSelection } from '@tiptap/core'
import { type BubbleMenuOptions } from '@tiptap/extension-bubble-menu'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { InlinePopupExtension } from './inlinePopup'

export type InlineStyleToolbarOptions = BubbleMenuOptions & {
  isSupported: () => boolean
  isSelectionOnly?: () => boolean
}

export interface InlineStyleToolbarStorage {
  canShowWithoutSelection: boolean
}

export const InlineStyleToolbarExtension = Extension.create<InlineStyleToolbarOptions, InlineStyleToolbarStorage>({
  pluginKey: new PluginKey('inline-style-toolbar'),
  addProseMirrorPlugins () {
    const storage = this.storage

    const plugins = [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('inline-style-toolbar-click-plugin'),
        props: {
          handleClickOn (view, pos, node, nodePos, event, direct) {
            if (direct) {
              storage.canShowWithoutSelection = node.type.name !== 'image'
            }
          }
        }
      })
    ]

    return plugins
  },
  addStorage () {
    return {
      canShowWithoutSelection: false
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

          if (editor.isDestroyed) {
            return false
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

          const textSelection = isTextSelection(state.selection)

          // Sometime check for `empty` is not enough.
          // Doubleclick an empty paragraph returns a node size of 2.
          // So we check also for an empty text size.
          const isEmptyTextBlock = doc.textBetween(from, to).length === 0 && textSelection
          if (empty || isEmptyTextBlock) {
            return this.storage.canShowWithoutSelection
          }

          return textSelection
        }
      })
    ]
  },
  onSelectionUpdate () {
    this.storage.canShowWithoutSelection = false
  },
  onUpdate () {
    this.storage.canShowWithoutSelection = false
  }
})
