import { type Account, type Doc, type Ref } from '@hcengineering/core'
import { guestId } from '@hcengineering/guest'
import guest from '@hcengineering/guest-resources/src/plugin'
import { mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'
import { type Action, type ActionCategory } from '@hcengineering/view'

export default mergeIds(guestId, guest, {
  account: {
    Guest: '' as Ref<Account>
  },
  action: {
    CreatePublicLink: '' as Ref<Action<Doc, any>>
  },
  category: {
    Guest: '' as Ref<ActionCategory>
  },
  component: {
    CreatePublicLink: '' as AnyComponent
  }
})
