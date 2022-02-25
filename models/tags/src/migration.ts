import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'

export const tagsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
  }
}
