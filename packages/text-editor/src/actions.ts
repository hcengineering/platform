import Attach from './components/icons/Attach.svelte'
import Emoji from './components/icons/Emoji.svelte'
import GIF from './components/icons/GIF.svelte'
import TextStyle from './components/icons/TextStyle.svelte'
import textEditorPlugin from './plugin'
import { RefAction, RefInputAction } from './types'

export function getDefaultAttachRefAction(action: RefInputAction): RefAction {
  return {
    label: textEditorPlugin.string.Attach,
    icon: Attach,
    action,
    order: 1000
  }
}

export function getDefaultTextStyleRefAction(): RefAction {
  return {
    label: textEditorPlugin.string.TextStyle,
    icon: TextStyle,
    action: () => {}, // TODO : Implement
    order: 2000
  }
}

export function getDefaultEmojiRefAction(): RefAction {
  return {
    label: textEditorPlugin.string.Emoji,
    icon: Emoji,
    action: () => {}, // TODO : Implement
    order: 3000
  }
}

export function getDefaultGIFRefAction(): RefAction {
  return {
    label: textEditorPlugin.string.GIF,
    icon: GIF,
    action: () => {}, // TODO : Implement
    order: 4000
  }
}
