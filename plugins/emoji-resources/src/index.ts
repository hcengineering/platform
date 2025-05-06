import type { Resources } from '@hcengineering/platform'
import EmojiPopup from './components/EmojiPopup.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'

export default async (): Promise<Resources> => ({
  component: {
    EmojiPopup,
    WorkbenchExtension
  }
})
