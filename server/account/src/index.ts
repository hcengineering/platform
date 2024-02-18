//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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

import contact, {
  AvatarType,
  buildGravatarId,
  checkHasGravatar,
  combineName,
  Employee,
  getAvatarColorForId,
  Person,
  PersonAccount
} from '@hcengineering/contact'
import core, {
  AccountRole,
  Client,
  concatLink,
  Data,
  generateId,
  getWorkspaceId,
  Ref,
  systemAccountEmail,
  Tx,
  TxOperations,
  Version,
  versionToString,
  WorkspaceId
} from '@hcengineering/core'
import { consoleModelLogger, MigrateOperation, ModelLogger } from '@hcengineering/model'
import platform, { getMetadata, PlatformError, Severity, Status, translate } from '@hcengineering/platform'
import { cloneWorkspace } from '@hcengineering/server-backup'
import { decodeToken, generateToken } from '@hcengineering/server-token'
import toolPlugin, { connect, initModel, upgradeModel } from '@hcengineering/server-tool'
import { pbkdf2Sync, randomBytes } from 'crypto'
import { Binary, Db, Filter, ObjectId } from 'mongodb'
import fetch from 'node-fetch'
import accountPlugin from './plugin'

const WORKSPACE_COLLECTION = 'workspace'
const ACCOUNT_COLLECTION = 'account'
const INVITE_COLLECTION = 'invite'

/**
 * @public
 */
export const ACCOUNT_DB = 'account'

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
  hash: Binary
  salt: Binary
  workspaces: ObjectId[]
  // Defined for server admins only
  first: string
  last: string
  admin?: boolean
  confirmed?: boolean
  lastWorkspace?: number
}

/**
 * @public
 */
export interface Workspace {
  _id: ObjectId
  workspace: string // An uniq workspace name, Database names
  accounts: ObjectId[]
  productId: string
  disabled?: boolean
  version?: Data<Version>

  workspaceUrl?: string | null // An optional url to the workspace, if not set workspace will be used
  workspaceName?: string // An displayed workspace name
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
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
  productId: string
}

/**
 * @public
 */
export interface Invite {
  _id: ObjectId
  workspace: WorkspaceId
  exp: number
  emailMask: string
  limit: number
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

function cleanEmail (email: string): string {
  return email.toLowerCase().trim()
}

/**
 * @public
 */
export async function getAccount (db: Db, email: string): Promise<Account | null> {
  return await db.collection(ACCOUNT_COLLECTION).findOne<Account>({ email: cleanEmail(email) })
}

/**
 * @public
 */
export async function setAccountAdmin (db: Db, email: string, admin: boolean): Promise<void> {
  const account = await getAccount(db, email)
  if (account === null) {
    return
  }
  // Add workspace to account
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { admin } })
}

function withProductId (productId: string, query: Filter<Workspace>): Filter<Workspace> {
  return productId === ''
    ? {
        $or: [
          { productId: '', ...query },
          { productId: { $exists: false }, ...query }
        ]
      }
    : { productId, ...query }
}
/**
 * @public
 * @param db -
 * @param workspaceUrl -
 * @returns
 */
export async function getWorkspaceByUrl (db: Db, productId: string, workspaceUrl: string): Promise<Workspace | null> {
  const res = await db.collection<Workspace>(WORKSPACE_COLLECTION).findOne(withProductId(productId, { workspaceUrl }))
  if (res != null) {
    return res
  }
  // Fallback to old workspaces.
  return await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .findOne(withProductId(productId, { workspace: workspaceUrl, workspaceUrl: { $exists: false } }))
}

/**
 * @public
 * @param db -
 * @param workspace -
 * @returns
 */
export async function getWorkspaceById (db: Db, productId: string, workspace: string): Promise<Workspace | null> {
  return await db.collection<Workspace>(WORKSPACE_COLLECTION).findOne(withProductId(productId, { workspace }))
}

function toAccountInfo (account: Account): AccountInfo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, salt, ...result } = account
  return result
}

async function getAccountInfo (db: Db, email: string, password: string): Promise<AccountInfo> {
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  if (!verifyPassword(password, Buffer.from(account.hash.buffer), Buffer.from(account.salt.buffer))) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidPassword, { account: email }))
  }
  return toAccountInfo(account)
}

async function getAccountInfoByToken (db: Db, productId: string, token: string): Promise<AccountInfo> {
  let email: string = ''
  try {
    email = decodeToken(token)?.email
  } catch (err: any) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Unauthorized, {}))
  }
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const res = toAccountInfo(account)
  res.confirmed = res.confirmed ?? true
  return res
}

/**
 * @public
 * @param db -
 * @param email -
 * @param password -
 * @param workspace -
 * @returns
 */
