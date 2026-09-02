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

import { type TxOperations } from '@hcengineering/core'
import love from '@hcengineering/love'
import { parseRoomName, resetRoomParticipants } from '../rooms'

describe('parseRoomName', () => {
  it('takes the workspace from the first segment and the room id from the last', () => {
    expect(parseRoomName('ws-1_All hands_room-1')).toEqual({ workspace: 'ws-1', roomId: 'room-1' })
  })

  it('tolerates underscores inside the room name', () => {
    expect(parseRoomName('ws-1_Team_sync_room_room-2')).toEqual({ workspace: 'ws-1', roomId: 'room-2' })
  })

  it('rejects names that are not workspace_name_id', () => {
    expect(parseRoomName('room-1')).toBeUndefined()
    expect(parseRoomName('ws-1_room-1')).toBeUndefined()
    expect(parseRoomName('_name_')).toBeUndefined()
  })
})

interface Update {
  _id: string
  room: string
  x: number
  y: number
}

function fakeClient (
  infos: Array<{ _id: string, person: string, room: string }>,
  offices: Array<{ _id: string, person: string }>
): { client: TxOperations, updates: Update[] } {
  const updates: Update[] = []
  const client = {
    findAll: async (_class: string, query: Record<string, string>) =>
      infos.filter((i) => i.room === query.room && (query.person === undefined || i.person === query.person)),
    findOne: async (_class: string, query: Record<string, string>) => offices.find((o) => o.person === query.person),
    update: async (doc: { _id: string }, ops: { room: string, x: number, y: number }) => {
      updates.push({ _id: doc._id, ...ops })
    }
  } as unknown as TxOperations
  return { client, updates }
}

describe('resetRoomParticipants', () => {
  const infos = [
    { _id: 'pi-a', person: 'alice', room: 'room-1' },
    { _id: 'pi-b', person: 'bob', room: 'room-1' },
    { _id: 'pi-c', person: 'carol', room: 'room-2' }
  ]
  const offices = [{ _id: 'office-a', person: 'alice' }]

  it('moves one dropped participant to their office', async () => {
    const { client, updates } = fakeClient(infos, offices)
    await expect(resetRoomParticipants(client, 'room-1' as any, 'alice' as any)).resolves.toBe(1)
    expect(updates).toEqual([{ _id: 'pi-a', room: 'office-a', x: 0, y: 0 }])
  })

  it('falls back to reception for a participant without an office', async () => {
    const { client, updates } = fakeClient(infos, offices)
    await resetRoomParticipants(client, 'room-1' as any, 'bob' as any)
    expect(updates).toEqual([{ _id: 'pi-b', room: love.ids.Reception, x: 0, y: 0 }])
  })

  it('ignores a participant who has already moved to another room', async () => {
    const { client, updates } = fakeClient(infos, offices)
    await expect(resetRoomParticipants(client, 'room-1' as any, 'carol' as any)).resolves.toBe(0)
    expect(updates).toEqual([])
  })

  it('clears everyone when the room is finished', async () => {
    const { client, updates } = fakeClient(infos, offices)
    await expect(resetRoomParticipants(client, 'room-1' as any)).resolves.toBe(2)
    expect(updates.map((u) => [u._id, u.room])).toEqual([
      ['pi-a', 'office-a'],
      ['pi-b', love.ids.Reception]
    ])
  })
})
