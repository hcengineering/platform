import guest, { guestId } from '@hcengineering/guest'
import { type IntlString, mergeIds } from '@hcengineering/platform'

export default mergeIds(guestId, guest, {
  string: {
    CreatePublicLink: '' as IntlString,
    PublicLink: '' as IntlString,
    Revoke: '' as IntlString,
    Copy: '' as IntlString,
    RevokeConfirmation: '' as IntlString,
    LinkWasRevoked: '' as IntlString
  }
})
