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

import { type Ref, type TxOperations, type WorkspaceUuid } from '@hcengineering/core'
import love, { type Office, type ParticipantInfo, type Room } from '@hcengineering/love'

export type PersonRef = ParticipantInfo['person']

export interface ParsedRoomName {
  workspace: WorkspaceUuid
  roomId: Ref<Room>
}

/**
 * A LiveKit room is named `<workspace uuid>_<room name>_<room id>` by the
 * client. The room name itself may contain underscores, so only the first and
 * the last segment are meaningful.
 */
export function parseRoomName (name: string): ParsedRoomName | undefined {
  const parts = name.split('_')
  if (parts.length < 3) return undefined
  const workspace = parts[0]
  const roomId = parts[parts.length - 1]
  if (workspace === '' || roomId === '') return undefined
  return { workspace: workspace as WorkspaceUuid, roomId: roomId as Ref<Room> }
}

/**
 * Move every ParticipantInfo still recorded in `roomId` (optionally just
 * `person`'s) back to the person's office, or to reception without one.
 *
 * ParticipantInfo is written by the person's own client on join and leave;
 * when that client goes away mid-call (reload, crash, network loss) the
 * record keeps pointing at the room although LiveKit has long dropped the
 * participant. This is the same update the client performs when an office
 * owner kicks a visitor, so the server-side room triggers apply as usual.
 *
 * Filtering by room makes a late event harmless: a participant who has
 * already moved on to another room is no longer matched.
 */
export async function resetRoomParticipants (
  client: TxOperations,
  roomId: Ref<Room>,
  person?: PersonRef
): Promise<number> {
  const infos = await client.findAll(love.class.ParticipantInfo, {
    room: roomId,
    ...(person !== undefined ? { person } : {})
  })
  for (const info of infos) {
    const office = await client.findOne(love.class.Office, { person: info.person })
    await client.update(info, {
      room: (office as Office | undefined)?._id ?? love.ids.Reception,
      x: 0,
      y: 0
    })
  }
  return infos.length
}
