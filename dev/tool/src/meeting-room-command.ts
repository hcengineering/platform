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
import { InvalidArgumentError } from 'commander'

/** Parses an explicitly provided include filter without allowing an empty selection. */
export function parseIncludedWorkspaces (value: string): string[] {
  const workspaces = value
    .split(',')
    .map((workspace) => workspace.trim())
    .filter(Boolean)
  if (workspaces.length === 0) {
    throw new InvalidArgumentError('At least one workspace UUID or URL must be provided')
  }
  return workspaces
}

/** Runs the command with account storage and reports setup, processing and cleanup failures. */
export async function withMeetingRoomDatabase (
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
    console.error('configure-meeting-room-defaults: command failed', { error })
  }
}
