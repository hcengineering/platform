import { Editor } from '@tiptap/core'
import { FORMAT_MODES, TextFormatState } from './types'
import { headingLevels } from './components/extensions'

export function generateFormattingState (editor: Editor, previous: TextFormatState): TextFormatState {
  const activeModes = new Set(FORMAT_MODES.filter((mode) => editor.isActive(mode)))
  let headingLevel = previous.headingLevel
  for (const l of headingLevels) {
    if (editor.isActive('heading', { level: l })) {
      headingLevel = l
      activeModes.add('heading')
      if (l === 1) {
        activeModes.add('heading1')
      } else if (l === 2) {
        activeModes.add('heading2')
      }
    }
  }
  if (!activeModes.has('heading')) {
    headingLevel = 0
  }

  return {
    activeModes,
    headingLevel
  }
}
