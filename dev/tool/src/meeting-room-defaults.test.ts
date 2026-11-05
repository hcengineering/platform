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

import { type WorkspaceUuid } from '@hcengineering/core'
import love from '@hcengineering/love'
import { type Sql } from 'postgres'
import { updateMeetingRoomDefaults } from './meeting-rooms'

const WORKSPACE = 'workspace-one' as WorkspaceUuid

function mockSql (rows: object[]): { sql: Sql, query: jest.Mock, json: jest.Mock } {
  const query = jest.fn(async (_statement: string, _values: unknown[]) => rows)
  const json = jest.fn((value: object) => value)
  const sql = Object.assign(
    (strings: TemplateStringsArray | string[], ...values: unknown[]) => {
      if (!('raw' in strings)) return strings
      return query(strings.join('?'), values)
    },
    { json }
  )
  return { sql: sql as unknown as Sql, query, json }
}

describe('updateMeetingRoomDefaults', () => {
  it('counts changes without writing in dry-run mode', async () => {
    const { sql, query, json } = mockSql([{ count: '3' }])

    const result = await updateMeetingRoomDefaults(sql, WORKSPACE, { startWithRecording: false }, true)

    expect(result).toEqual({ updated: 0, wouldUpdate: 3 })
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toContain('SELECT COUNT(*)')
    expect(query.mock.calls[0][0]).not.toContain('UPDATE')
    expect(query.mock.calls[0][1]).toEqual([
      WORKSPACE,
      [love.class.Room, love.class.Office],
      { startWithRecording: false }
    ])
    expect(json).toHaveBeenCalledWith({ startWithRecording: false })
  })

  it.each([
    { startWithRecording: true },
    { startWithTranscription: false },
    { startWithRecording: false, startWithTranscription: true }
  ])('applies only the specified defaults: %o', async (defaults) => {
    const { sql, query, json } = mockSql([{ _id: 'room-one' }, { _id: 'office-one' }])

    const result = await updateMeetingRoomDefaults(sql, WORKSPACE, defaults, false)

    expect(result).toEqual({ updated: 2, wouldUpdate: 2 })
    expect(json).toHaveBeenCalledWith(defaults)
    expect(query.mock.calls[0][0]).toContain('UPDATE love SET data = data ||')
    expect(query.mock.calls[0][0]).toContain('"%hash%" =')
    expect(query.mock.calls[0][0]).toContain('AND NOT (data @>')
    expect(query.mock.calls[0][1]).toEqual([
      defaults,
      expect.any(String),
      WORKSPACE,
      [love.class.Room, love.class.Office],
      defaults
    ])
  })

  it('rejects an empty update before accessing the database', async () => {
    const { sql, query } = mockSql([])

    await expect(updateMeetingRoomDefaults(sql, WORKSPACE, {}, false)).rejects.toThrow('At least one')
    expect(query).not.toHaveBeenCalled()
  })
})
