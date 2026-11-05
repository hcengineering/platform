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

import { getAccountDB, type AccountDB } from '@hcengineering/account'
import { withAccountDatabaseCommand } from './account-database-command'

jest.mock('@hcengineering/account', () => ({ getAccountDB: jest.fn() }))

describe('withAccountDatabaseCommand', () => {
  const originalExitCode = process.exitCode
  const db: Partial<AccountDB> = {}
  const getAccountDBMock = jest.mocked(getAccountDB)

  beforeEach(() => {
    process.exitCode = undefined
    getAccountDBMock.mockReset()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.exitCode = originalExitCode
    jest.restoreAllMocks()
  })

  it('sets a failure exit code when opening the account database fails', async () => {
    const error = new Error('Account database unavailable')
    getAccountDBMock.mockRejectedValue(error)
    const action = jest.fn()

    await withAccountDatabaseCommand(action, 'postgresql://accounts')

    expect(process.exitCode).toBe(1)
    expect(action).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Account database command failed', { error })
  })

  it.each(['Workspace status query failed', 'PostgreSQL client setup failed'])(
    'sets a failure exit code and closes account storage when processing fails: %s',
    async (message) => {
      const close = jest.fn()
      getAccountDBMock.mockResolvedValue([db as AccountDB, close])
      const action = jest.fn(async () => {
        throw new Error(message)
      })

      await withAccountDatabaseCommand(action, 'postgresql://accounts', 'account-namespace')

      expect(process.exitCode).toBe(1)
      expect(close).toHaveBeenCalledTimes(1)
      expect(getAccountDBMock).toHaveBeenCalledWith('postgresql://accounts', 'account-namespace')
    }
  )

  it('preserves successful execution and closes account storage', async () => {
    const close = jest.fn()
    const action = jest.fn(async () => {})
    getAccountDBMock.mockResolvedValue([db as AccountDB, close])

    await withAccountDatabaseCommand(action, 'postgresql://accounts')

    expect(process.exitCode).toBeUndefined()
    expect(action).toHaveBeenCalledWith(db)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
