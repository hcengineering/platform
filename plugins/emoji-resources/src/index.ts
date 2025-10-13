import type { Resources } from '@hcengineering/platform'
import EmojiPopup from './components/EmojiPopup.svelte'
import SettingsEmojiTable from './components/settings/SettingsEmojiTable.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import { getCustomEmoji, getEmojiByEmoticon, getEmojiByShortCode, parseTextWithEmojis } from './utils'

export { default as EmojiPresenter } from './components/EmojiPresenter.svelte'

export * from './utils'

export default async (): Promise<Resources> => ({
  component: {
    EmojiPopup,
    SettingsEmojiTable,
    WorkbenchExtension
  },
  functions: {
    GetEmojiByEmoticon: getEmojiByEmoticon,
    GetEmojiByShortCode: getEmojiByShortCode,
    GetCustomEmoji: getCustomEmoji,
    ParseTextWithEmojis: parseTextWithEmojis
  }
})
