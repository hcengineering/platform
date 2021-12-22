//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import {
  MigrateOperation,
  MigrationClient,
  MigrationResult,
  MigrationUpgradeClient
} from '@anticrm/model'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Task: Migrate ${msg} ${result.updated}`)
  }
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
