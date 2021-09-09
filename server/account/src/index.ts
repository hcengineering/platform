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
// limitations under the License.
//

import type { Plugin, StatusCode, Request, Response } from '@anticrm/platform'
import { PlatformError, Severity, Status, plugin, unknownStatus } from '@anticrm/platform'
import { Binary, Db, ObjectId } from 'mongodb'
import { pbkdf2Sync, randomBytes } from 'crypto'
import { encode } from 'jwt-simple'

const WORKSPACE_COLLECTION = 'workspace'
const ACCOUNT_COLLECTION = 'account'

const endpoint = 'wss://transactor.hc.engineering/'
const secret = 'secret'

/**
 * @public
 */
export const accountId = 'account' as Plugin

/**
 * @public
 */
const accountPlugin = plugin(accountId, {
  status: {
    AccountNotFound: '' as StatusCode<{account: string}>,
    WorkspaceNotFound: '' as StatusCode<{workspace: string}>,
    InvalidPassword: '' as StatusCode<{account: string}>,
    AccountAlreadyExists: '' as StatusCode<{account: string}>,
    WorkspaceAlreadyExists: '' as StatusCode<{workspace: string}>,
    Forbidden: '' as StatusCode
  }
})

/**
 * @public
 */
export interface Account {
  _id: ObjectId
  email: string
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

function generateToken (email: string, workspace: string): string {
  return encode({ email, workspace }, secret)
}

/**
 * @public
 * @param db -
 * @param email -
 * @param password -
 * @param workspace -
 * @returns
 */
export async function login (db: Db, email: string, password: string, workspace: string): Promise<LoginInfo> {
  const accountInfo = await getAccountInfo(db, email, password)
  const workspaceInfo = await getWorkspace(db, workspace)

  if (workspaceInfo !== null) {
    const workspaces = accountInfo.workspaces

    for (const w of workspaces) {
      if (w.equals(workspaceInfo._id)) {
        const result = {
          endpoint,
          email,
          token: generateToken(email, workspace)
        }
        return result
      }
    }
  }

  throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.Forbidden, {}))
}

/**
 * @public
 */
export async function createAccount (db: Db, email: string, password: string): Promise<AccountInfo> {
  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  const account = await getAccount(db, email)
  if (account !== null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.AccountAlreadyExists, { account: email }))
  }

  const insert = await db.collection(ACCOUNT_COLLECTION).insertOne({
    email,
    hash,
    salt,
    workspaces: []
  })

  return {
    _id: insert.insertedId,
    email,
    workspaces: []
  }
}

/**
 * @public
 */
export async function createWorkspace (db: Db, workspace: string, organisation: string): Promise<string> {
  if ((await getWorkspace(db, workspace)) !== null) {
    throw new PlatformError(new Status(Severity.ERROR, accountPlugin.status.WorkspaceAlreadyExists, { workspace }))
  }
  return await db
    .collection(WORKSPACE_COLLECTION)
    .insertOne({
      workspace,
      organisation
    })
    .then((e) => e.insertedId.toHexString())
}

async function getWorkspaceAndAccount (db: Db, email: string, workspace: string): Promise<{ accountId: ObjectId, workspaceId: ObjectId }> {
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
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: workspaceId }, { $push: { accounts: accountId } })

  // Add workspace to account
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: accountId }, { $push: { workspaces: workspaceId } })
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

function wrap (f: (db: Db, ...args: any[]) => Promise<any>) {
  return async function (db: Db, request: Request<any[]>): Promise<Response<any>> {
    return await f(db, ...request.params)
      .then((result) => ({ id: request.id, result }))
      .catch((err) => ({ error: unknownStatus(err) }))
  }
}

/**
 * @public
 */
export const methods = {
  login: wrap(login),
  getAccountInfo: wrap(getAccountInfo),
  createAccount: wrap(createAccount),
  createWorkspace: wrap(createWorkspace),
  assignWorkspace: wrap(assignWorkspace),
  removeWorkspace: wrap(removeWorkspace)
  // updateAccount: wrap(updateAccount)
}

export default accountPlugin
