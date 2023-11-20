import { EmojiPopup, IconEmoji, showPopup } from '@hcengineering/ui'
import RiMention from '../icons/RIMention.svelte'
import textEditorPlugin from '../../plugin'
import { type RefAction, type TextEditorHandler } from '../../types'

export const generateDefaultActions = (editorHandler: TextEditorHandler): RefAction[] => {
  return [
    {
      label: textEditorPlugin.string.Mention,
      icon: RiMention,
      action: () => {
        editorHandler.insertText('@')
      },
      order: 3000
    },
    {
      label: textEditorPlugin.string.Emoji,
      icon: IconEmoji,
      action: (element) => {
        showPopup(
          EmojiPopup,
          {},
          element,
          (emoji) => {
            if (emoji === null || emoji === undefined) {
              return
            }

            editorHandler.insertText(emoji)
            editorHandler.focus()
          },
          () => {}
        )
      },
      order: 4001
    }
  ]
}
