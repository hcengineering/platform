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

import type { AccountDB, SocialId } from '@hcengineering/account'
import { MeasureMetricsContext } from '@hcengineering/core'

import { restoreSocialIds } from '../restore'

interface MockDb {
  accountDb: AccountDB
  inserted: any[]
}

function createMockAccountDb (existingPersonUuids: string[], existingSocialIdKeys: string[] = []): MockDb {
  const inserted: any[] = []
  const accountDb = {
    person: {
      find: jest.fn(async (query: any) =>
        (query.uuid.$in as string[]).filter((uuid) => existingPersonUuids.includes(uuid)).map((uuid) => ({ uuid }))
      )
    },
    socialId: {
      find: jest.fn(async (query: any) =>
        (query.key.$in as string[]).filter((key) => existingSocialIdKeys.includes(key)).map((key) => ({ key }))
      ),
      insertMany: jest.fn(async (docs: any[]) => {
        inserted.push(...docs)
        return docs.map((it) => it._id)
      })
    }
  } as unknown as AccountDB
  return { accountDb, inserted }
}

function socialId (id: string, key: string, personUuid: string): SocialId {
  return {
    _id: id,
    key,
    personUuid,
    type: 'email',
    value: key
  } as unknown as SocialId
}

const ctx = new MeasureMetricsContext('test', {})

describe('restoreSocialIds', () => {
  it('skips social ids referencing missing persons and inserts the rest', async () => {
    const { accountDb, inserted } = createMockAccountDb(['person-1'])

    await restoreSocialIds(ctx, accountDb, [
      socialId('sid-1', 'email:a@b.c', 'person-1'),
      socialId('sid-2', 'email:orphan@b.c', 'person-missing')
    ])

    expect(inserted).toHaveLength(1)
    expect(inserted[0]._id).toBe('sid-1')
  })

  it('does not insert social ids which already exist', async () => {
    const { accountDb, inserted } = createMockAccountDb(['person-1'], ['email:a@b.c'])

    await restoreSocialIds(ctx, accountDb, [socialId('sid-1', 'email:a@b.c', 'person-1')])

    expect(inserted).toHaveLength(0)
    expect((accountDb.socialId.insertMany as jest.Mock).mock.calls).toHaveLength(0)
  })

  it('does not call insertMany when all social ids are orphaned', async () => {
    const { accountDb, inserted } = createMockAccountDb([])

    await restoreSocialIds(ctx, accountDb, [socialId('sid-1', 'email:a@b.c', 'person-missing')])

    expect(inserted).toHaveLength(0)
    expect((accountDb.socialId.insertMany as jest.Mock).mock.calls).toHaveLength(0)
  })

  it('strips key and %hash% from inserted records', async () => {
    const { accountDb, inserted } = createMockAccountDb(['person-1'])
    const sid = { ...socialId('sid-1', 'email:a@b.c', 'person-1'), '%hash%': 'abc' }

    await restoreSocialIds(ctx, accountDb, [sid])

    expect(inserted).toHaveLength(1)
    expect(inserted[0].key).toBeUndefined()
    expect(inserted[0]['%hash%']).toBeUndefined()
  })
})
