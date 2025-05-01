//
// Copyright © 2024 Hardcore Engineering Inc.
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

import drive from '@hcengineering/drive'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  createDefaultSpace,
  tryUpgrade
} from '@hcengineering/model'
import { recorderId } from '@hcengineering/recorder'
import recorder from './plugin'

export const recorderOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {},
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, recorderId, [
      {
        state: 'create-drive',
        func: async (client) => {
          await createDefaultSpace(
            client,
            recorder.space.Drive,
            {
              name: 'Screen Recordings',
              description: 'Screen recordings',
              type: drive.spaceType.DefaultDrive,
              autoJoin: true
            },
            drive.class.Drive
          )
        }
      }
    ])
  }
}
