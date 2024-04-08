import { dropWorkspace, setWorkspaceDisabled, type Workspace } from '@hcengineering/account'
import core, { AccountRole, type MeasureContext, MeasureMetricsContext, SortingOrder } from '@hcengineering/core'
import contact from '@hcengineering/model-contact'
import { getWorkspaceDB } from '@hcengineering/mongo'
import { type StorageAdapter } from '@hcengineering/server-core'
import { connect } from '@hcengineering/server-tool'
import { type Db, type MongoClient } from 'mongodb'

export async function checkOrphanWorkspaces (
  ctx: MeasureContext,
  workspaces: Workspace[],
  transactorUrl: string,
  productId: string,
  cmd: { remove: boolean, disable: boolean },
  db: Db,
  client: MongoClient,
  storageAdapter: StorageAdapter,
  excludes: string[]
): Promise<void> {
  for (const ws of workspaces) {
    if (excludes.includes(ws.workspace) || (ws.workspaceUrl != null && excludes.includes(ws.workspaceUrl))) {
      continue
    }
    if ((ws.accounts ?? []).length === 0) {
      // Potential orhpan workspace
      // Let's connect and check activity.
      const connection = await connect(transactorUrl, { name: ws.workspace, productId }, undefined, { admin: 'true' })

      const accounts = await connection.findAll(contact.class.PersonAccount, {})
      const employees = await connection.findAll(contact.mixin.Employee, {})
      let activeOwners = 0
      for (const person of employees) {
        const account = accounts.find((it) => it.person === person._id)
        if (account !== undefined) {
          if (account.role === AccountRole.Owner && person.active) {
            activeOwners++
          }
          // console.log('-----------', person.name, person.active, account.email, account.role)
        }
      }

      // Find last transaction index:
      const wspace = { name: ws.workspace, productId }
      const hasBucket = await storageAdapter.exists(ctx, wspace)
      const [lastTx] = await connection.findAll(
        core.class.Tx,
        {
          objectSpace: { $ne: core.space.Model },
          createdBy: { $nin: [core.account.System, core.account.ConfigUser] },
          modifiedBy: { $ne: core.account.System }
        },
        { limit: 1, sort: { modifiedOn: SortingOrder.Descending } }
      )

      await connection.close()
      const lastTxHours = Math.floor((Date.now() - (lastTx?.modifiedOn ?? 0)) / 1000 / 60 / 60)
      if (((activeOwners === 0 || lastTx == null) && lastTxHours > 1000) || !hasBucket) {
        const createdOn = (ws.createdOn ?? 0) !== 0 ? new Date(ws.createdOn).toDateString() : ''
        console.log(
          'Found orhpan workspace',
          `'${ws.workspaceName}' id: '${ws.workspace}' url:${ws.workspaceUrl} by: ${ws.createdBy ?? ''} on: '${createdOn}'`,
          lastTxHours + ' hours without modifications',
          hasBucket
        )
        if (cmd.disable) {
          await setWorkspaceDisabled(db, ws._id, true)
        }
        if (cmd.remove) {
          await dropWorkspace(new MeasureMetricsContext('tool', {}), db, productId, ws.workspace)
          const workspaceDb = getWorkspaceDB(client, { name: ws.workspace, productId })
          await workspaceDb.dropDatabase()
          if (storageAdapter !== undefined && hasBucket) {
            const docs = await storageAdapter.list(ctx, wspace)
            await storageAdapter.remove(
              ctx,
              wspace,
              docs.map((it) => it._id)
            )
            await storageAdapter.delete(ctx, wspace)
          }
        }
      }
    }
  }
}