export async function login (db: Db, productId: string, _email: string, password: string): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  console.log(`login attempt:${email}`)
  const info = await getAccountInfo(db, email, password)
  const result = {
    endpoint: getEndpoint(),
    email,
    confirmed: info.confirmed ?? true,
    token: generateToken(email, getWorkspaceId('', productId), getExtra(info))
  }
  return result
}

/**
 * Will add extra props
 */
function getExtra (info: Account | AccountInfo | null, rec?: Record<string, any>): Record<string, any> | undefined {
  const res = rec ?? {}
  if (info?.admin === true) {
    res.admin = 'true'
  }
  res.confirmed = info?.confirmed ?? true
  return res
}

/**
 * @public
 */
export async function selectWorkspace (
  db: Db,
  productId: string,
  token: string,
  workspaceUrl: string,
  allowAdmin: boolean = true
): Promise<WorkspaceLoginInfo> {
  let { email } = decodeToken(token)
  email = cleanEmail(email)
  const accountInfo = await getAccount(db, email)
  if (accountInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const workspaceInfo = await getWorkspaceByUrl(db, productId, workspaceUrl)
  if (workspaceInfo == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl }))
  }
  if (accountInfo.admin === true && allowAdmin) {
    return {
      endpoint: getEndpoint(),
      email,
      token: generateToken(email, getWorkspaceId(workspaceInfo.workspace, productId), getExtra(accountInfo)),
      workspace: workspaceUrl,
      productId
    }
  }

  if (workspaceInfo !== null) {
    if (workspaceInfo.disabled === true) {
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl })
      )
    }
    const workspaces = accountInfo.workspaces

    for (const w of workspaces) {
      if (w.equals(workspaceInfo._id)) {
        const result = {
          endpoint: getEndpoint(),
          email,
          token: generateToken(email, getWorkspaceId(workspaceInfo.workspace, productId), getExtra(accountInfo)),
          workspace: workspaceUrl,
          productId
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
export async function getInvite (db: Db, inviteId: ObjectId): Promise<Invite | null> {
  return await db.collection(INVITE_COLLECTION).findOne<Invite>({ _id: new ObjectId(inviteId) })
}

/**
 * @public
 */
export async function checkInvite (invite: Invite | null, email: string): Promise<WorkspaceId> {
  if (invite === null || invite.limit === 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  if (invite.exp < Date.now()) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.ExpiredLink, {}))
  }
  if (!new RegExp(invite.emailMask).test(email)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return invite.workspace
}

/**
 * @public
 */
export async function useInvite (db: Db, inviteId: ObjectId): Promise<void> {
  await db.collection(INVITE_COLLECTION).updateOne({ _id: inviteId }, { $inc: { limit: -1 } })
}

/**
 * @public
 */
export async function join (
  db: Db,
  productId: string,
  _email: string,
  password: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const email = cleanEmail(_email)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(invite, email)
  console.log(`join attempt:${email}, ${workspace.name}`)
  const ws = await assignWorkspace(db, productId, email, workspace.name)

  const token = (await login(db, productId, email, password)).token
  const result = await selectWorkspace(db, productId, token, ws.workspaceUrl ?? ws.workspace)
  await useInvite(db, inviteId)
  return result
}

/**
 * @public
 */
export async function confirmEmail (db: Db, _email: string): Promise<Account> {
  const email = cleanEmail(_email)
  const account = await getAccount(db, email)
  console.log(`confirm email:${email}`)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: _email }))
  }
  if (account.confirmed === true) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyConfirmed, { account: _email }))
  }

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { confirmed: true } })
  account.confirmed = true
  return account
}

/**
 * @public
 */
export async function confirm (db: Db, productId: string, token: string): Promise<LoginInfo> {
  const decode = decodeToken(token)
  const _email = decode.extra?.confirm
  if (_email === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: _email }))
  }
  const email = cleanEmail(_email)
  const account = await confirmEmail(db, email)

  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, getWorkspaceId('', productId), getExtra(account))
  }
  return result
}

async function sendConfirmation (productId: string, account: Account): Promise<void> {
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    console.info('Please provide email service url to enable email confirmations.')
    return
  }
  const front = getMetadata(accountPlugin.metadata.FrontURL)
  if (front === undefined || front === '') {
    throw new Error('Please provide front url')
  }

  const token = generateToken(
    '@confirm',
    getWorkspaceId('', productId),
    getExtra(account, {
      confirm: account.email
    })
  )

  const link = concatLink(front, `/login/confirm?id=${token}`)

  const name = getMetadata(accountPlugin.metadata.ProductName)
  const text = await translate(accountPlugin.string.ConfirmationText, { name, link })
  const html = await translate(accountPlugin.string.ConfirmationHTML, { name, link })
  const subject = await translate(accountPlugin.string.ConfirmationSubject, { name })

  if (sesURL !== undefined && sesURL !== '') {
    const to = account.email
    await fetch(concatLink(sesURL, '/send'), {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        html,
        subject,
        to
      })
    })
  }
}

