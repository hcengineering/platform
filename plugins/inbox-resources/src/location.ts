//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Card } from '@hcengineering/card'
import type { Ref } from '@hcengineering/core'
import { navigate, type Location, getCurrentResolvedLocation } from '@hcengineering/ui'
import { inboxId } from '@hcengineering/inbox'
import { type MessageID } from '@hcengineering/communication-types'

// Url: /inbox/{cardId}?message={messageId}

export function getCardIdFromLocation (loc: Location): Ref<Card> | undefined {
  if (loc.path[2] !== inboxId) {
    return undefined
  }
  return loc.path[3] as Ref<Card>
}

export function navigateToCard (_id?: Ref<Card>, message?: MessageID, messageCreated?: Date): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = inboxId
  if (_id == null) {
    loc.path[3] = ''
    loc.path.length = 3
  } else {
    loc.path[3] = _id
  }
  delete loc.fragment

  if (message != null && messageCreated != null) {
    loc.query = {
      ...loc.query,
      message: encodeURIComponent(`${message}:${messageCreated.toISOString()}`)
    }
  } else {
    delete loc.query?.message
  }

  navigate(loc)
}
