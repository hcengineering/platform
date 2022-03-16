//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
// limitations under the f.
//

import contact, { combineName } from '@anticrm/contact'
import core, { TxOperations } from '@anticrm/core'
import platform, {
  getMetadata,
  PlatformError,
  Plugin,
  plugin,
  Request,
  Response,
  Severity,
  Status,
  StatusCode
} from '@anticrm/platform'
import toolPlugin, { connect, initModel, upgradeModel, version } from '@anticrm/server-tool'
import { decodeToken, generateToken } from '@anticrm/server-token'
import { pbkdf2Sync, randomBytes } from 'crypto'
import { Binary, Db, ObjectId } from 'mongodb'

const WORKSPACE_COLLECTION = 'workspace'
const ACCOUNT_COLLECTION = 'account'

/**
 * @public
 */
export const ACCOUNT_DB = 'account'

/**
 * @public
 */
export const accountId = 'account' as Plugin

/**
 * @public
 */
const accountPlugin = plugin(accountId, {
  status: {
    AccountNotFound: '' as StatusCode<{ account: string }>,
    WorkspaceNotFound: '' as StatusCode<{ workspace: string }>,
    InvalidPassword: '' as StatusCode<{ account: string }>,
    AccountAlreadyExists: '' as StatusCode<{ account: string }>,
    WorkspaceAlreadyExists: '' as StatusCode<{ workspace: string }>
  }
})

const getEndpoint = (): string => {
  const endpoint = getMetadata(toolPlugin.metadata.Endpoint)
  if (endpoint === undefined) {
    throw new Error('Please provide transactor endpoint url')
  }
  return endpoint
}

const getTransactor = (): string => {
  const transactor = getMetadata(toolPlugin.metadata.Transactor)
  if (transactor === undefined) {
    throw new Error('Please provide transactor url')
  }
  return transactor
}

/**
 * @public
 */
export interface Account {
  _id: ObjectId
  email: string
  first: string
  last: string
  hash: Binary
  salt: Binary
  workspaces: ObjectId[]
}

/**
 * @public
 */
export interface Workspace {
  _id: ObjectId
  workspace: string
  organisation: string
  accounts: ObjectId[]
}

/**
 * @public
 */
export interface LoginInfo {
  email: string
  token: string
  endpoint: string
}

/**
 * @public
 */
export type AccountInfo = Omit<Account, 'hash' | 'salt'>

function hashWithSalt (password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 1000, 32, 'sha256')
}

function verifyPassword (password: string, hash: Buffer, salt: Buffer): boolean {
  return Buffer.compare(hash, hashWithSalt(password, salt)) === 0
}

/**
 * @public
 */
export async function getAccount (db: Db, email: string): Promise<Account | null> {
  return await db.collection(ACCOUNT_COLLECTION).findOne<Account>({ email })
}

/**
 * @public
 * @param db -
 * @param workspace -
 * @returns
 */
export async function getWorkspace (db: Db, workspace: string): Promise<Workspace | null> {
  return await db.collection(WORKSPACE_COLLECTION).findOne<Workspace>({
    workspace
  })
}

function toAccountInfo (account: Account): AccountInfo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, salt, ...result } = account
  return result
}

async function getAccountInfo (db: Db, email: string, password: string): Promise<AccountInfo> {
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.AccountNotFound, { account: email }))
  }
  if (!verifyPassword(password, account.hash.buffer, account.salt.buffer)) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.InvalidPassword, { account: email }))
  }
  return toAccountInfo(account)
}

/**
 * @public
 * @param db -
 * @param email -
 * @param password -
 * @param workspace -
 * @returns
 */
export async function login (db: Db, email: string, password: string): Promise<LoginInfo> {
  await getAccountInfo(db, email, password)
  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, '')
  }
  return result
}

/**
 * @public
 */
export async function selectWorkspace (db: Db, token: string, workspace: string): Promise<LoginInfo> {
  const { email } = decodeToken(token)
  const accountInfo = await getAccount(db, email)
  if (accountInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.AccountNotFound, { account: email }))
  }
  const workspaceInfo = await getWorkspace(db, workspace)

  if (workspaceInfo !== null) {
    const workspaces = accountInfo.workspaces

    for (const w of workspaces) {
      if (w.equals(workspaceInfo._id)) {
        const result = {
          endpoint: getEndpoint(),
          email,
          token: generateToken(email, workspace)
        }
        return result
      }
    }
  }

  throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
}

/**
 * @public
 */
export async function join (db: Db, email: string, password: string, workspaceHash: string): Promise<LoginInfo> {
  const { workspace } = decodeToken(workspaceHash)
  const token = (await login(db, email, password)).token
  await assignWorkspace(db, email, workspace)

  return await selectWorkspace(db, token, workspace)
}