/**
 * @public
 */
export async function signUpJoin (
  db: Db,
  productId: string,
  _email: string,
  password: string,
  first: string,
  last: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const email = cleanEmail(_email)
  console.log(`signup join:${email} ${first} ${last}`)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(invite, email)
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  await createAcc(
    db,
    productId,
    email,
    password,
    first,
    last,
    invite?.emailMask === email || sesURL === undefined || sesURL === ''
  )
  const ws = await assignWorkspace(db, productId, email, workspace.name)

  const token = (await login(db, productId, email, password)).token
  const result = await selectWorkspace(db, productId, token, ws.workspaceUrl ?? ws.workspace)
  await useInvite(db, inviteId)
  return result
}

/**
 * @public
 */
export async function createAcc (
  db: Db,
  productId: string,
  _email: string,
  password: string,
  first: string,
  last: string,
  confirmed: boolean = false
): Promise<Account> {
  const email = cleanEmail(_email)
  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  const systemEmails = [systemAccountEmail]
  if (systemEmails.includes(email)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, { account: email }))
  }

  const account = await getAccount(db, email)
  if (account !== null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, { account: email }))
  }

  await db.collection(ACCOUNT_COLLECTION).insertOne({
    email,
    hash,
    salt,
    first,
    last,
    confirmed,
    workspaces: []
  })

  const newAccount = await getAccount(db, email)
  if (newAccount === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, { account: email }))
  }
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (!confirmed) {
    if (sesURL !== undefined && sesURL !== '') {
      await sendConfirmation(productId, newAccount)
    } else {
      console.info('Please provide email service url to enable email confirmations.')
      await confirmEmail(db, email)
    }
  }
  return newAccount
}

/**
 * @public
 */
export async function createAccount (
  db: Db,
  productId: string,
  _email: string,
  password: string,
  first: string,
  last: string
): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  const account = await createAcc(db, productId, email, password, first, last, sesURL === undefined || sesURL === '')

  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, getWorkspaceId('', productId), getExtra(account))
  }
  return result
}

/**
 * @public
 */
export async function listWorkspaces (db: Db, productId: string): Promise<WorkspaceInfo[]> {
  return (await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, {})).toArray())
    .map((it) => ({ ...it, productId }))
    .filter((it) => it.disabled !== true)
    .map(trimWorkspaceInfo)
}

/**
 * @public
 */
export async function listAccounts (db: Db): Promise<Account[]> {
  return await db.collection<Account>(ACCOUNT_COLLECTION).find({}).toArray()
}

const workspaceReg = /[a-z0-9]/
const workspaceRegDigit = /[0-9]/

function stripId (name: string): string {
  let workspaceId = ''
  for (const c of name.toLowerCase()) {
    if (workspaceReg.test(c) || c === '-') {
      if (workspaceId.length > 0 || !workspaceRegDigit.test(c)) {
        workspaceId += c
      }
    }
  }
  return workspaceId
}

function getEmailName (email: string): string {
  return email.split('@')[0]
}

async function generateWorkspaceRecord (
  db: Db,
  email: string,
  productId: string,
  version: Data<Version>,
  workspaceName: string,
  fixedWorkspace?: string
): Promise<Workspace> {
  const coll = db.collection<Omit<Workspace, '_id'>>(WORKSPACE_COLLECTION)
  if (fixedWorkspace !== undefined) {
    const ws = await coll.find<Workspace>({ workspaceUrl: fixedWorkspace }).toArray()
    if ((await getWorkspaceById(db, productId, fixedWorkspace)) !== null || ws.length > 0) {
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.WorkspaceAlreadyExists, { workspace: fixedWorkspace })
      )
    }
    const data = {
      workspace: fixedWorkspace,
      workspaceUrl: fixedWorkspace,
      productId,
      version,
      workspaceName,
      accounts: [],
      disabled: false
    }
    // Add fixed workspace
    const id = await coll.insertOne(data)
    return { _id: id.insertedId, ...data }
  }
  const workspaceUrlPrefix = stripId(workspaceName)
  const workspaceIdPrefix = stripId(getEmailName(email)).slice(0, 12) + '-' + workspaceUrlPrefix.slice(0, 12)
  let iteration = 0
  let idPostfix = generateId('-')
  let urlPostfix = ''
  while (true) {
    const workspace = 'w-' + workspaceIdPrefix + '-' + idPostfix
    let workspaceUrl =
      workspaceUrlPrefix + (workspaceUrlPrefix.length > 0 && urlPostfix.length > 0 ? '-' : '') + urlPostfix
    if (workspaceUrl.trim().length === 0) {
      workspaceUrl = generateId('-')
    }
    const ws = await coll.find<Workspace>({ $or: [{ workspaceUrl }, { workspace }] }).toArray()
    if (ws.length === 0) {
      const data = {
        workspace,
        workspaceUrl,
        productId,
        version,
        workspaceName,
        accounts: [],
        disabled: false
      }
      // Nice we do not have a workspace or workspaceUrl duplicated.
      const id = await coll.insertOne(data)
      return { _id: id.insertedId, ...data }
    }
    for (const w of ws) {
      if (w.workspace === workspaceUrl) {
        idPostfix = generateId('-')
      }
      if (w.workspaceUrl === workspaceUrl) {
        urlPostfix = generateId('-')
      }
    }
    iteration++

    // A stupid check, but for sure we not hang.
    if (iteration > 10000) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceRateLimit, { workspace }))
    }
  }
}

