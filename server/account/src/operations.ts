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

import { Analytics } from '@hcengineering/analytics'
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
  BaseWorkspaceInfo,
  Client,
  concatLink,
  Data,
  generateId,
  getWorkspaceId,
  MeasureContext,
  MeasureMetricsContext,
  RateLimiter,
  Ref,
  roleOrder,
  systemAccountEmail,
  Tx,
  TxOperations,
  Version,
  versionToString,
  WorkspaceId,
  type Branding
} from '@hcengineering/core'
import { consoleModelLogger, MigrateOperation, ModelLogger } from '@hcengineering/model'
import { getModelVersion } from '@hcengineering/model-all'
import platform, { getMetadata, PlatformError, Severity, Status, translate } from '@hcengineering/platform'
import { cloneWorkspace } from '@hcengineering/server-backup'
import { decodeToken, generateToken } from '@hcengineering/server-token'
import toolPlugin, { connect, getStorageAdapter, initModel, upgradeModel } from '@hcengineering/server-tool'
import { pbkdf2Sync, randomBytes } from 'crypto'
import { Binary, Db, Filter, ObjectId, type MongoClient } from 'mongodb'
import fetch from 'node-fetch'
import { type StorageAdapter } from '../../core/types'
import { accountPlugin } from './plugin'

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
export interface Workspace extends BaseWorkspaceInfo {
  _id: ObjectId
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
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
  productId: string

  creating?: boolean
  createProgress?: number
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
  role?: AccountRole
  personId?: Ref<Person>
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

async function getAccountInfo (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  email: string,
  password: string
): Promise<AccountInfo> {
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
  branding: Branding | null,
  token: string
): Promise<LoginInfo> {
  let email: string = ''
  try {
    email = decodeToken(token)?.email
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('Invalid token', { token })
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
  branding: Branding | null,
  _email: string,
  password: string
): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  try {
    const info = await getAccountInfo(ctx, db, productId, branding, email, password)
    const result = {
      endpoint: getEndpoint(),
      email,
      confirmed: info.confirmed ?? true,
      token: generateToken(email, getWorkspaceId('', productId), getExtra(info))
    }
    ctx.info('login success', { email, productId })
    return result
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('login failed', { email, productId, _email, err })
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
  branding: Branding | null,
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
      productId,
      creating: workspaceInfo.creating,
      createProgress: workspaceInfo.createProgress
    }
  }

  if (workspaceInfo !== null) {
    if (workspaceInfo.disabled === true && workspaceInfo.creating !== true) {
      ctx.error('workspace disabled', { workspaceUrl, email })
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
          productId,
          creating: workspaceInfo.creating,
          createProgress: workspaceInfo.createProgress
        }
        return result
      }
    }
  }
  ctx.error('workspace error', { workspaceUrl, email })
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
export async function checkInvite (ctx: MeasureContext, invite: Invite | null, email: string): Promise<WorkspaceId> {
  if (invite === null || invite.limit === 0) {
    ctx.error('invite', { email, state: 'no invite or limit exceed' })
    Analytics.handleError(new Error(`no invite or invite limit exceed ${email}`))
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  if (invite.exp < Date.now()) {
    ctx.error('invite', { email, state: 'link expired' })
    Analytics.handleError(new Error(`invite link expired ${invite._id.toString()} ${email}`))
    throw new PlatformError(new Status(Severity.ERROR, platform.status.ExpiredLink, {}))
  }
  if (invite.emailMask != null && invite.emailMask.trim().length > 0 && !new RegExp(invite.emailMask).test(email)) {
    ctx.error('invite', { email, state: 'mask to match', mask: invite.emailMask })
    Analytics.handleError(new Error(`invite link mask failed ${invite._id.toString()} ${email} ${invite.emailMask}`))
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
  branding: Branding | null,
  _email: string,
  password: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const email = cleanEmail(_email)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(ctx, invite, email)
  ctx.info(`join attempt:${email}, ${workspace.name}`)
  const ws = await assignWorkspace(
    ctx,
    db,
    productId,
    branding,
    email,
    workspace.name,
    invite?.role ?? AccountRole.User,
    invite?.personId
  )

  const token = (await login(ctx, db, productId, branding, email, password)).token
  const result = await selectWorkspace(ctx, db, productId, branding, token, ws.workspaceUrl ?? ws.workspace)
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
export async function confirm (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  token: string
): Promise<LoginInfo> {
  const decode = decodeToken(token)
  const _email = decode.extra?.confirm
  if (_email === undefined) {
    ctx.error('confirm email invalid', { token: decode })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: _email }))
  }
  const email = cleanEmail(_email)
  const account = await confirmEmail(db, email)

  const result = {
    endpoint: getEndpoint(),
    email,
    token: generateToken(email, getWorkspaceId('', productId), getExtra(account))
  }
  ctx.info('confirm success', { email, productId })
  return result
}

