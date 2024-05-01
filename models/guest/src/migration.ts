import {
  type Account,
  AccountRole,
  DOMAIN_TX,
  type TxCreateDoc,
  TxOperations,
  type TxUpdateDoc
} from '@hcengineering/core'
import { guestId } from '@hcengineering/guest'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  type ModelLogger,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import core from '@hcengineering/model-core'
import guest from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: guest.space.Links
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Links',
        description: 'Space for all guest links',
        private: false,
        archived: false,
        members: []
      },
      guest.space.Links
    )
  }
}

async function createDefaults (client: MigrationUpgradeClient): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  await createSpace(txOp)
}