let searchPromise: Promise<Workspace> | undefined

/**
 * @public
 */
export async function createWorkspace (
  version: Data<Version>,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  db: Db,
  productId: string,
  email: string,
  workspaceName: string,
  workspace?: string
): Promise<{ workspaceInfo: Workspace, err?: any, client?: Client }> {
  // We need to search for duplicate workspaceUrl
  await searchPromise

  // Safe generate workspace record.
  searchPromise = generateWorkspaceRecord(db, email, productId, version, workspaceName, workspace)

  const workspaceInfo = await searchPromise
  let client: Client
  try {
    const initWS = getMetadata(toolPlugin.metadata.InitWorkspace)
    const wsId = getWorkspaceId(workspaceInfo.workspace, productId)
    if (initWS !== undefined && (await getWorkspaceById(db, productId, initWS)) !== null) {
      client = await initModel(getTransactor(), wsId, txes, [])
      await client.close()
      await cloneWorkspace(
        getTransactor(),
        getWorkspaceId(initWS, productId),
        getWorkspaceId(workspaceInfo.workspace, productId)
      )
      client = await upgradeModel(getTransactor(), wsId, txes, migrationOperation)
    } else {
      client = await initModel(getTransactor(), wsId, txes, migrationOperation)
    }
  } catch (err: any) {
    return { workspaceInfo, err, client: {} as any }
  }
  return { workspaceInfo, client }
}

/**
 * @public
 */
export async function upgradeWorkspace (
  version: Data<Version>,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  productId: string,
  db: Db,
  workspaceUrl: string,
  logger: ModelLogger = consoleModelLogger,
  forceUpdate: boolean = true
): Promise<string> {
  const ws = await getWorkspaceByUrl(db, productId, workspaceUrl)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl }))
  }
  if (ws.productId !== productId) {
    if (productId !== '' || ws.productId !== undefined) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.ProductIdMismatch, { productId }))
    }
  }
  const versionStr = versionToString(version)

  const currentVersion = await db.collection<Workspace>(WORKSPACE_COLLECTION).findOne({ workspace: ws.workspace })
  console.log(
    `${forceUpdate ? 'force-' : ''}upgrade from "${
      currentVersion?.version !== undefined ? versionToString(currentVersion.version) : ''
    }" to "${versionStr}"`
  )

  if (currentVersion?.version !== undefined && !forceUpdate && versionStr === versionToString(currentVersion.version)) {
    return versionStr
  }
  await db.collection(WORKSPACE_COLLECTION).updateOne(
    { workspace: ws.workspace },
    {
      $set: { version }
    }
  )
  await (
    await upgradeModel(getTransactor(), getWorkspaceId(ws.workspace, productId), txes, migrationOperation, logger)
  ).close()
  return versionStr
}

/**
 * @public
 */
