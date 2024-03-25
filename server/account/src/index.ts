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
  MeasureContext,
  RateLimiter,
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
  // null if auth provider was used
  hash: Binary | null
  salt: Binary
  workspaces: ObjectId[]
  first: string
  last: string
  // Defined for server admins only
  admin?: boolean
  confirmed?: boolean
  lastWorkspace?: number
  createdOn: number
  lastVisit: number
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
  createdOn: number
  lastVisit: number

  createdBy: string
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

function isEmail (email: string): boolean {
  const EMAIL_REGEX =
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/
  return EMAIL_REGEX.test(email)
}

/**
 * @public
 */
export async function getAccount (db: Db, email: string): Promise<Account | null> {
  return await db.collection(ACCOUNT_COLLECTION).findOne<Account>({ email: cleanEmail(email) })
}

async function getAccountByQuery (db: Db, query: Record<string, string>): Promise<Account | null> {
  return await db.collection(ACCOUNT_COLLECTION).findOne<Account>(query)
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

async function getAccountInfo (ctx: MeasureContext, db: Db, email: string, password: string): Promise<AccountInfo> {
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  if (account.hash === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidPassword, { account: email }))
  }
  if (!verifyPassword(password, Buffer.from(account.hash.buffer), Buffer.from(account.salt.buffer))) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidPassword, { account: email }))
  }
  return toAccountInfo(account)
}

async function getAccountInfoByToken (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string
): Promise<LoginInfo> {
  let email: string = ''
  try {
    email = decodeToken(token)?.email
  } catch (err: any) {
    await ctx.error('Invalid token', { token })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Unauthorized, {}))
  }
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const info = toAccountInfo(account)
  const result = {
    endpoint: getEndpoint(),
    email,
    confirmed: info.confirmed ?? true,
    token: generateToken(email, getWorkspaceId('', productId), getExtra(info))
  }
  return result
}

/**
 * @public
 * @param db -
 * @param email -
 * @param password -
 * @param workspace -
 * @returns
 */
export async function login (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  _email: string,
  password: string
): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  try {
    const info = await getAccountInfo(ctx, db, email, password)
    const result = {
      endpoint: getEndpoint(),
      email,
      confirmed: info.confirmed ?? true,
      token: generateToken(email, getWorkspaceId('', productId), getExtra(info))
    }
    await ctx.info('login success', { email, productId })
    return result
  } catch (err: any) {
    await ctx.error('login failed', { email, productId, _email, err })
    throw err
  }
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
  ctx: MeasureContext,
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
      await ctx.error('workspace disabled', { workspaceUrl, email })
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
  await ctx.error('workspace error', { workspaceUrl, email })
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
  ctx: MeasureContext,
  db: Db,
  productId: string,
  _email: string,
  password: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const email = cleanEmail(_email)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(invite, email)
  await ctx.info(`join attempt:${email}, ${workspace.name}`)
  const ws = await assignWorkspace(ctx, db, productId, email, workspace.name)

  const token = (await login(ctx, db, productId, email, password)).token
  const result = await selectWorkspace(ctx, db, productId, token, ws.workspaceUrl ?? ws.workspace)
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
export async function confirm (ctx: MeasureContext, db: Db, productId: string, token: string): Promise<LoginInfo> {
  const decode = decodeToken(token)
  const _email = decode.extra?.confirm
  if (_email === undefined) {
    await ctx.error('confirm email invalid', { token: decode })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: _email }))
  }
  const email = cleanEmail(_email)
  const account = await confirmEmail(db, email)

  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, getWorkspaceId('', productId), getExtra(account))
  }
  await ctx.info('confirm success', { email, productId })
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
  ctx: MeasureContext,
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
    ctx,
    db,
    productId,
    email,
    password,
    first,
    last,
    invite?.emailMask === email || sesURL === undefined || sesURL === ''
  )
  const ws = await assignWorkspace(ctx, db, productId, email, workspace.name)

  const token = (await login(ctx, db, productId, email, password)).token
  const result = await selectWorkspace(ctx, db, productId, token, ws.workspaceUrl ?? ws.workspace)
  await useInvite(db, inviteId)
  return result
}

