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

import type { Class, Doc, Ref } from '@hcengineering/core'
import { navigate, type Location, getCurrentResolvedLocation } from '@hcengineering/ui'
import { inboxId } from '@hcengineering/inbox'
import { type MessageID } from '@hcengineering/communication-types'
import { decodeObjectURI, encodeObjectURI } from '@hcengineering/view'
import { type ActivityMessage } from '@hcengineering/activity'

// Url: /inbox/{_class}&{_id}?message={messageId}

export function getDocInfoFromLocation (loc: Location): Pick<Doc, '_id' | '_class'> | undefined {
  if (loc.path[2] !== inboxId) {
    return undefined
  }

  const [_id, _class] = decodeObjectURI(loc.path[3])

  if (_id == null || _class == null) return undefined
  if (_id === '' || _class === '') return undefined

  return {
    _id,
    _class
  }
}

export function navigateToDoc (
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  message?: {
    id: MessageID | Ref<ActivityMessage>
    date: Date
  }
): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = inboxId
  loc.path[3] = encodeObjectURI(_id, _class)

  delete loc.fragment

  if (message != null) {
    loc.query = {
      ...loc.query,
      message: encodeURIComponent(`${message.id}:${message.date.toISOString()}`)
    }
  } else {
    delete loc.query?.message
  }

  navigate(loc)
}

export function closeDoc (): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = inboxId
  loc.path[3] = ''
  loc.path.length = 3
  loc.query = undefined
  delete loc.fragment

  navigate(loc)
}
