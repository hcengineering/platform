import { type Account, changeEmail, getAccount, listWorkspacesPure, type Workspace } from '@hcengineering/account'
import core, { type MeasureContext, TxOperations } from '@hcengineering/core'
import contact from '@hcengineering/model-contact'
import { connect } from '@hcengineering/server-tool'
import { type Db } from 'mongodb'

export async function renameAccount (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  transactorUrl: string,
  oldEmail: string,
  newEmail: string
): Promise<void> {
  const account = await getAccount(db, oldEmail)
  if (account == null) {
    throw new Error("Account does'n exists")
  }

  const newAccount = await getAccount(db, newEmail)
  if (newAccount != null) {
    throw new Error('New Account email already exists:' + newAccount?.email + ' ' + newAccount?._id?.toString())
  }

  await changeEmail(ctx, db, account, newEmail)

  await fixWorkspaceEmails(account, db, productId, transactorUrl, oldEmail, newEmail)
}

export async function fixAccountEmails (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  transactorUrl: string,
  oldEmail: string,
  newEmail: string
): Promise<void> {
  const account = await getAccount(db, newEmail)
  if (account == null) {
    throw new Error("Account does'n exists")
  }

  await fixWorkspaceEmails(account, db, productId, transactorUrl, oldEmail, newEmail)
}
async function fixWorkspaceEmails (
  account: Account,
  db: Db,
  productId: string,
  transactorUrl: string,
  oldEmail: string,
  newEmail: string
): Promise<void> {
  const accountWorkspaces = account.workspaces.map((it) => it.toString())
  // We need to update all workspaces
  const workspaces = await listWorkspacesPure(db, productId)
  for (const ws of workspaces) {
    if (!accountWorkspaces.includes(ws._id.toString())) {
      continue
    }
    console.log('checking workspace', ws.workspaceName, ws.workspace)

    // Let's connect and update account information.
    await fixEmailInWorkspace(transactorUrl, ws, oldEmail, newEmail)
  }
}

async function fixEmailInWorkspace (
  transactorUrl: string,
  ws: Workspace,
  oldEmail: string,
  newEmail: string
): Promise<void> {
  const connection = await connect(transactorUrl, { name: ws.workspace, productId: ws.productId }, undefined, {
    mode: 'backup',
    model: 'upgrade', // Required for force all clients reload after operation will be complete.
    admin: 'true'
  })
  try {
    const personAccount = await connection.findOne(contact.class.PersonAccount, { email: oldEmail })

    if (personAccount !== undefined) {
      console.log('update account in ', ws.workspace)
      const ops = new TxOperations(connection, core.account.ConfigUser)
      await ops.update(personAccount, { email: newEmail })
    }
  } catch (err: any) {
    console.error(err)
  } finally {
    await connection.close()
  }
}