/**
 * @public
 */
export async function createAcc (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  _email: string,
  password: string | null,
  first: string,
  last: string,
  confirmed: boolean = false,
  extra?: Record<string, string>
): Promise<Account> {
  const email = cleanEmail(_email)
  const salt = randomBytes(32)
  const hash = password !== null ? hashWithSalt(password, salt) : null

  const systemEmails = [systemAccountEmail]
  if (systemEmails.includes(email)) {
    await ctx.error('system email used for account', { email })
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
    workspaces: [],
    createdOn: Date.now(),
    lastVisit: Date.now(),
    ...(extra ?? {})
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
      await ctx.info('Please provide email service url to enable email confirmations.')
      await confirmEmail(db, email)
    }
  }
  await ctx.info('account created', { account: email })
  return newAccount
}

/**
 * @public
 */
export async function createAccount (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  _email: string,
  password: string,
  first: string,
  last: string
): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  const account = await createAcc(
    ctx,
    db,
    productId,
    email,
    password,
    first,
    last,
    sesURL === undefined || sesURL === ''
  )

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
export async function listWorkspaces (ctx: MeasureContext, db: Db, productId: string): Promise<WorkspaceInfo[]> {
  return (await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, {})).toArray())
    .map((it) => ({ ...it, productId }))
    .filter((it) => it.disabled !== true)
    .map(trimWorkspaceInfo)
}

/**
 * @public
 */
export async function listWorkspacesRaw (db: Db, productId: string): Promise<Workspace[]> {
  return (await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, {})).toArray())
    .map((it) => ({ ...it, productId }))
    .filter((it) => it.disabled !== true)
}

/**
 * @public
 */
export async function listWorkspacesPure (db: Db, productId: string): Promise<Workspace[]> {
  return (await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, {})).toArray()).map(
    (it) => ({ ...it, productId })
  )
}
/**
 * @public
 */
export async function setWorkspaceDisabled (db: Db, workspaceId: Workspace['_id'], disabled: boolean): Promise<void> {
  await db.collection<Workspace>(WORKSPACE_COLLECTION).updateOne({ _id: workspaceId }, { $set: { disabled } })
}

/**
 * @public
 */
