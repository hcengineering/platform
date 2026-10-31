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

import { getMigrations } from '../collections/postgres/migrations'

describe('account db migrations', () => {
  it.each(['postgres', 'cockroach'] as const)('adds persistent OTP resend reservations (%s)', (flavor) => {
    const migration = getMigrations('global_account', flavor).find(
      ([name]) => name === 'account_db_v29_add_otp_retry_on'
    )

    expect(migration).toBeDefined()
    const timestampType = flavor === 'postgres' ? 'BIGINT' : 'INT8'
    expect(migration?.[1].replace(/\s+/g, ' ').trim()).toBe(
      `ALTER TABLE global_account.social_id ADD COLUMN IF NOT EXISTS otp_retry_on ${timestampType};`
    )
  })

  it.each(['postgres', 'cockroach'] as const)('initializes OTP attempt counters for existing rows (%s)', (flavor) => {
    const migration = getMigrations('global_account', flavor).find(
      ([name]) => name === 'account_db_v28_add_otp_attempts'
    )

    expect(migration).toBeDefined()
    const counterType = flavor === 'postgres' ? 'INTEGER' : 'INT4'
    expect(migration?.[1].replace(/\s+/g, ' ').trim()).toBe(
      `ALTER TABLE global_account.otp ADD COLUMN IF NOT EXISTS attempts ${counterType} NOT NULL DEFAULT 0;`
    )
  })

  const splitStatements = (ddl: string): string[] =>
    ddl
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter((s) => s.length > 0)

  it.each(['postgres', 'cockroach'] as const)(
    'replaces the social_id primary key in a single statement (%s)',
    (flavor) => {
      const migration = getMigrations('global_account', flavor).find(
        ([name]) => name === 'account_db_v2_social_id_pk_change'
      )
      expect(migration).toBeDefined()

      const pkStatements = splitStatements(migration?.[1] ?? '').filter((s) => s.includes('social_id_pk'))
      expect(pkStatements).toEqual([
        'ALTER TABLE global_account.social_id DROP CONSTRAINT IF EXISTS social_id_pk, ADD CONSTRAINT social_id_pk PRIMARY KEY (_id)'
      ])
    }
  )
})
