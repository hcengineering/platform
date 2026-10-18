//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { RoomAccess } from '@hcengineering/love'
import { getDefaultRoomAccess, getRoomAccessToRestore } from '../utils'

describe('getDefaultRoomAccess', () => {
  it('uses Knock for offices and Open for other rooms', () => {
    expect(getDefaultRoomAccess(true)).toBe(RoomAccess.Knock)
    expect(getDefaultRoomAccess(false)).toBe(RoomAccess.Open)
  })
})

describe('getRoomAccessToRestore', () => {
  it('restores a room whose access was changed during a meeting', () => {
    expect(getRoomAccessToRestore({ access: RoomAccess.Knock }, false)).toBe(RoomAccess.Open)
    expect(getRoomAccessToRestore({ access: RoomAccess.DND }, false)).toBe(RoomAccess.Open)
  })

  it('restores an office whose access was changed during a meeting', () => {
    expect(getRoomAccessToRestore({ access: RoomAccess.DND }, true)).toBe(RoomAccess.Knock)
    expect(getRoomAccessToRestore({ access: RoomAccess.Open }, true)).toBe(RoomAccess.Knock)
  })

  it('does nothing when the access is already the default one', () => {
    expect(getRoomAccessToRestore({ access: RoomAccess.Open }, false)).toBeUndefined()
    expect(getRoomAccessToRestore({ access: RoomAccess.Knock }, true)).toBeUndefined()
  })
})