export const createUserWorkspace =
  (version: Data<Version>, txes: Tx[], migrationOperation: [string, MigrateOperation][]) =>
    async (db: Db, productId: string, token: string, workspaceName: string): Promise<LoginInfo> => {
      const { email } = decodeToken(token)

      console.log(`Creating workspace for "${workspaceName}" for ${email}`)

      const info = await getAccount(db, email)

      if (info === null) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
      }
      if (info.confirmed === false) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotConfirmed, { account: email }))
      }

      if (info.lastWorkspace !== undefined && info.admin === false) {
        if (Date.now() - info.lastWorkspace < 60 * 1000) {
          throw new PlatformError(
            new Status(Severity.ERROR, platform.status.WorkspaceRateLimit, { workspace: workspaceName })
          )
        }
      }

      const { workspaceInfo, err, client } = await createWorkspace(
        version,
        txes,
        migrationOperation,
        db,
        productId,
        email,
        workspaceName
      )

      if (err != null) {
        console.error(err)
        // We need to drop workspace, to prevent wrong data usage.

        await db.collection(WORKSPACE_COLLECTION).updateOne(
          {
            _id: workspaceInfo._id
          },
          { $set: { disabled: true, message: JSON.stringify(err?.message ?? ''), err: JSON.stringify(err) } }
        )
        throw err
      }
      try {
        info.lastWorkspace = Date.now()

        // Update last workspace time.
        await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: info._id }, { $set: { lastWorkspace: Date.now() } })

        const initWS = getMetadata(toolPlugin.metadata.InitWorkspace)
        const shouldUpdateAccount = initWS !== undefined && (await getWorkspaceById(db, productId, initWS)) !== null
        await assignWorkspace(db, productId, email, workspaceInfo.workspace, shouldUpdateAccount, client)
        await setRole(email, workspaceInfo.workspace, productId, AccountRole.Owner, client)
      } finally {
        await client?.close()
      }
      const result = {
        endpoint: getEndpoint(),
        email,
        token: generateToken(email, getWorkspaceId(workspaceInfo.workspace, productId), getExtra(info)),
        productId,
        workspace: workspaceInfo.workspaceUrl
      }
      console.log(`Creating workspace "${workspaceName}" Done`)
      return result
    }

/**
 * @public
 */
export async function getInviteLink (
  db: Db,
  productId: string,
  token: string,
  exp: number,
  emailMask: string,
  limit: number
): Promise<ObjectId> {
  const { workspace } = decodeToken(token)
  const wsPromise = await getWorkspaceById(db, productId, workspace.name)
  if (wsPromise === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  const result = await db.collection(INVITE_COLLECTION).insertOne({
    workspace,
    exp: Date.now() + exp,
    emailMask,
    limit
  })
  return result.insertedId
}

/**
 * @public
 */
export type ClientWorkspaceInfo = Omit<Workspace, '_id' | 'accounts' | 'workspaceUrl'>

/**
 * @public
 */
export type WorkspaceInfo = Omit<Workspace, '_id' | 'accounts'>

function mapToClientWorkspace (ws: Workspace): ClientWorkspaceInfo {
  const { _id, accounts, ...data } = ws
  return { ...data, workspace: ws.workspaceUrl ?? ws.workspace }
}

function trimWorkspaceInfo (ws: Workspace): WorkspaceInfo {
  const { _id, accounts, ...data } = ws
  return { ...data }
}

/**
 * @public
 */
export async function getUserWorkspaces (db: Db, productId: string, token: string): Promise<ClientWorkspaceInfo[]> {
  const { email } = decodeToken(token)
  const account = await getAccount(db, email)
  if (account === null) return []
  return (
    await db
      .collection<Workspace>(WORKSPACE_COLLECTION)
      .find(withProductId(productId, account.admin === true ? {} : { _id: { $in: account.workspaces } }))
      .toArray()
  )
    .filter((it) => it.disabled !== true)
    .map(mapToClientWorkspace)
}

/**
 * @public
 */
export async function getWorkspaceInfo (db: Db, productId: string, token: string): Promise<ClientWorkspaceInfo> {
  const { email, workspace } = decodeToken(token)
  let account: Pick<Account, 'admin' | 'workspaces'> | null = null
  if (email !== systemAccountEmail) {
    account = await getAccount(db, email)
    if (account === null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  } else {
    account = {
      admin: true,
      workspaces: []
    }
  }

  const [ws] = (
    await db
      .collection<Workspace>(WORKSPACE_COLLECTION)
      .find(withProductId(productId, account.admin === true ? {} : { _id: { $in: account.workspaces } }))
      .toArray()
  ).filter((it) => it.disabled !== true && it.workspace === workspace.name)
  if (ws == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  return mapToClientWorkspace(ws)
}

async function getWorkspaceAndAccount (
  db: Db,
  productId: string,
  _email: string,
  workspaceUrl: string
): Promise<{ account: Account, workspace: Workspace }> {
  const email = cleanEmail(_email)
  const wsPromise = await getWorkspaceById(db, productId, workspaceUrl)
  if (wsPromise === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl }))
  }
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  return { account, workspace: wsPromise }
}

/**
 * @public
 */
