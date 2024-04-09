//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { Doc, TxOperations } from '@hcengineering/core'
import { type Location } from '@hcengineering/ui'

import guest from './index'

export async function createPublicLink (
  client: TxOperations,
  object: Doc,
  location: Location,
  revokable: boolean = true
): Promise<void> {
  await client.createDoc(guest.class.PublicLink, guest.space.Links, {
    attachedTo: object._id,
    location,
    revokable,
    restrictions: {
      readonly: true,
      disableNavigation: true,
      disableActions: true,
      disableComments: true
    },
    url: ''
  })
}
