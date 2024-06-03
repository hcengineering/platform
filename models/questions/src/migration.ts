//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type MigrateOperation, type MigrationClient, type MigrationUpgradeClient } from '@hcengineering/model'

export const questionsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},

  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