export async function setRole (
  _email: string,
  workspace: string,
  productId: string,
  role: AccountRole,
  client?: Client
): Promise<void> {
  const email = cleanEmail(_email)
  const connection = client ?? (await connect(getTransactor(), getWorkspaceId(workspace, productId)))
  try {
    const ops = new TxOperations(connection, core.account.System)

    const existingAccount = await ops.findOne(contact.class.PersonAccount, { email })

    if (existingAccount !== undefined) {
      const value = isNaN(Number(role)) ? 0 : Number(role)
      await ops.update(existingAccount, {
        role: value
      })
    }
  } finally {
    if (client === undefined) {
      await connection.close()
    }
  }
}

/**
 * @public
 */
export async function assignWorkspace (
  db: Db,
  productId: string,
  _email: string,
  workspaceId: string,
  shouldReplaceAccount: boolean = false,
  client?: Client
): Promise<Workspace> {
  const email = cleanEmail(_email)
  const initWS = getMetadata(toolPlugin.metadata.InitWorkspace)
  if (initWS !== undefined && initWS === workspaceId) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const workspaceInfo = await getWorkspaceAndAccount(db, productId, email, workspaceId)

  if (workspaceInfo.account !== null) {
    await createPersonAccount(workspaceInfo.account, productId, workspaceId, shouldReplaceAccount, client)
  }

  // Add account into workspace.
  await db
    .collection(WORKSPACE_COLLECTION)
    .updateOne({ _id: workspaceInfo.workspace._id }, { $addToSet: { accounts: workspaceInfo.account._id } })

  // Add workspace to account
  await db
    .collection(ACCOUNT_COLLECTION)
    .updateOne({ _id: workspaceInfo.account._id }, { $addToSet: { workspaces: workspaceInfo.workspace._id } })
  return workspaceInfo.workspace
}

async function createEmployee (ops: TxOperations, name: string, _email: string): Promise<Ref<Person>> {
  const email = cleanEmail(_email)
  const gravatarId = buildGravatarId(email)
  const hasGravatar = await checkHasGravatar(gravatarId)

  const id = await ops.createDoc(contact.class.Person, contact.space.Employee, {
    name,
    city: '',
    ...(hasGravatar ? { avatar: `${AvatarType.GRAVATAR}://${gravatarId}` } : {})
  })
  await ops.createMixin(id, contact.class.Person, contact.space.Contacts, contact.mixin.Employee, {
    active: true
  })
  if (!hasGravatar) {
    await ops.updateDoc(contact.mixin.Employee, contact.space.Employee, id, {
      avatar: `${AvatarType.COLOR}://${getAvatarColorForId(id)}`
    })
  }
  await ops.addCollection(contact.class.Channel, contact.space.Contacts, id, contact.mixin.Employee, 'channels', {
    provider: contact.channelProvider.Email,
    value: email.trim()
  })

  return id
}

async function replaceCurrentAccount (
  ops: TxOperations,
  account: Account,
  currentAccount: PersonAccount,
  name: string
): Promise<void> {
  await ops.update(currentAccount, { email: account.email })
  const employee = await ops.findOne(contact.mixin.Employee, { _id: currentAccount.person as Ref<Employee> })
  if (employee === undefined) {
    // Employee was deleted, let's restore it.
    const employeeId = await createEmployee(ops, name, account.email)

    await ops.updateDoc(contact.class.PersonAccount, currentAccount.space, currentAccount._id, {
      person: employeeId
    })
  } else {
    const email = cleanEmail(account.email)
    const gravatarId = buildGravatarId(email)
    const hasGravatar = await checkHasGravatar(gravatarId)

    await ops.update(employee, {
      name,
      avatar: hasGravatar
        ? `${AvatarType.GRAVATAR}://${gravatarId}`
        : `${AvatarType.COLOR}://${getAvatarColorForId(employee._id)}`,
      ...(employee.active ? {} : { active: true })
    })
    const currentChannel = await ops.findOne(contact.class.Channel, {
      attachedTo: employee._id,
      provider: contact.channelProvider.Email
    })
    if (currentChannel === undefined) {
      await ops.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        employee._id,
        contact.mixin.Employee,
        'channels',
        {
          provider: contact.channelProvider.Email,
          value: email
        }
      )
    } else if (currentChannel.value !== email) {
      await ops.update(currentChannel, { value: email })
    }
  }
}

