import { mergeIds } from '@hcengineering/platform'
import emojiPlugin, { emojiId } from '@hcengineering/emoji'
import type { AnyComponent } from '@hcengineering/ui'

export default mergeIds(emojiId, emojiPlugin, {
  component: {
    WorkbenchExtension: '' as AnyComponent
  }
})
