import { EmojiPopup, IconEmoji, showPopup } from '@hcengineering/ui'
import TextEditor from '../TextEditor.svelte'
import RiMention from '../icons/RIMention.svelte'
import textEditorPlugin from '../../plugin'
import { RefAction } from '../../types'

export const generateDefaultActions = (textEditor: TextEditor | undefined): RefAction[] => {
  return [
    {
      label: textEditorPlugin.string.Mention,
      icon: RiMention,
      action: () => textEditor?.insertText('@'),
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

            textEditor?.insertText(emoji)
            textEditor?.focus()
          },
          () => {}
        )
      },
      order: 4001
    }
  ]
}