async function sendConfirmation (productId: string, branding: Branding | null, account: Account): Promise<void> {
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    console.info('Please provide email service url to enable email confirmations.')
    return
  }
  const front = branding?.front ?? getMetadata(accountPlugin.metadata.FrontURL)
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

  const name = branding?.title ?? getMetadata(accountPlugin.metadata.ProductName)
  const lang = branding?.language
  const text = await translate(accountPlugin.string.ConfirmationText, { name, link }, lang)
  const html = await translate(accountPlugin.string.ConfirmationHTML, { name, link }, lang)
  const subject = await translate(accountPlugin.string.ConfirmationSubject, { name }, lang)

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
  branding: Branding | null,
  _email: string,
  password: string,
  first: string,
  last: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const email = cleanEmail(_email)
  console.log(`signup join:${email} ${first} ${last}`)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(ctx, invite, email)
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  await createAcc(
    ctx,
    db,
    productId,
    branding,
    email,
    password,
    first,
    last,
    invite?.emailMask === email || invite?.personId !== undefined || sesURL === undefined || sesURL === ''
  )
  const ws = await assignWorkspace(
    ctx,
    db,
    productId,
    branding,
    email,
    workspace.name,
    invite?.role ?? AccountRole.User,
    invite?.personId
  )

  const token = (await login(ctx, db, productId, branding, email, password)).token
  const result = await selectWorkspace(ctx, db, productId, branding, token, ws.workspaceUrl ?? ws.workspace)
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
  branding: Branding | null,
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
    ctx.error('system email used for account', { email })
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
      await sendConfirmation(productId, branding, newAccount)
    } else {
      ctx.info('Please provide email service url to enable email confirmations.')
      await confirmEmail(db, email)
    }
  }
  ctx.info('account created', { account: email })
  return newAccount
}

/**
 * @public
 */
export async function createAccount (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
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
    branding,
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
export async function listWorkspaces (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  token: string
): Promise<WorkspaceInfo[]> {
  decodeToken(token) // Just verify token is valid
  return (await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, {})).toArray())
    .map((it) => ({ ...it, productId }))
    .filter((it) => it.disabled !== true)
    .map(trimWorkspaceInfo)
}

/**
 * @public
 */
