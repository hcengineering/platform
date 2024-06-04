import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { TriggerFunc } from '@hcengineering/server-core'

/**
 * @public
 */
export const serverLoveId = 'server-love' as Plugin

/**
 * @public
 */
export default plugin(serverLoveId, {
  trigger: {
    OnEmployee: '' as Resource<TriggerFunc>,
    OnUserStatus: '' as Resource<TriggerFunc>,
    OnParticipantInfo: '' as Resource<TriggerFunc>,
    OnInvite: '' as Resource<TriggerFunc>,
    OnKnock: '' as Resource<TriggerFunc>
  }
})
