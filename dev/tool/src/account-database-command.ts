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

/** Runs the command with account storage and reports setup, processing and cleanup failures. */
export async function withAccountDatabaseCommand (
  action: (db: AccountDB) => Promise<void>,
  dbUrl: string,
  namespace?: string
): Promise<void> {
  try {
    const [db, close] = await getAccountDB(dbUrl, namespace)
    try {
      await action(db)
    } finally {
      close()
    }
  } catch (error) {
    process.exitCode = 1
    console.error('Account database command failed', { error })
  }
}
