import { getResource } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { EmojiPopup, IconEmoji, showPopup } from '@hcengineering/ui'
import RiMention from '../icons/RIMention.svelte'
import textEditorPlugin from '../../plugin'
import type { RefAction } from '../../types'

export const defaultRefActions: RefAction[] = [
  {
    label: textEditorPlugin.string.Mention,
    icon: RiMention,
    action: (_element, editorHandler) => {
      editorHandler.insertText('@')
      editorHandler.focus()
    },
    order: 3000
  },
  {
    label: textEditorPlugin.string.Emoji,
    icon: IconEmoji,
    action: (element, editorHandler) => {
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

export async function getModelRefActions (): Promise<RefAction[]> {
  const client = getClient()

  const actions: RefAction[] = []

  const items = await client.findAll(textEditorPlugin.class.RefInputActionItem, {})
  for (const item of items) {
    actions.push({
      label: item.label,
      icon: item.icon,
      order: item.order ?? 10000,
      action: await getResource(item.action)
    })
  }

  return actions
}
