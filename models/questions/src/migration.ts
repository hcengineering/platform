//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type MigrateOperation, type MigrationClient, type MigrationUpgradeClient } from '@hcengineering/model'

export const questionsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},

  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
