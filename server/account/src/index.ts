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

import type { Plugin, StatusCode } from '@anticrm/platform'
import { PlatformError, Severity, Status, plugin } from '@anticrm/platform'
import { Binary, Db, ObjectId } from 'mongodb'
import { pbkdf2Sync } from 'crypto'
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
    InvalidPassword: '' as StatusCode<{account: string}>,
    Forbidden: '' as StatusCode
  }
})

interface Account {
  _id: ObjectId
  email: string
  hash: Binary
  salt: Binary
  workspaces: ObjectId[]
}

interface Workspace {
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

type AccountInfo = Omit<Account, 'hash' | 'salt'>

function hashWithSalt (password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 1000, 32, 'sha256')
}

function verifyPassword (password: string, hash: Buffer, salt: Buffer): boolean {
  return Buffer.compare(hash, hashWithSalt(password, salt)) === 0
}

async function getAccount (db: Db, email: string): Promise<Account | null> {
  return await db.collection(ACCOUNT_COLLECTION).findOne<Account>({ email })
}

async function getWorkspace (db: Db, workspace: string): Promise<Workspace | null> {
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

export default accountPlugin