async function createPersonAccount (
  account: Account,
  productId: string,
  workspace: string,
  shouldReplaceCurrent: boolean = false,
  client?: Client
): Promise<void> {
  const connection = client ?? (await connect(getTransactor(), getWorkspaceId(workspace, productId)))
  try {
    const ops = new TxOperations(connection, core.account.System)

    const name = combineName(account.first, account.last)
    // Check if EmployeeAccount is not exists
    if (shouldReplaceCurrent) {
      const currentAccount = await ops.findOne(contact.class.PersonAccount, {})
      if (currentAccount !== undefined) {
        await replaceCurrentAccount(ops, account, currentAccount, name)
        return
      }
    }
    const existingAccount = await ops.findOne(contact.class.PersonAccount, { email: account.email })
    if (existingAccount === undefined) {
      const employee = await createEmployee(ops, name, account.email)

      await ops.createDoc(contact.class.PersonAccount, core.space.Model, {
        email: account.email,
        person: employee,
        role: 0
      })
    } else {
      const employee = await ops.findOne(contact.mixin.Employee, { _id: existingAccount.person as Ref<Employee> })
      if (employee === undefined) {
        // Employee was deleted, let's restore it.
        const employeeId = await createEmployee(ops, name, account.email)

        await ops.updateDoc(contact.class.PersonAccount, existingAccount.space, existingAccount._id, {
          person: employeeId
        })
      } else if (!employee.active) {
        await ops.update(employee, {
          active: true
        })
      }
    }
  } finally {
    if (client === undefined) {
      await connection.close()
    }
  }
}

/**
 * @public
 */
export async function changePassword (
  db: Db,
  productId: string,
  token: string,
  oldPassword: string,
  password: string
): Promise<void> {
  const { email } = decodeToken(token)
  const account = await getAccountInfo(db, email, oldPassword)

  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })
}

/**
 * @public
 */
export async function replacePassword (db: Db, productId: string, email: string, password: string): Promise<void> {
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })
}

/**
 * @public
 */
export async function requestPassword (db: Db, productId: string, _email: string): Promise<void> {
  const email = cleanEmail(_email)
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    throw new Error('Please provide email service url')
  }
  const front = getMetadata(accountPlugin.metadata.FrontURL)
  if (front === undefined || front === '') {
    throw new Error('Please provide front url')
  }

  const token = generateToken(
    '@restore',
    getWorkspaceId('', productId),
    getExtra(account, {
      restore: email
    })
  )

  const link = concatLink(front, `/login/recovery?id=${token}`)

  const text = await translate(accountPlugin.string.RecoveryText, { link })
  const html = await translate(accountPlugin.string.RecoveryHTML, { link })
  const subject = await translate(accountPlugin.string.RecoverySubject, {})

  const to = account.email
  await fetch(concatLink(sesURL, '/send'), {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      html,
      subject,
      to
    })
  })
}

/**
 * @public
 */
export async function restorePassword (db: Db, productId: string, token: string, password: string): Promise<LoginInfo> {
  const decode = decodeToken(token)
  const email = decode.extra?.restore
  if (email === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })

  return await login(db, productId, email, password)
}

/**
 * @public
 */
export async function removeWorkspace (db: Db, productId: string, email: string, workspaceId: string): Promise<void> {
  const { workspace, account } = await getWorkspaceAndAccount(db, productId, email, workspaceId)

  // Add account into workspace.
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: workspace._id }, { $pull: { accounts: account._id } })

  // Add account a workspace
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $pull: { workspaces: workspace._id } })
}

/**
 * @public
 */
export async function checkJoin (
  db: Db,
  productId: string,
  token: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const { email } = decodeToken(token)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(invite, email)
  const ws = await getWorkspaceById(db, productId, workspace.name)
  if (ws === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  return await selectWorkspace(db, productId, token, ws?.workspaceUrl ?? ws.workspace, false)
}

/**
 * @public
 */
export async function dropWorkspace (db: Db, productId: string, workspaceId: string): Promise<void> {
  const ws = await getWorkspaceById(db, productId, workspaceId)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceId }))
  }
  await db.collection(WORKSPACE_COLLECTION).deleteOne({ _id: ws._id })
  await db
    .collection<Account>(ACCOUNT_COLLECTION)
    .updateMany({ _id: { $in: ws.accounts ?? [] } }, { $pull: { workspaces: ws._id } })
}

/**
 * @public
 */
export async function dropAccount (db: Db, productId: string, email: string): Promise<void> {
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const workspaces = await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .find(withProductId(productId, { _id: { $in: account.workspaces } }))
    .toArray()

  await Promise.all(
    workspaces.map(async (ws) => {
      await deactivatePersonAccount(account.email, ws.workspace, productId)
    })
  )

  await db.collection(ACCOUNT_COLLECTION).deleteOne({ _id: account._id })
  await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .updateMany({ _id: { $in: account.workspaces } }, { $pull: { accounts: account._id } })
}

/**
 * @public
 */