export async function updateWorkspace (
  db: Db,
  productId: string,
  info: Workspace,
  ops: Partial<Workspace>
): Promise<void> {
  await db.collection<Workspace>(WORKSPACE_COLLECTION).updateOne({ _id: info._id }, { $set: { ...info, ...ops } })
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
      disabled: true,
      createdOn: Date.now(),
      lastVisit: Date.now(),
      createdBy: email
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
        disabled: true,
        createdOn: Date.now(),
        lastVisit: Date.now(),
        createdBy: email
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

const rateLimiter = new RateLimiter(3)

/**
 * @public
 */
export async function createWorkspace (
  ctx: MeasureContext,
  version: Data<Version>,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  db: Db,
  productId: string,
  email: string,
  workspaceName: string,
  workspace?: string
): Promise<{ workspaceInfo: Workspace, err?: any, client?: Client }> {
  return await rateLimiter.exec(async () => {
    // We need to search for duplicate workspaceUrl
    await searchPromise

    // Safe generate workspace record.
    searchPromise = generateWorkspaceRecord(db, email, productId, version, workspaceName, workspace)

    const workspaceInfo = await searchPromise
    let client: Client
    const childLogger = ctx.newChild(
      'createWorkspace',
      { workspace: workspaceInfo.workspace },
      {},
      ctx.logger.childLogger?.(workspaceInfo.workspace, {}) ?? ctx.logger
    )
    const ctxModellogger: ModelLogger = {
      log: (msg, data) => {
        void childLogger.info(msg, data)
      },
      error: (msg, data) => {
        void childLogger.error(msg, data)
      }
    }
    try {
      const initWS = getMetadata(toolPlugin.metadata.InitWorkspace)
      const wsId = getWorkspaceId(workspaceInfo.workspace, productId)
      if (initWS !== undefined && (await getWorkspaceById(db, productId, initWS)) !== null) {
        client = await initModel(ctx, getTransactor(), wsId, txes, [], ctxModellogger)
        await client.close()
        await cloneWorkspace(
          getTransactor(),
          getWorkspaceId(initWS, productId),
          getWorkspaceId(workspaceInfo.workspace, productId)
        )
        client = await upgradeModel(getTransactor(), wsId, txes, migrationOperation, ctxModellogger)
      } else {
        client = await initModel(ctx, getTransactor(), wsId, txes, migrationOperation, ctxModellogger)
      }
    } catch (err: any) {
      return { workspaceInfo, err, client: {} as any }
    }
    // Workspace is created, we need to clear disabled flag.
    await db
      .collection<Omit<Workspace, '_id'>>(WORKSPACE_COLLECTION)
      .updateOne({ _id: workspaceInfo._id }, { $set: { disabled: false } })
    return { workspaceInfo, client }
  })
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

  console.log(
    `${workspaceUrl} - ${forceUpdate ? 'force-' : ''}upgrade from "${
      ws?.version !== undefined ? versionToString(ws.version) : ''
    }" to "${versionStr}"`
  )

  if (ws?.version !== undefined && !forceUpdate && versionStr === versionToString(ws.version)) {
    return versionStr
  }
  await db.collection(WORKSPACE_COLLECTION).updateOne(
    { _id: ws._id },
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
    async (ctx: MeasureContext, db: Db, productId: string, token: string, workspaceName: string): Promise<LoginInfo> => {
      const { email } = decodeToken(token)

      await ctx.info('Creating workspace', { workspaceName, email })

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
        ctx,
        version,
        txes,
        migrationOperation,
        db,
        productId,
        email,
        workspaceName
      )

      if (err != null) {
        await ctx.error('failed to create workspace', { err, workspaceName, email })
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
        await assignWorkspace(ctx, db, productId, email, workspaceInfo.workspace, shouldUpdateAccount, client)
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
      await ctx.info('Creating workspace done', { workspaceName, email })
      return result
    }

/**
 * @public
 */
export async function getInviteLink (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string,
  exp: number,
  emailMask: string,
  limit: number
): Promise<ObjectId> {
  const { workspace, email } = decodeToken(token)
  const wsPromise = await getWorkspaceById(db, productId, workspace.name)
  if (wsPromise === null) {
    await ctx.error('workspace not found', { workspace, email })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  await ctx.info('Getting invite link', { workspace: workspace.name, emailMask, limit })
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
export type ClientWorkspaceInfo = Omit<Workspace, '_id' | 'accounts' | 'workspaceUrl'> & { workspaceId: string }

/**
 * @public
 */
export type WorkspaceInfo = Omit<Workspace, '_id' | 'accounts'>

function mapToClientWorkspace (ws: Workspace): ClientWorkspaceInfo {
  const { _id, accounts, ...data } = ws
  return { ...data, workspace: ws.workspaceUrl ?? ws.workspace, workspaceId: ws.workspace }
}

function trimWorkspaceInfo (ws: Workspace): WorkspaceInfo {
  const { _id, accounts, ...data } = ws
  return { ...data }
}

/**
 * @public
 */
export async function getUserWorkspaces (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string
): Promise<ClientWorkspaceInfo[]> {
  const { email } = decodeToken(token)
  const account = await getAccount(db, email)
  if (account === null) {
    await ctx.error('account not found', { email })
    return []
  }
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
export async function getWorkspaceInfo (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string,
  _updateLastVisit: boolean = false
): Promise<ClientWorkspaceInfo> {
  const { email, workspace, extra } = decodeToken(token)
  const guest = extra?.guest === 'true'
  let account: Pick<Account, 'admin' | 'workspaces'> | Account | null = null
  const query: Filter<Workspace> = {
    workspace: workspace.name
  }
  if (email !== systemAccountEmail && !guest) {
    account = await getAccount(db, email)
    if (account === null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  } else if (guest) {
    account = {
      admin: false,
      workspaces: []
    }
  } else {
    account = {
      admin: true,
      workspaces: []
    }
  }

  if (account.admin !== true && !guest) {
    query._id = { $in: account.workspaces }
  }

  const [ws] = (
    await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, query)).toArray()
  ).filter((it) => it.disabled !== true)
  if (ws == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  if (_updateLastVisit && isAccount(account)) {
    await updateLastVisit(db, ws, account)
  }
  return mapToClientWorkspace(ws)
}

function isAccount (data: Pick<Account, 'admin' | 'workspaces'> | Account | null): data is Account {
  return (data as Account)._id !== undefined
}

async function updateLastVisit (db: Db, ws: Workspace, account: Account): Promise<void> {
  const now = Date.now()
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: ws._id }, { $set: { lastVisit: now } })

  // Add workspace to account
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { lastVisit: now } })
}

async function getWorkspaceAndAccount (
  ctx: MeasureContext,
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
  if (!Object.values(AccountRole).includes(role)) return
  const email = cleanEmail(_email)
  const connection = client ?? (await connect(getTransactor(), getWorkspaceId(workspace, productId)))
  try {
    const ops = new TxOperations(connection, core.account.System)

    const existingAccount = await ops.findOne(contact.class.PersonAccount, { email })

    if (existingAccount !== undefined) {
      await ops.update(existingAccount, {
        role
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
  ctx: MeasureContext,
  db: Db,
  productId: string,
  _email: string,
  workspaceId: string,
  shouldReplaceAccount: boolean = false,
  client?: Client,
  personAccountId?: Ref<PersonAccount>
): Promise<Workspace> {
  const email = cleanEmail(_email)
  const initWS = getMetadata(toolPlugin.metadata.InitWorkspace)
  if (initWS !== undefined && initWS === workspaceId) {
    await ctx.error('assign-workspace failed', { email, workspaceId, reason: 'initWs === workspaceId' })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const workspaceInfo = await getWorkspaceAndAccount(ctx, db, productId, email, workspaceId)

  if (workspaceInfo.account !== null) {
    await createPersonAccount(
      workspaceInfo.account,
      productId,
      workspaceId,
      shouldReplaceAccount,
      client,
      personAccountId
    )
  }

  // Add account into workspace.
  await db
    .collection(WORKSPACE_COLLECTION)
    .updateOne({ _id: workspaceInfo.workspace._id }, { $addToSet: { accounts: workspaceInfo.account._id } })

  // Add workspace to account
  await db
    .collection(ACCOUNT_COLLECTION)
    .updateOne({ _id: workspaceInfo.account._id }, { $addToSet: { workspaces: workspaceInfo.workspace._id } })

  await ctx.info('assign-workspace success', { email, workspaceId })
  return workspaceInfo.workspace
}

async function createEmployee (ops: TxOperations, name: string, _email: string): Promise<Ref<Person>> {
  const id = generateId<Person>()
  let avatar = `${AvatarType.COLOR}://${getAvatarColorForId(id)}`
  const email = cleanEmail(_email)
  if (isEmail(email)) {
    const gravatarId = buildGravatarId(email)
    const hasGravatar = await checkHasGravatar(gravatarId)
    if (hasGravatar) {
      avatar = `${AvatarType.GRAVATAR}://${gravatarId}`
    }
  }

  await ops.createDoc(
    contact.class.Person,
    contact.space.Employee,
    {
      name,
      city: '',
      avatar
    },
    id
  )
  await ops.createMixin(id, contact.class.Person, contact.space.Contacts, contact.mixin.Employee, {
    active: true
  })
  if (isEmail(email)) {
    await ops.addCollection(contact.class.Channel, contact.space.Contacts, id, contact.mixin.Employee, 'channels', {
      provider: contact.channelProvider.Email,
      value: email
    })
  }

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
  client?: Client,
  personAccountId?: Ref<PersonAccount>
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

      await ops.createDoc(
        contact.class.PersonAccount,
        core.space.Model,
        {
          email: account.email,
          person: employee,
          role: AccountRole.User
        },
        personAccountId
      )
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
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string,
  oldPassword: string,
  password: string
): Promise<void> {
  const { email } = decodeToken(token)
  const account = await getAccountInfo(ctx, db, email, oldPassword)

  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })
  await ctx.info('change-password success', { email })
}

/**
 * @public
 */
export async function changeEmail (ctx: MeasureContext, db: Db, account: Account, newEmail: string): Promise<void> {
  await db.collection<Account>(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { email: newEmail } })
  await ctx.info('change-email success', { email: newEmail })
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
export async function requestPassword (ctx: MeasureContext, db: Db, productId: string, _email: string): Promise<void> {
  const email = cleanEmail(_email)
  const account = await getAccount(db, email)

  if (account === null) {
    await ctx.info('account not found', { email })
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
  await ctx.info('recovery email sent', { email, accountEmail: account.email })
}

/**
 * @public
 */
export async function restorePassword (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string,
  password: string
): Promise<LoginInfo> {
  const decode = decodeToken(token)
  const email = decode.extra?.restore
  if (email === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  await updatePassword(db, account, password)

  return await login(ctx, db, productId, email, password)
}

async function updatePassword (db: Db, account: Account, password: string | null): Promise<void> {
  const salt = randomBytes(32)
  const hash = password !== null ? hashWithSalt(password, salt) : null

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })
}

/**
 * @public
 */
export async function removeWorkspace (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  email: string,
  workspaceId: string
): Promise<void> {
  const { workspace, account } = await getWorkspaceAndAccount(ctx, db, productId, email, workspaceId)

  // Add account into workspace.
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: workspace._id }, { $pull: { accounts: account._id } })

  // Add account a workspace
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $pull: { workspaces: workspace._id } })
  await ctx.info('Workspace removed', { email, workspace })
}

/**
 * @public
 */
export async function checkJoin (
  ctx: MeasureContext,
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
    await ctx.error('workspace not found', { name: workspace.name, email, inviteId })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  return await selectWorkspace(ctx, db, productId, token, ws?.workspaceUrl ?? ws.workspace, false)
}

/**
 * @public
 */
export async function dropWorkspace (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  workspaceId: string
): Promise<void> {
  const ws = await getWorkspaceById(db, productId, workspaceId)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceId }))
  }
  await db.collection(WORKSPACE_COLLECTION).deleteOne({ _id: ws._id })
  await db
    .collection<Account>(ACCOUNT_COLLECTION)
    .updateMany({ _id: { $in: ws.accounts ?? [] } }, { $pull: { workspaces: ws._id } })

  await ctx.info('Workspace dropped', { workspace: ws.workspace })
}