/**
 * @public
 */
export async function signUpJoin (
  db: Db,
  email: string,
  password: string,
  first: string,
  last: string,
  workspaceHash: string
): Promise<LoginInfo> {
  await createAccount(db, email, password, first, last)
  const { workspace } = decodeToken(workspaceHash)
  await assignWorkspace(db, email, workspace)

  const token = (await login(db, email, password)).token
  return await selectWorkspace(db, token, workspace)
}

/**
 * @public
 */
export async function createAccount (
  db: Db,
  email: string,
  password: string,
  first: string,
  last: string
): Promise<LoginInfo> {
  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  const account = await getAccount(db, email)
  if (account !== null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.AccountAlreadyExists, { account: email }))
  }

  await db.collection(ACCOUNT_COLLECTION).insertOne({
    email,
    hash,
    salt,
    first,
    last,
    workspaces: []
  })

  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, '')
  }
  return result
}

/**
 * @public
 */
export async function listWorkspaces (db: Db): Promise<Workspace[]> {
  return await db.collection<Workspace>(WORKSPACE_COLLECTION).find({}).toArray()
}

/**
 * @public
 */
export async function listAccounts (db: Db): Promise<Account[]> {
  return await db.collection<Account>(ACCOUNT_COLLECTION).find({}).toArray()
}

/**
 * @public
 */
export async function createWorkspace (db: Db, workspace: string, organisation: string): Promise<string> {
  if ((await getWorkspace(db, workspace)) !== null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.WorkspaceAlreadyExists, { workspace }))
  }
  const result = await db
    .collection(WORKSPACE_COLLECTION)
    .insertOne({
      workspace,
      organisation,
      version
    })
    .then((e) => e.insertedId.toHexString())
  await initModel(getTransactor(), workspace)
  return result
}

/**
 * @public
 */
export async function upgradeWorkspace (db: Db, workspace: string): Promise<string> {
  if ((await getWorkspace(db, workspace)) === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.WorkspaceNotFound, { workspace }))
  }
  await db.collection(WORKSPACE_COLLECTION).updateOne(
    { workspace },
    {
      $set: { version }
    }
  )
  await upgradeModel(getTransactor(), workspace)
  return `${version.major}.${version.minor}.${version.patch}`
}

/**
 * @public
 */
export async function createUserWorkspace (db: Db, token: string, workspace: string): Promise<LoginInfo> {
  const { email } = decodeToken(token)
  await createWorkspace(db, workspace, '')
  await assignWorkspace(db, email, workspace)
  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, workspace)
  }
  return result
}

/**
 * @public
 */
export async function getWorkspaceHash (db: Db, token: string): Promise<string> {
  const { workspace } = decodeToken(token)
  const wsPromise = await getWorkspace(db, workspace)
  if (wsPromise === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.WorkspaceNotFound, { workspace }))
  }
  return generateToken('', workspace)
}

/**
 * @public
 */
export async function getUserWorkspaces (db: Db, token: string): Promise<Workspace[]> {
  const { email } = decodeToken(token)
  const account = await getAccount(db, email)
  if (account === null) return []
  return await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .find({
      _id: { $in: account.workspaces }
    })
    .toArray()
}

async function getWorkspaceAndAccount (
  db: Db,
  email: string,
  workspace: string
): Promise<{ accountId: ObjectId, workspaceId: ObjectId }> {
  const wsPromise = await getWorkspace(db, workspace)
  if (wsPromise === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.WorkspaceNotFound, { workspace }))
  }
  const workspaceId = wsPromise._id
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.AccountNotFound, { account: email }))
  }
  const accountId = account._id
  return { accountId, workspaceId }
}

/**
 * @public
 */
export async function assignWorkspace (db: Db, email: string, workspace: string): Promise<void> {
  const { workspaceId, accountId } = await getWorkspaceAndAccount(db, email, workspace)
  // Add account into workspace.
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: workspaceId }, { $addToSet: { accounts: accountId } })

  // Add workspace to account
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: accountId }, { $addToSet: { workspaces: workspaceId } })

  const account = await db.collection<Account>(ACCOUNT_COLLECTION).findOne({ _id: accountId })

  if (account !== null) await createEmployeeAccount(account, workspace)
}