export async function leaveWorkspace (db: Db, productId: string, token: string, email: string): Promise<void> {
  const tokenData = decodeToken(token)

  const currentAccount = await getAccount(db, tokenData.email)
  if (currentAccount === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: tokenData.email }))
  }

  const workspace = await getWorkspaceById(db, productId, tokenData.workspace.name)
  if (workspace === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: tokenData.workspace.name })
    )
  }

  await deactivatePersonAccount(email, workspace.workspace, workspace.productId)

  const account = tokenData.email !== email ? await getAccount(db, email) : currentAccount
  if (account !== null) {
    await db
      .collection<Workspace>(WORKSPACE_COLLECTION)
      .updateOne({ _id: workspace._id }, { $pull: { accounts: account._id } })
    await db
      .collection<Account>(ACCOUNT_COLLECTION)
      .updateOne({ _id: account._id }, { $pull: { workspaces: workspace._id } })
  }
}

/**
 * @public
 */
export async function sendInvite (db: Db, productId: string, token: string, email: string): Promise<void> {
  const tokenData = decodeToken(token)
  const currentAccount = await getAccount(db, tokenData.email)
  if (currentAccount === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: tokenData.email }))
  }

  const workspace = await getWorkspaceById(db, productId, tokenData.workspace.name)
  if (workspace === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: tokenData.workspace.name })
    )
  }

  const account = await getAccount(db, email)
  if (account !== null) return

  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    throw new Error('Please provide email service url')
  }
  const front = getMetadata(accountPlugin.metadata.FrontURL)
  if (front === undefined || front === '') {
    throw new Error('Please provide front url')
  }

  const expHours = 48
  const exp = expHours * 60 * 60 * 1000

  const inviteId = await getInviteLink(db, productId, token, exp, email, 1)
  const link = concatLink(front, `/login/join?inviteId=${inviteId.toString()}`)

  const ws = workspace.workspace
  const text = await translate(accountPlugin.string.InviteText, { link, ws, expHours })
  const html = await translate(accountPlugin.string.InviteHTML, { link, ws, expHours })
  const subject = await translate(accountPlugin.string.InviteSubject, { ws })

  const to = email
  await fetch(concatLink(sesURL, '/send'), {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      html,
      subject,
      to
    })
  })
}

async function deactivatePersonAccount (email: string, workspace: string, productId: string): Promise<void> {
  const connection = await connect(getTransactor(), getWorkspaceId(workspace, productId))
  try {
    const ops = new TxOperations(connection, core.account.System)

    const existingAccount = await ops.findOne(contact.class.PersonAccount, { email })

    if (existingAccount !== undefined) {
      const employee = await ops.findOne(contact.mixin.Employee, { _id: existingAccount.person as Ref<Employee> })
      if (employee !== undefined) {
        await ops.update(employee, {
          active: false
        })
      }
    }
  } finally {
    await connection.close()
  }
}

/**
 * @public
 */
export type AccountMethod = (db: Db, productId: string, request: any, token?: string) => Promise<any>

function wrap (f: (db: Db, productId: string, ...args: any[]) => Promise<any>): AccountMethod {
  return async function (db: Db, productId: string, request: any, token?: string): Promise<any> {
    if (token !== undefined) request.params.unshift(token)
    return await f(db, productId, ...request.params)
      .then((result) => ({ id: request.id, result }))
      .catch((err) => {
        const status =
          err instanceof PlatformError
            ? err.status
            : new Status(Severity.ERROR, platform.status.InternalServerError, {})
        if (status.code === platform.status.InternalServerError) {
          console.error(status, err)
        } else {
          console.error(status)
        }
        return {
          error: status
        }
      })
  }
}

/**
 * @public
 */
export function getMethods (
  version: Data<Version>,
  txes: Tx[],
  migrateOperations: [string, MigrateOperation][]
): Record<string, AccountMethod> {
  return {
    login: wrap(login),
    join: wrap(join),
    checkJoin: wrap(checkJoin),
    signUpJoin: wrap(signUpJoin),
    selectWorkspace: wrap(selectWorkspace),
    getUserWorkspaces: wrap(getUserWorkspaces),
    getInviteLink: wrap(getInviteLink),
    getAccountInfo: wrap(getAccountInfo),
    getWorkspaceInfo: wrap(getWorkspaceInfo),
    createAccount: wrap(createAccount),
    createWorkspace: wrap(createUserWorkspace(version, txes, migrateOperations)),
    assignWorkspace: wrap(assignWorkspace),
    removeWorkspace: wrap(removeWorkspace),
    leaveWorkspace: wrap(leaveWorkspace),
    listWorkspaces: wrap(listWorkspaces),
    changePassword: wrap(changePassword),
    requestPassword: wrap(requestPassword),
    restorePassword: wrap(restorePassword),
    sendInvite: wrap(sendInvite),
    confirm: wrap(confirm),
    getAccountInfoByToken: wrap(getAccountInfoByToken)
    // updateAccount: wrap(updateAccount)
  }
}

export * from './plugin'
export default accountPlugin
