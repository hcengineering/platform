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

import { SocialIdType, type AccountUuid } from '@hcengineering/core'
import type { Account, AccountDB, AccountLifecyclePatch, NewAdminAuditLogEntry } from '../../types'

export interface MemoryLifecycleDb {
  db: AccountDB
  accounts: Map<string, Partial<Account>>
  audit: NewAdminAuditLogEntry[]
  emails: Map<string, string> // email -> account uuid
}

/**
 * Minimal in-memory AccountDB for the account lifecycle RPCs. applyAccountLifecycle
 * mutates the stored rows like the real implementations do.
 */
export function createLifecycleDb (
  accounts: Array<Partial<Account> & { uuid: AccountUuid, email?: string }>
): MemoryLifecycleDb {
  const rows = new Map<string, Partial<Account>>()
  const emails = new Map<string, string>()
  for (const { email, ...account } of accounts) {
    rows.set(account.uuid, { tokenVersion: 0, disabledAt: null, ...account })
    if (email !== undefined) emails.set(email, account.uuid)
  }
  const audit: NewAdminAuditLogEntry[] = []

  const emailSocialId = (email: string, personUuid: string): any => ({
    _id: `sid-${email}`,
    type: SocialIdType.EMAIL,
    value: email,
    key: `email:${email}`,
    personUuid
  })

  const db = {
    account: {
      findOne: jest.fn(async (q: any) => {
        const row = rows.get(q.uuid)
        return row === undefined ? null : { ...row }
      }),
      update: jest.fn(async () => undefined)
    },
    socialId: {
      find: jest.fn(async (q: any) =>
        [...emails.entries()]
          .filter(([, uuid]) => uuid === q.personUuid)
          .map(([email, uuid]) => emailSocialId(email, uuid))
      ),
      findOne: jest.fn(async (q: any) => {
        if (q.type !== SocialIdType.EMAIL) return null
        const uuid = emails.get(q.value)
        return uuid === undefined ? null : emailSocialId(q.value, uuid)
      })
    },
    apiToken: {
      findOne: jest.fn(async (q: any) => ({
        id: q.id,
        revoked: false,
        expiresOn: Date.now() + 86400000
      }))
    },
    adminAuditLog: {
      insert: jest.fn(async (entry: NewAdminAuditLogEntry) => {
        audit.push(entry)
      })
    },
    applyAccountLifecycle: jest.fn(
      async (uuid: AccountUuid, patch: AccountLifecyclePatch, entry: NewAdminAuditLogEntry) => {
        const row = rows.get(uuid)
        if (row !== undefined) {
          row.disabledAt = patch.disabledAt
          if (patch.bumpTokenVersion) row.tokenVersion = (row.tokenVersion ?? 0) + 1
        }
        audit.push(entry)
      }
    )
  } as unknown as AccountDB

  return { db, accounts: rows, audit, emails }
}
