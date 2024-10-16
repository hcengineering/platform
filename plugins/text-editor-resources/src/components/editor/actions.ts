import { getResource } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { EmojiPopup, IconEmoji, showPopup } from '@hcengineering/ui'
import textEditor, { type RefAction } from '@hcengineering/text-editor'

import RiMention from '../icons/RIMention.svelte'

export const defaultRefActions: RefAction[] = [
  {
    label: textEditor.string.Mention,
    icon: RiMention,
    action: (_element, editorHandler) => {
      editorHandler.insertText('@')
      editorHandler.focus()
    },
    order: 3000
  },
  {
    label: textEditor.string.Emoji,
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

  const items = await client.findAll(textEditor.class.RefInputActionItem, {})
  for (const item of items) {
    actions.push({
      label: item.label,
      icon: item.icon,
      iconProps: item.iconProps,
      order: item.order ?? 10000,
      action: await getResource(item.action),
      disabledFn: item.isDisabledFn !== undefined ? await getResource(item.isDisabledFn) : undefined
    })
  }

  return actions
}
