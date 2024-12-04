import { Class, Doc, Ref } from '@hcengineering/core'
import type { Asset, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { AnyComponent, Location } from '@hcengineering/ui'

export * from './utils'

export interface PublicLink extends Doc {
  attachedTo: Ref<Doc>
  url: string
  location: Location
  restrictions: Restrictions
  revokable: boolean
}

export interface Restrictions {
  readonly: boolean
  disableComments: boolean
  disableNavigation: boolean
  disableActions: boolean
}

export const guestAccountEmail = '#guest@hc.engineering'
export const guestAccount = '485fb04f-1f9c-45ee-bced-78a008a034e8'

export const guestId = 'guest' as Plugin
export default plugin(guestId, {
  class: {
    PublicLink: '' as Ref<Class<PublicLink>>
  },
  icon: {
    Link: '' as Asset
  },
  component: {
    GuestApp: '' as AnyComponent
  }
})