/**
 * @public
 */
export async function dropAccount (ctx: MeasureContext, db: Db, productId: string, email: string): Promise<void> {
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
      await deactivatePersonAccount(ctx, account.email, ws.workspace, productId)
    })
  )

  await db.collection(ACCOUNT_COLLECTION).deleteOne({ _id: account._id })
  await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .updateMany({ _id: { $in: account.workspaces } }, { $pull: { accounts: account._id } })
  await ctx.info('Account Dropped', { email, account })
}

/**
 * @public
 */
export async function leaveWorkspace (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string,
  email: string
): Promise<void> {
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

  await deactivatePersonAccount(ctx, email, workspace.workspace, workspace.productId)

  const account = tokenData.email !== email ? await getAccount(db, email) : currentAccount
  if (account !== null) {
    await db
      .collection<Workspace>(WORKSPACE_COLLECTION)
      .updateOne({ _id: workspace._id }, { $pull: { accounts: account._id } })
    await db
      .collection<Account>(ACCOUNT_COLLECTION)
      .updateOne({ _id: account._id }, { $pull: { workspaces: workspace._id } })
  }
  await ctx.info('Account removed from workspace', { email, workspace })
}

/**
 * @public
 */
export async function sendInvite (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  token: string,
  email: string
): Promise<void> {
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

  // TODO: Why we not send invite if user has account???
  // const account = await getAccount(db, email)
  // if (account !== null) return

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

  const inviteId = await getInviteLink(ctx, db, productId, token, exp, email, 1)
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
  await ctx.info('Invite sent', { email, workspace, link })
}

