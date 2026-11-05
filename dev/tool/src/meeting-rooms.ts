//
// Copyright © 2026 TraceX SAS.
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

import love, { type Room } from '@hcengineering/love'
import { type Ref, type TxOperations, type WorkspaceUuid } from '@hcengineering/core'
import { type Sql } from 'postgres'

export interface MeetingRoomDefaults {
  startWithRecording?: boolean
  startWithTranscription?: boolean
}

/** Updates only the requested defaults directly in PostgreSQL, without a transactor connection. */
export async function updateMeetingRoomDefaults (
  sql: Sql,
  workspace: WorkspaceUuid,
  defaults: MeetingRoomDefaults,
  dryRun: boolean
): Promise<DisableMeetingRoomDefaultsResult> {
  if (Object.keys(defaults).length === 0) {
    throw new Error('At least one meeting room default must be specified')
  }

  const patch = sql.json({ ...defaults })
  const classes = [love.class.Room, love.class.Office]
  if (dryRun) {
    const [result] = await sql<{ count: string }[]>`
      SELECT COUNT(*) AS count FROM love
      WHERE "workspaceId" = ${workspace} AND _class IN ${sql(classes)}
        AND NOT (data @> ${patch}::jsonb)
    `
    return { updated: 0, wouldUpdate: Number(result.count) }
  }

  const result = await sql`
    UPDATE love SET data = data || ${patch}::jsonb, "%hash%" = ${Date.now().toString(16)}
    WHERE "workspaceId" = ${workspace} AND _class IN ${sql(classes)}
      AND NOT (data @> ${patch}::jsonb)
    RETURNING _id
  `
  return { updated: result.length, wouldUpdate: result.length }
}

export interface DisableMeetingRoomDefaultsResult {
  updated: number
  wouldUpdate: number
}

/**
 * Disables automatic recording and transcription for all meeting rooms.
 */
export async function disableMeetingRoomDefaults (
  ops: TxOperations,
  dryRun: boolean
): Promise<DisableMeetingRoomDefaultsResult> {
  const rooms = await ops.findAll(love.class.Room, {})
  const offices = await ops.findAll(love.class.Office, {})
  const processed = new Set<Ref<Room>>()
  let wouldUpdate = 0
  let updated = 0

  for (const room of [...rooms, ...offices]) {
    if (processed.has(room._id) || (!room.startWithRecording && !room.startWithTranscription)) {
      continue
    }
    processed.add(room._id)
    wouldUpdate++

    if (dryRun) {
      console.log('[dry-run] meeting room defaults', JSON.stringify({ id: room._id, name: room.name }))
      continue
    }

    await ops.update(room, {
      startWithRecording: false,
      startWithTranscription: false
    })
    updated++
  }

  return { updated, wouldUpdate }
}