export async function listWorkspacesByAccount (db: Db, productId: string, email: string): Promise<WorkspaceInfo[]> {
  const account = await getAccount(db, email)
  return (
    await db
      .collection<Workspace>(WORKSPACE_COLLECTION)
      .find(withProductId(productId, { _id: { $in: account?.workspaces } }))
      .toArray()
  )
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

export async function cleanInProgressWorkspaces (db: Db, productId: string): Promise<void> {
  const toDelete = (
    await db
      .collection<Workspace>(WORKSPACE_COLLECTION)
      .find(withProductId(productId, { creating: true }))
      .toArray()
  ).map((it) => ({ ...it, productId }))
  const ctx = new MeasureMetricsContext('clean', {})
  for (const d of toDelete) {
    await dropWorkspace(ctx, db, productId, null, d.workspace)
  }
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
  branding: Branding | null,
  workspaceName: string,
  fixedWorkspace?: string
): Promise<Workspace> {
  const coll = db.collection<Omit<Workspace, '_id'>>(WORKSPACE_COLLECTION)
  const brandingKey = branding?.key ?? 'huly'
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
      branding: brandingKey,
      workspaceName,
      accounts: [],
      disabled: true,
      creating: true,
      createProgress: 0,
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
        branding: brandingKey,
        workspaceName,
        accounts: [],
        disabled: true,
        creating: true,
        createProgress: 0,
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

const rateLimiter = new RateLimiter(parseInt(process.env.RATELIMIT ?? '10'))

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
  branding: Branding | null,
  email: string,
  workspaceName: string,
  workspace?: string,
  notifyHandler?: (workspace: Workspace) => void,
  postInitHandler?: (workspace: Workspace, model: Tx[]) => Promise<void>
): Promise<{ workspaceInfo: Workspace, err?: any, model?: Tx[] }> {
  // We need to search for duplicate workspaceUrl
  await searchPromise

  // Safe generate workspace record.
  searchPromise = generateWorkspaceRecord(db, email, productId, version, branding, workspaceName, workspace)

  const workspaceInfo = await searchPromise

  notifyHandler?.(workspaceInfo)

  const wsColl = db.collection<Omit<Workspace, '_id'>>(WORKSPACE_COLLECTION)

  async function updateInfo (ops: Partial<Workspace>): Promise<void> {
    await wsColl.updateOne({ _id: workspaceInfo._id }, { $set: ops })
    console.log('update', ops)
  }

  await updateInfo({ createProgress: 10 })

  return await rateLimiter.exec(async () => {
    const childLogger = ctx.newChild('createUserWorkspace', {}, { workspace: workspaceInfo.workspace })
    const ctxModellogger: ModelLogger = {
      log: (msg, data) => {
        childLogger.info(msg, data)
      },
      error: (msg, data) => {
        childLogger.error(msg, data)
      }
    }
    let model: Tx[] = []
    try {
      const initWS = branding?.initWorkspace ?? getMetadata(toolPlugin.metadata.InitWorkspace)
      const wsId = getWorkspaceId(workspaceInfo.workspace, productId)

      // We should not try to clone INIT_WS into INIT_WS during it's creation.
      let initWSInfo: Workspace | undefined
      if (initWS !== undefined) {
        initWSInfo = (await getWorkspaceById(db, productId, initWS)) ?? undefined
      }
      if (initWS !== undefined && initWSInfo !== undefined && initWS !== workspaceInfo.workspace) {
        // Just any valid model for transactor to be able to function
        await childLogger.with('init-model', {}, async (ctx) => {
          await initModel(ctx, getTransactor(), wsId, txes, [], ctxModellogger, async (value) => {
            await updateInfo({ createProgress: Math.round((Math.min(value, 100) / 100) * 20) })
          })
        })

        await updateInfo({ createProgress: 20 })

        // Clone init workspace.
        await cloneWorkspace(
          childLogger,
          getTransactor(),
          getWorkspaceId(initWS, productId),
          getWorkspaceId(workspaceInfo.workspace, productId),
          true,
          async (value) => {
            await updateInfo({ createProgress: 20 + Math.round((Math.min(value, 100) / 100) * 30) })
          },
          true,
          getStorageAdapter()
        )
        const modelVersion = getModelVersion()
        await updateInfo({ createProgress: 50 })

        // Skip tx update if version of init workspace are proper one.
        const skipTxUpdate =
          versionToString(modelVersion) === versionToString(initWSInfo.version ?? { major: 0, minor: 0, patch: 0 })
        model = await childLogger.withLog(
          'upgrade-model',
          {},
          async (ctx) =>
            await upgradeModel(
              ctx,
              getTransactor(),
              wsId,
              txes,
              migrationOperation,
              ctxModellogger,
              skipTxUpdate,
              async (value) => {
                await updateInfo({ createProgress: Math.round(50 + (Math.min(value, 100) / 100) * 40) })
              }
            )
        )
        await updateInfo({ createProgress: 90 })
      } else {
        await childLogger.withLog('init-workspace', {}, async (ctx) => {
          await initModel(ctx, getTransactor(), wsId, txes, migrationOperation, ctxModellogger, async (value) => {
            await updateInfo({ createProgress: Math.round(Math.min(value, 100)) })
          })
        })
      }
    } catch (err: any) {
      Analytics.handleError(err)
      return { workspaceInfo, err, client: null as any }
    }

    if (postInitHandler !== undefined) {
      await ctx.withLog('post-handler', {}, async (ctx) => {
        await postInitHandler?.(workspaceInfo, model)
      })
    }

    childLogger.end()
    // Workspace is created, we need to clear disabled flag.
    await updateInfo({ createProgress: 100, disabled: false, creating: false })
    return { workspaceInfo, model }
  })
}

/**
 * @public
 */
export async function upgradeWorkspace (
  ctx: MeasureContext,
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

  if (ws?.version !== undefined && !forceUpdate && versionStr === versionToString(ws.version)) {
    return versionStr
  }
  ctx.info('upgrading', {
    force: forceUpdate,
    currentVersion: ws?.version !== undefined ? versionToString(ws.version) : '',
    toVersion: versionStr,
    workspace: ws.workspace
  })
  await upgradeModel(
    ctx,
    getTransactor(),
    getWorkspaceId(ws.workspace, productId),
    txes,
    migrationOperation,
    logger,
    false,
    async (value) => {}
  )

  await db.collection(WORKSPACE_COLLECTION).updateOne(
    { _id: ws._id },
    {
      $set: { version }
    }
  )
  return versionStr
}

/**
 * @public
 */
export const createUserWorkspace =
  (version: Data<Version>, txes: Tx[], migrationOperation: [string, MigrateOperation][]) =>
    async (
      ctx: MeasureContext,
      db: Db,
      productId: string,
      branding: Branding | null,
      token: string,
      workspaceName: string
    ): Promise<LoginInfo> => {
      const { email } = decodeToken(token)

      ctx.info('Creating workspace', { workspaceName, email })

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

      async function doCreate (info: Account, notifyHandler: (workspace: Workspace) => void): Promise<void> {
        const { workspaceInfo, err } = await createWorkspace(
          ctx,
          version,
          txes,
          migrationOperation,
          db,
          productId,
          branding,
          email,
          workspaceName,
          undefined,
          notifyHandler,
          async (workspace, model) => {
            const initWS = branding?.initWorkspace ?? getMetadata(toolPlugin.metadata.InitWorkspace)
            const shouldUpdateAccount = initWS !== undefined && (await getWorkspaceById(db, productId, initWS)) !== null
            const client = await connect(
              getTransactor(),
              getWorkspaceId(workspace.workspace, productId),
              undefined,
              {
                admin: 'true'
              },
              model
            )
            try {
              await assignWorkspace(
                ctx,
                db,
                productId,
                branding,
                email,
                workspace.workspace,
                AccountRole.Owner,
                undefined,
                shouldUpdateAccount,
                client
              )
              ctx.info('Creating server side done', { workspaceName, email })
            } catch (err: any) {
              Analytics.handleError(err)
            } finally {
              await client.close()
            }
          }
        )

        if (err != null) {
          ctx.error('failed to create workspace', { err, workspaceName, email })
          // We need to drop workspace, to prevent wrong data usage.

          await db.collection(WORKSPACE_COLLECTION).updateOne(
            {
              _id: workspaceInfo._id
            },
            { $set: { disabled: true, message: JSON.stringify(err?.message ?? ''), err: JSON.stringify(err) } }
          )
          throw err
        }
        info.lastWorkspace = Date.now()

        // Update last workspace time.
        await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: info._id }, { $set: { lastWorkspace: Date.now() } })
      }

      const workspaceInfo = await new Promise<Workspace>((resolve) => {
        void doCreate(info, (info: Workspace) => {
          resolve(info)
        })
      })

      await assignWorkspaceRaw(db, { account: info, workspace: workspaceInfo })

      const result = {
        endpoint: getEndpoint(),
        email,
        token: generateToken(email, getWorkspaceId(workspaceInfo.workspace, productId), getExtra(info)),
        productId,
        workspace: workspaceInfo.workspaceUrl
      }
      ctx.info('Creating user side done', { workspaceName, email })
      return result
    }

