import { AccountRole, type Doc, type Domain, type Ref } from '@hcengineering/core'
import { type PublicLink, type Restrictions, guestAccountEmail } from '@hcengineering/guest'
import { type Builder, Model } from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import { type Location } from '@hcengineering/ui'
import guest from './plugin'

const GUEST_DOMAIN = 'guest' as Domain

@Model(guest.class.PublicLink, core.class.Doc, GUEST_DOMAIN)
export class TPublicLink extends TDoc implements PublicLink {
  url!: string
  location!: Location
  restrictions!: Restrictions
  revokable!: boolean
  attachedTo!: Ref<Doc>
}

export function createModel (builder: Builder): void {
  builder.createModel(TPublicLink)

  builder.createDoc(
    core.class.Account,
    core.space.Model,
    {
      email: guestAccountEmail,
      role: AccountRole.Guest
    },
    guest.account.Guest
  )
}

export { guestId } from '@hcengineering/guest'
export * from './migration'
export * from './utils'