async function deactivatePersonAccount (
  ctx: MeasureContext,
  email: string,
  workspace: string,
  productId: string
): Promise<void> {
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
      await ctx.info('account deactivated', { email, workspace })
    }
  } finally {
    await connection.close()
  }
}

/**
 * @public
 */
export type AccountMethod = (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  request: any,
  token?: string
) => Promise<any>

function wrap (
  accountMethod: (ctx: MeasureContext, db: Db, productId: string, ...args: any[]) => Promise<any>
): AccountMethod {
  return async function (ctx: MeasureContext, db: Db, productId: string, request: any, token?: string): Promise<any> {
    if (token !== undefined) request.params.unshift(token)
    return await accountMethod(ctx, db, productId, ...request.params)
      .then((result) => ({ id: request.id, result }))
      .catch((err) => {
        const status =
          err instanceof PlatformError
            ? err.status
            : new Status(Severity.ERROR, platform.status.InternalServerError, {})
        if (status.code === platform.status.InternalServerError) {
          void ctx.error('error', { status, err })
        } else {
          void ctx.error('error', { status })
        }
        return {
          error: status
        }
      })
  }
}

export async function joinWithProvider (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  _email: string,
  first: string,
  last: string,
  inviteId: ObjectId,
  extra?: Record<string, string>
): Promise<WorkspaceLoginInfo | LoginInfo> {
  const email = cleanEmail(_email)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(invite, email)
  let account = await getAccount(db, email)
  if (account == null && extra !== undefined) {
    account = await getAccountByQuery(db, extra)
  }
  if (account !== null) {
    // we should clean password if account is not confirmed
    if (account.confirmed === false) {
      await updatePassword(db, account, null)
    }

    const token = generateToken(email, getWorkspaceId('', productId), getExtra(account))
    const ws = await getWorkspaceById(db, productId, workspace.name)

    if (ws?.accounts.includes(account._id) ?? false) {
      const result = {
        endpoint: getEndpoint(),
        email,
        token
      }
      return result
    }

    const wsRes = await assignWorkspace(ctx, db, productId, email, workspace.name, false)
    const result = await selectWorkspace(ctx, db, productId, token, wsRes.workspaceUrl ?? wsRes.workspace, false)

    await useInvite(db, inviteId)
    return result
  }

  const newAccount = await createAcc(ctx, db, productId, email, null, first, last, true, extra)
  const token = generateToken(email, getWorkspaceId('', productId), getExtra(newAccount))
  const ws = await assignWorkspace(ctx, db, productId, email, workspace.name, false)
  const result = await selectWorkspace(ctx, db, productId, token, ws.workspaceUrl ?? ws.workspace, false)

  await useInvite(db, inviteId)

  return result
}

export async function loginWithProvider (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  _email: string,
  first: string,
  last: string,
  extra?: Record<string, string>
): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  let account = await getAccount(db, email)
  if (account == null && extra !== undefined) {
    account = await getAccountByQuery(db, extra)
  }
  if (account !== null) {
    // we should clean password if account is not confirmed
    if (account.confirmed === false) {
      await updatePassword(db, account, null)
    }
    const result = {
      endpoint: getEndpoint(),
      email,
      token: generateToken(email, getWorkspaceId('', productId), getExtra(account))
    }
    return result
  }

  const newAccount = await createAcc(ctx, db, productId, email, null, first, last, true, extra)

  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, getWorkspaceId('', productId), getExtra(newAccount))
  }
  return result
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
    getEndpoint: wrap(async () => getEndpoint()),
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