async function createEmployeeAccount (account: Account, workspace: string): Promise<void> {
  const connection = await connect(getTransactor(), workspace, false, account.email)
  try {
    const ops = new TxOperations(connection, core.account.System)

    const name = combineName(account.first, account.last)

    // Check if EmployeeAccoun is not exists
    const existingAccount = await ops.findOne(contact.class.EmployeeAccount, { email: account.email })

    if (existingAccount === undefined) {
      const employee = await ops.createDoc(contact.class.Employee, contact.space.Employee, {
        name,
        city: ''
      })

      await ops.createDoc(contact.class.EmployeeAccount, core.space.Model, {
        email: account.email,
        employee,
        name
      })
    } else {
      const employee = await ops.findOne(contact.class.Employee, { _id: existingAccount.employee })
      if (employee === undefined) {
        // Employee was deleted, let's restore it.
        const employeeId = await ops.createDoc(contact.class.Employee, contact.space.Employee, {
          name,
          city: ''
        })
        await ops.updateDoc(contact.class.EmployeeAccount, existingAccount.space, existingAccount._id, { employee: employeeId })
      }
    }
  } finally {
    await connection.close()
  }
}

/**
 * @public
 */
export async function changePassword (db: Db, token: string, oldPassword: string, password: string): Promise<void> {
  const { email } = decodeToken(token)
  const account = await getAccountInfo(db, email, oldPassword)

  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })
}

/**
 * @public
 */
export async function changeName (db: Db, token: string, first: string, last: string): Promise<void> {
  const { email } = decodeToken(token)
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.AccountNotFound, { account: email }))
  }

  await db.collection<Account>(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { first, last } })
  account.first = first
  account.last = last

  const workspaces = await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .find({ _id: { $in: account.workspaces } })
    .toArray()

  const promises: Promise<void>[] = []
  for (const ws of workspaces) {
    promises.push(updateEmployeeAccount(account, ws.workspace))
  }
  await Promise.all(promises)
}

async function updateEmployeeAccount (account: Account, workspace: string): Promise<void> {
  const connection = await connect(getTransactor(), workspace, false, account.email)
  try {
    const ops = new TxOperations(connection, core.account.System)

    const name = combineName(account.first, account.last)

    const employeeAccount = await ops.findOne(contact.class.EmployeeAccount, { email: account.email })
    if (employeeAccount === undefined) return

    await ops.update(employeeAccount, {
      name
    })

    const employee = await ops.findOne(contact.class.Employee, { _id: employeeAccount.employee })
    if (employee === undefined) return

    await ops.update(employee, {
      name
    })
  } finally {
    await connection.close()
  }
}

/**
 * @public
 */
export async function removeWorkspace (db: Db, email: string, workspace: string): Promise<void> {
  const { workspaceId, accountId } = await getWorkspaceAndAccount(db, email, workspace)

  // Add account into workspace.
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: workspaceId }, { $pull: { accounts: accountId } })

  // Add account a workspace
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: accountId }, { $pull: { workspaces: workspaceId } })
}

/**
 * @public
 */
export async function dropWorkspace (db: Db, workspace: string): Promise<void> {
  const ws = await getWorkspace(db, workspace)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.WorkspaceNotFound, { workspace }))
  }
  await db.collection(WORKSPACE_COLLECTION).deleteOne({ _id: ws._id })
  await db
    .collection<Account>(ACCOUNT_COLLECTION)
    .updateMany({ _id: { $in: ws.accounts ?? [] } }, { $pull: { workspaces: ws._id } })
}

/**
 * @public
 */
export async function dropAccount (db: Db, email: string): Promise<void> {
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.AccountNotFound, { account: email }))
  }
  await db.collection(ACCOUNT_COLLECTION).deleteOne({ _id: account._id })
  await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .updateMany({ _id: { $in: account.workspaces } }, { $pull: { accounts: account._id } })
}

function wrap (f: (db: Db, ...args: any[]) => Promise<any>) {
  return async function (db: Db, request: Request<any[]>, token?: string): Promise<Response<any>> {
    if (token !== undefined) request.params.unshift(token)
    return await f(db, ...request.params)
      .then((result) => ({ id: request.id, result }))
      .catch((err) => ({
        error:
          err instanceof PlatformError
            ? new Status(Severity.ERROR, platform.status.Forbidden, {})
            : new Status(Severity.ERROR, platform.status.InternalServerError, {})
      }))
  }
}

/**
 * @public
 */
export const methods = {
  login: wrap(login),
  join: wrap(join),
  signUpJoin: wrap(signUpJoin),
  selectWorkspace: wrap(selectWorkspace),
  getUserWorkspaces: wrap(getUserWorkspaces),
  getWorkspaceHash: wrap(getWorkspaceHash),
  getAccountInfo: wrap(getAccountInfo),
  createAccount: wrap(createAccount),
  createWorkspace: wrap(createUserWorkspace),
  assignWorkspace: wrap(assignWorkspace),
  removeWorkspace: wrap(removeWorkspace),
  listWorkspaces: wrap(listWorkspaces),
  changeName: wrap(changeName),
  changePassword: wrap(changePassword)
  // updateAccount: wrap(updateAccount)
}

export default accountPlugin