/**
 * @public
 */
export async function getInviteLink (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  token: string,
  exp: number,
  emailMask: string,
  limit: number,
  role?: AccountRole,
  personId?: Ref<Person>
): Promise<ObjectId> {
  const { workspace, email } = decodeToken(token)
  const wsPromise = await getWorkspaceById(db, productId, workspace.name)
  if (wsPromise === null) {
    ctx.error('workspace not found', { workspace, email })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  ctx.info('Getting invite link', { workspace: workspace.name, emailMask, limit })
  const data: Omit<Invite, '_id'> = {
    workspace,
    exp: Date.now() + exp,
    emailMask,
    limit,
    role: role ?? AccountRole.User
  }
  if (personId !== undefined) {
    data.personId = personId
  }
  const result = await db.collection(INVITE_COLLECTION).insertOne(data)
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
  branding: Branding | null,
  token: string
): Promise<ClientWorkspaceInfo[]> {
  const { email } = decodeToken(token)
  const account = await getAccount(db, email)
  if (account === null) {
    ctx.error('account not found', { email })
    return []
  }
  return (
    await db
      .collection<Workspace>(WORKSPACE_COLLECTION)
      .find(withProductId(productId, account.admin === true ? {} : { _id: { $in: account.workspaces } }))
      .sort({ lastVisit: -1 })
      .toArray()
  )
    .filter((it) => it.disabled !== true || it.creating === true)
    .map(mapToClientWorkspace)
}

/**
 * @public
 */
export async function getWorkspaceInfo (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
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
    account = await ctx.with('get-account', {}, async () => await getAccount(db, email))
    if (account === null) {
      ctx.error('no account', { email, productId, token })
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

  const [ws] = await ctx.with('get-account', {}, async () =>
    (await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, query)).toArray()).filter(
      (it) => it.disabled !== true || account?.admin === true || it.creating === true
    )
  )
  if (ws == null) {
    ctx.error('no workspace', { workspace: workspace.name, email })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  if (_updateLastVisit && isAccount(account)) {
    void ctx.with('update-last-visit', {}, async () => {
      await updateLastVisit(db, ws, account as Account)
    })
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
export async function createMissingEmployee (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  token: string
): Promise<void> {
  const { email } = decodeToken(token)
  const wsInfo = await getWorkspaceInfo(ctx, db, productId, branding, token)
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  await createPersonAccount(account, productId, wsInfo.workspaceId, AccountRole.Guest)
}

/**
 * @public
 */
export async function assignWorkspace (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  _email: string,
  workspaceId: string,
  role: AccountRole,
  personId?: Ref<Person>,
  shouldReplaceAccount: boolean = false,
  client?: Client,
  personAccountId?: Ref<PersonAccount>
): Promise<Workspace> {
  const email = cleanEmail(_email)
  const initWS = branding?.initWorkspace ?? getMetadata(toolPlugin.metadata.InitWorkspace)
  if (initWS !== undefined && initWS === workspaceId) {
    Analytics.handleError(new Error(`assign-workspace failed ${email} ${workspaceId}`))
    ctx.error('assign-workspace failed', { email, workspaceId, reason: 'initWs === workspaceId' })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const workspaceInfo = await getWorkspaceAndAccount(ctx, db, productId, email, workspaceId)

  if (workspaceInfo.account !== null) {
    await createPersonAccount(
      workspaceInfo.account,
      productId,
      workspaceId,
      role,
      personId,
      shouldReplaceAccount,
      client,
      personAccountId
    )
  }

  // Add account into workspace.
  await assignWorkspaceRaw(db, workspaceInfo)

  ctx.info('assign-workspace success', { email, workspaceId })
  return workspaceInfo.workspace
}

async function assignWorkspaceRaw (db: Db, workspaceInfo: { account: Account, workspace: Workspace }): Promise<void> {
  await db
    .collection(WORKSPACE_COLLECTION)
    .updateOne({ _id: workspaceInfo.workspace._id }, { $addToSet: { accounts: workspaceInfo.account._id } })

  // Add workspace to account
  await db
    .collection(ACCOUNT_COLLECTION)
    .updateOne({ _id: workspaceInfo.account._id }, { $addToSet: { workspaces: workspaceInfo.workspace._id } })
}

async function createPerson (
  ops: TxOperations,
  name: string,
  _email: string,
  withEmployee: boolean
): Promise<Ref<Person>> {
  const id = generateId<Person>()
  const email = cleanEmail(_email)
  let hasGravatar = false
  let gravatarId = ''
  if (isEmail(email)) {
    gravatarId = buildGravatarId(email)
    hasGravatar = await checkHasGravatar(gravatarId)
  }

  await ops.createDoc(
    contact.class.Person,
    contact.space.Contacts,
    {
      name,
      city: '',
      avatarType: hasGravatar ? AvatarType.GRAVATAR : AvatarType.COLOR,
      avatarProps: hasGravatar ? { url: gravatarId } : { color: getAvatarColorForId(id) }
    },
    id
  )
  if (withEmployee) {
    await ops.createMixin(id, contact.class.Person, contact.space.Contacts, contact.mixin.Employee, {
      active: true
    })
  }
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
    const employeeId = await createPerson(ops, name, account.email, true)

    await ops.updateDoc(contact.class.PersonAccount, currentAccount.space, currentAccount._id, {
      person: employeeId
    })
  } else {
    const email = cleanEmail(account.email)
    const gravatarId = buildGravatarId(email)
    const hasGravatar = await checkHasGravatar(gravatarId)

    await ops.update(employee, {
      name,
      avatarType: hasGravatar ? AvatarType.GRAVATAR : AvatarType.COLOR,
      avatarProps: hasGravatar ? { url: gravatarId } : { color: getAvatarColorForId(employee._id) },

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
  role: AccountRole,
  personId?: Ref<Person>,
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
    const shouldCreateEmployee = roleOrder[role] >= roleOrder[AccountRole.User]
    const existingAccount = await ops.findOne(contact.class.PersonAccount, { email: account.email })
    if (existingAccount === undefined) {
      let person: Ref<Person> | undefined
      if (personId !== undefined) {
        person = (await ops.findOne(contact.class.Person, { _id: personId }))?._id
      }
      if (person === undefined) {
        person = await createPerson(ops, name, account.email, shouldCreateEmployee)
      }

      await ops.createDoc(
        contact.class.PersonAccount,
        core.space.Model,
        {
          email: account.email,
          person,
          role
        },
        personAccountId
      )
    } else {
      const person = await ops.findOne(contact.class.Person, { _id: existingAccount.person })
      if (person === undefined) {
        // Employee was deleted, let's restore it.
        const employeeId = await createPerson(ops, name, account.email, shouldCreateEmployee)

        await ops.updateDoc(contact.class.PersonAccount, existingAccount.space, existingAccount._id, {
          person: employeeId
        })
      } else if (ops.getHierarchy().hasMixin(person, contact.mixin.Employee)) {
        const employee = ops.getHierarchy().as(person, contact.mixin.Employee)
        if (!employee.active) {
          await ops.update(employee, {
            active: true
          })
        }
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
  branding: Branding | null,
  token: string,
  oldPassword: string,
  password: string
): Promise<void> {
  const { email } = decodeToken(token)
  const account = await getAccountInfo(ctx, db, productId, branding, email, oldPassword)

  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })
  ctx.info('change-password success', { email })
}

/**
 * @public
 */
export async function changeEmail (ctx: MeasureContext, db: Db, account: Account, newEmail: string): Promise<void> {
  await db.collection<Account>(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { email: newEmail } })
  ctx.info('change-email success', { email: newEmail })
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
export async function requestPassword (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  _email: string
): Promise<void> {
  const email = cleanEmail(_email)
  const account = await getAccount(db, email)

  if (account === null) {
    ctx.info('account not found', { email })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    throw new Error('Please provide email service url')
  }
  const front = branding?.front ?? getMetadata(accountPlugin.metadata.FrontURL)
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
  const lang = branding?.language
  const text = await translate(accountPlugin.string.RecoveryText, { link }, lang)
  const html = await translate(accountPlugin.string.RecoveryHTML, { link }, lang)
  const subject = await translate(accountPlugin.string.RecoverySubject, {}, lang)

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
  ctx.info('recovery email sent', { email, accountEmail: account.email })
}

/**
 * @public
 */
export async function restorePassword (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
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

  return await login(ctx, db, productId, branding, email, password)
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
  branding: Branding | null,
  email: string,
  workspaceId: string
): Promise<void> {
  const { workspace, account } = await getWorkspaceAndAccount(ctx, db, productId, email, workspaceId)

  // Add account into workspace.
  await db
    .collection<Workspace>(WORKSPACE_COLLECTION)
    .updateOne({ _id: workspace._id }, { $pull: { accounts: account._id } })

  // Add account a workspace
  await db
    .collection<Account>(ACCOUNT_COLLECTION)
    .updateOne({ _id: account._id }, { $pull: { workspaces: workspace._id } })
  ctx.info('Workspace removed', { email, workspace })
}

/**
 * @public
 */
export async function checkJoin (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  token: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const { email } = decodeToken(token)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(ctx, invite, email)
  const ws = await getWorkspaceById(db, productId, workspace.name)
  if (ws === null) {
    ctx.error('workspace not found', { name: workspace.name, email, inviteId })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  return await selectWorkspace(ctx, db, productId, branding, token, ws?.workspaceUrl ?? ws.workspace, false)
}

/**
 * @public
 */
export async function dropWorkspace (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  workspaceId: string
): Promise<Workspace> {
  const ws = await getWorkspaceById(db, productId, workspaceId)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceId }))
  }
  await db.collection(WORKSPACE_COLLECTION).deleteOne({ _id: ws._id })
  await db
    .collection<Account>(ACCOUNT_COLLECTION)
    .updateMany({ _id: { $in: ws.accounts ?? [] } }, { $pull: { workspaces: ws._id } })

  ctx.info('Workspace dropped', { workspace: ws.workspace })
  return ws
}

/**
 * @public
 */
export async function dropWorkspaceFull (
  ctx: MeasureContext,
  db: Db,
  client: MongoClient,
  productId: string,
  branding: Branding | null,
  workspaceId: string,
  storageAdapter?: StorageAdapter
): Promise<void> {
  const ws = await dropWorkspace(ctx, db, productId, branding, workspaceId)
  const workspaceDb = client.db(ws.workspace)
  await workspaceDb.dropDatabase()
  const wspace = getWorkspaceId(workspaceId, productId)
  const hasBucket = await storageAdapter?.exists(ctx, wspace)
  if (storageAdapter !== undefined && hasBucket === true) {
    await storageAdapter.delete(ctx, wspace)
  }
  ctx.info('Workspace fully dropped', { workspace: ws.workspace })
}

/**
 * @public
 */
export async function dropAccount (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  email: string
): Promise<void> {
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
  ctx.info('Account Dropped', { email, account })
}

/**
 * @public
 */
export async function leaveWorkspace (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
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
  ctx.info('Account removed from workspace', { email, workspace })
}

/**
 * @public
 */
export async function sendInvite (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  token: string,
  email: string,
  personId?: Ref<Person>,
  role?: AccountRole
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
  const front = branding?.front ?? getMetadata(accountPlugin.metadata.FrontURL)
  if (front === undefined || front === '') {
    throw new Error('Please provide front url')
  }

  const expHours = 48
  const exp = expHours * 60 * 60 * 1000

  const inviteId = await getInviteLink(ctx, db, productId, branding, token, exp, email, 1)
  const link = concatLink(front, `/login/join?inviteId=${inviteId.toString()}`)

  const ws = workspace.workspaceName ?? workspace.workspace
  const lang = branding?.language
  const text = await translate(accountPlugin.string.InviteText, { link, ws, expHours }, lang)
  const html = await translate(accountPlugin.string.InviteHTML, { link, ws, expHours }, lang)
  const subject = await translate(accountPlugin.string.InviteSubject, { ws }, lang)

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
  ctx.info('Invite sent', { email, workspace, link })
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
      ctx.info('account deactivated', { email, workspace })
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
  branding: Branding | null,
  request: any,
  token?: string
) => Promise<any>

function wrap (
  accountMethod: (
    ctx: MeasureContext,
    db: Db,
    productId: string,
    branding: Branding | null,
    ...args: any[]
  ) => Promise<any>
): AccountMethod {
  return async function (
    ctx: MeasureContext,
    db: Db,
    productId: string,
    branding: Branding | null,
    request: any,
    token?: string
  ): Promise<any> {
    if (token !== undefined) request.params.unshift(token)
    return await accountMethod(ctx, db, productId, branding, ...request.params)
      .then((result) => ({ id: request.id, result }))
      .catch((err) => {
        const status =
          err instanceof PlatformError
            ? err.status
            : new Status(Severity.ERROR, platform.status.InternalServerError, {})
        if (status.code === platform.status.InternalServerError) {
          Analytics.handleError(err)
          ctx.error('error', { status, err })
        } else {
          ctx.error('error', { status })
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
  branding: Branding | null,
  _email: string,
  first: string,
  last: string,
  inviteId: ObjectId,
  extra?: Record<string, string>
): Promise<WorkspaceLoginInfo | LoginInfo> {
  try {
    const email = cleanEmail(_email)
    const invite = await getInvite(db, inviteId)
    const workspace = await checkInvite(ctx, invite, email)
    if (last == null) {
      last = ''
    }
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

      const wsRes = await assignWorkspace(
        ctx,
        db,
        productId,
        branding,
        email,
        workspace.name,
        invite?.role ?? AccountRole.User,
        invite?.personId
      )
      const result = await selectWorkspace(
        ctx,
        db,
        productId,
        branding,
        token,
        wsRes.workspaceUrl ?? wsRes.workspace,
        false
      )

      await useInvite(db, inviteId)
      return result
    }
    const newAccount = await createAcc(ctx, db, productId, branding, email, null, first, last, true, extra)
    const token = generateToken(email, getWorkspaceId('', productId), getExtra(newAccount))
    const ws = await assignWorkspace(
      ctx,
      db,
      productId,
      branding,
      email,
      workspace.name,
      invite?.role ?? AccountRole.User,
      invite?.personId
    )
    const result = await selectWorkspace(ctx, db, productId, branding, token, ws.workspaceUrl ?? ws.workspace, false)

    await useInvite(db, inviteId)

    return result
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('joinWithProvider error', { email: _email, ...extra, err })
    throw err
  }
}

export async function loginWithProvider (
  ctx: MeasureContext,
  db: Db,
  productId: string,
  branding: Branding | null,
  _email: string,
  first: string,
  last: string,
  extra?: Record<string, string>
): Promise<LoginInfo> {
  try {
    const email = cleanEmail(_email)
    if (last == null) {
      last = ''
    }
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
    const newAccount = await createAcc(ctx, db, productId, branding, email, null, first, last, true, extra)

    const result = {
      endpoint: getEndpoint(),
      email,
      token: generateToken(email, getWorkspaceId('', productId), getExtra(newAccount))
    }
    return result
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('loginWithProvider error', { email: _email, ...extra, err })
    throw err
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
    getAccountInfoByToken: wrap(getAccountInfoByToken),
    createMissingEmployee: wrap(createMissingEmployee)
    // updateAccount: wrap(updateAccount)
  }
}

export * from './plugin'
export default accountPlugin
