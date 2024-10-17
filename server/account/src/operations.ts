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
// limitations under the License.
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
  Client,
  concatLink,
  Data,
  generateId,
  getWorkspaceId,
  isWorkspaceCreating,
  MeasureContext,
  RateLimiter,
  Ref,
  roleOrder,
  systemAccountEmail,
  TxOperations,
  Version,
  versionToString,
  WorkspaceId,
  type BackupStatus,
  type Branding
} from '@hcengineering/core'
import platform, { getMetadata, PlatformError, Severity, Status, translate } from '@hcengineering/platform'
import { type StorageAdapter } from '@hcengineering/server-core'
import { decodeToken as decodeTokenRaw, generateToken, type Token } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'
import { randomBytes } from 'crypto'
import { type MongoClient } from 'mongodb'
import otpGenerator from 'otp-generator'

import { accountPlugin } from './plugin'
import type {
  Account,
  AccountDB,
  AccountInfo,
  ClientWorkspaceInfo,
  Invite,
  LoginInfo,
  ObjectId,
  OtpInfo,
  Query,
  RegionInfo,
  UpgradeStatistic,
  Workspace,
  WorkspaceEvent,
  WorkspaceInfo,
  WorkspaceLoginInfo,
  WorkspaceOperation
} from './types'
import {
  areDbIdsEqual,
  cleanEmail,
  EndpointKind,
  getEndpoint,
  getRegions,
  hashWithSalt,
  isEmail,
  toAccountInfo,
  verifyPassword
} from './utils'

/**
 * @public
 */
export async function getAccount (db: AccountDB, email: string): Promise<Account | null> {
  return await db.account.findOne({ email: cleanEmail(email) })
}

async function getAccountByQuery (db: AccountDB, query: Record<string, string>): Promise<Account | null> {
  return await db.account.findOne(query)
}

/**
 * @public
 */
export async function setAccountAdmin (db: AccountDB, email: string, admin: boolean): Promise<void> {
  const account = await getAccount(db, email)
  if (account === null) {
    return
  }
  // Add workspace to account
  await db.account.updateOne({ _id: account._id }, { admin })
}

/**
 * @public
 * @param db -
 * @param workspaceUrl -
 * @returns
 */
export async function getWorkspaceByUrl (db: AccountDB, workspaceUrl: string): Promise<Workspace | null> {
  const res = await db.workspace.findOne({ workspaceUrl })
  if (res != null) {
    return res
  }

  return (await db.workspace.find({ workspace: workspaceUrl })).filter((ws) => ws.workspaceUrl == null)[0]
}

/**
 * @public
 * @param db -
 * @param workspace -
 * @returns
 */
export async function getWorkspaceById (db: AccountDB, workspace: string): Promise<Workspace | null> {
  return await db.workspace.findOne({ workspace })
}

async function getAccountInfo (
  ctx: MeasureContext,
  db: AccountDB,
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
  if (!verifyPassword(password, account.hash, account.salt)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidPassword, { account: email }))
  }
  return toAccountInfo(account)
}

async function sendOtpEmail (branding: Branding | null, otp: string, email: string): Promise<void> {
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    console.info('Please provide email service url to enable email otp.')
    return
  }

  const lang = branding?.language
  const app = branding?.title ?? getMetadata(accountPlugin.metadata.ProductName)

  const text = await translate(accountPlugin.string.OtpText, { code: otp, app }, lang)
  const html = await translate(accountPlugin.string.OtpHTML, { code: otp, app }, lang)
  const subject = await translate(accountPlugin.string.OtpSubject, { code: otp, app }, lang)

  const to = email
  await fetch(concatLink(sesURL, '/send'), {
    method: 'POST',
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

export async function getAccountInfoByToken (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<LoginInfo> {
  let email: string = ''
  let workspace: WorkspaceId
  try {
    ;({ email, workspace } = decodeToken(ctx, token))
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

  const workspaceInfo = await getWorkspaceById(db, workspace.name)
  const result = {
    endpoint: workspaceInfo != null ? getEndpoint(ctx, workspaceInfo, EndpointKind.External) : '',
    email,
    confirmed: info.confirmed ?? true,
    token: generateToken(email, getWorkspaceId(''), getExtra(info))
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
  db: AccountDB,
  branding: Branding | null,
  _email: string,
  password: string
): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  try {
    const info = await getAccountInfo(ctx, db, branding, email, password)
    const result = {
      endpoint: '',
      email,
      confirmed: info.confirmed ?? true,
      token: generateToken(email, getWorkspaceId(''), getExtra(info))
    }
    ctx.info('login success', { email })
    return result
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('login failed', { email, _email, err })
    throw err
  }
}

async function getNewOtp (db: AccountDB): Promise<string> {
  let otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  })

  let exist = await db.otp.findOne({ otp })

  while (exist != null) {
    otp = otpGenerator.generate(6, {
      lowerCaseAlphabets: false
    })
    exist = await db.otp.findOne({ otp })
  }

  return otp
}

export async function sendOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  _email: string
): Promise<OtpInfo> {
  const email = cleanEmail(_email)
  const account = await getAccount(db, email)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const now = Date.now()
  const otpData = (await db.otp.find({ account: account._id }, { createdOn: 'descending' }, 1))[0]

  const retryDelay = getMetadata(accountPlugin.metadata.OtpRetryDelaySec) ?? 30
  const isValid = otpData !== undefined && otpData.expires > now && otpData.createdOn + retryDelay * 1000 > now

  if (isValid) {
    return { sent: true, retryOn: otpData.createdOn + retryDelay * 1000 }
  }
  const secs = getMetadata(accountPlugin.metadata.OtpTimeToLiveSec) ?? 60
  const timeToLive = secs * 1000
  const expires = now + timeToLive
  const otp = await getNewOtp(db)

  await sendOtpEmail(branding, otp, email)
  await db.otp.insertOne({ account: account._id, otp, expires, createdOn: now })

  return { sent: true, retryOn: now + retryDelay * 1000 }
}

async function isOtpValid (db: AccountDB, account: Account, otp: string): Promise<boolean> {
  const now = Date.now()
  const otpData = (await db.otp.findOne({ account: account._id, otp })) ?? undefined

  return otpData !== undefined && otpData.expires > now
}

export async function validateOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  _email: string,
  otp: string
): Promise<LoginInfo> {
  const email = cleanEmail(_email)
  const account = await getAccount(db, email)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const isValid = await isOtpValid(db, account, otp)

  if (!isValid) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidOtp, {}))
  }

  try {
    const info = toAccountInfo(account)

    if (account.confirmed !== true) {
      await db.account.updateOne({ _id: account._id }, { confirmed: true })
    }

    const result = {
      endpoint: '',
      email,
      confirmed: true,
      token: generateToken(email, getWorkspaceId(''), getExtra(info))
    }
    await db.otp.deleteMany({ account: account._id })
    ctx.info('otp login success', { email })
    return result
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('otp login failed', { email, _email, err })
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

export const guestAccountEmail = '#guest@hc.engineering'

const failedEmails = new Set()

function decodeToken (ctx: MeasureContext, token: string): Token {
  // eslint-disable-next-line no-useless-catch
  try {
    return decodeTokenRaw(token)
  } catch (err: any) {
    try {
      const decode = decodeTokenRaw(token, false)
      const has = failedEmails.has(decode.email)
      if (!has) {
        failedEmails.add(decode.email)
        // Ok we have error, but we need to log a proper message
        ctx.warn('failed to verify token', { ...decode })
      }
      if (failedEmails.size > 1000) {
        failedEmails.clear()
      }
    } catch (err2: any) {
      // Ignore
    }
    throw err
  }
}

/**
 * @public
 */
export async function getRegionInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null
): Promise<RegionInfo[]> {
  return getRegions()
}

/**
 * @public
 */
export async function selectWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  workspaceUrl: string,
  kind: 'external' | 'internal',
  allowAdmin: boolean = true
): Promise<WorkspaceLoginInfo> {
  const decodedToken = decodeToken(ctx, token)
  const email = cleanEmail(decodedToken.email)

  const endpointKind = kind === 'external' ? EndpointKind.External : EndpointKind.Internal

  if (email === guestAccountEmail && decodedToken.extra?.guest === 'true') {
    const workspaceInfo = await getWorkspaceByUrl(db, workspaceUrl)
    if (workspaceInfo == null) {
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl })
      )
    }
    // Guest mode select workspace
    return {
      endpoint: getEndpoint(ctx, workspaceInfo, kind === 'external' ? EndpointKind.External : EndpointKind.Internal),
      email,
      token,
      workspace: workspaceUrl,
      workspaceId: workspaceInfo.workspace,
      mode: workspaceInfo.mode,
      progress: workspaceInfo.progress
    }
  }

  let accountInfo: Account | null = null
  if (email !== systemAccountEmail) {
    accountInfo = await getAccount(db, email)

    if (accountInfo === null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
    }
  }

  let workspaceInfo: Workspace | null
  if (workspaceUrl === '') {
    // Find from token
    workspaceInfo = await getWorkspaceById(db, decodedToken.workspace.name)
  } else {
    workspaceInfo = await getWorkspaceByUrl(db, workspaceUrl)
  }
  if (workspaceInfo == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl }))
  }

  if ((accountInfo?.admin === true || email === systemAccountEmail) && allowAdmin) {
    return {
      endpoint: getEndpoint(ctx, workspaceInfo, endpointKind),
      email,
      token: generateToken(email, getWorkspaceId(workspaceInfo.workspace), getExtra(accountInfo)),
      workspace: workspaceUrl,
      workspaceId: workspaceInfo.workspace,
      mode: workspaceInfo.mode,
      progress: workspaceInfo.progress
    }
  }

  if (workspaceInfo !== null) {
    if (workspaceInfo.disabled === true && workspaceInfo.mode === 'active') {
      ctx.error('workspace disabled', { workspaceUrl, email })
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl })
      )
    }
    const workspaces = accountInfo?.workspaces ?? []

    for (const w of workspaces) {
      if (areDbIdsEqual(w, workspaceInfo._id)) {
        const result = {
          endpoint: getEndpoint(ctx, workspaceInfo, endpointKind),
          email,
          token: generateToken(email, getWorkspaceId(workspaceInfo.workspace), getExtra(accountInfo)),
          workspace: workspaceUrl,
          workspaceId: workspaceInfo.workspace,
          mode: workspaceInfo.mode,
          progress: workspaceInfo.progress
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
export async function getInvite (db: AccountDB, inviteId: ObjectId): Promise<Invite | null> {
  return await db.invite.findOne({ _id: db.getObjectId(inviteId) })
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
  if (invite.exp !== -1 && invite.exp < Date.now()) {
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
export async function useInvite (db: AccountDB, inviteId: ObjectId): Promise<void> {
  await db.invite.updateOne({ _id: inviteId }, { $inc: { limit: -1 } })
}

/**
 * @public
 */
export async function join (
  ctx: MeasureContext,
  db: AccountDB,
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
    branding,
    email,
    workspace.name,
    invite?.role ?? AccountRole.User,
    invite?.personId
  )

  const token = (await login(ctx, db, branding, email, password)).token
  const result = await selectWorkspace(ctx, db, branding, token, ws.workspaceUrl ?? ws.workspace, 'external')
  await useInvite(db, inviteId)
  return result
}

/**
 * @public
 */
export async function confirmEmail (db: AccountDB, _email: string): Promise<Account> {
  const email = cleanEmail(_email)
  const account = await getAccount(db, email)
  console.log(`confirm email:${email}`)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: _email }))
  }
  if (account.confirmed === true) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyConfirmed, { account: _email }))
  }

  await db.account.updateOne({ _id: account._id }, { confirmed: true })
  account.confirmed = true
  return account
}

/**
 * @public
 */
export async function confirm (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<LoginInfo> {
  const decode = decodeToken(ctx, token)
  const _email = decode.extra?.confirm
  if (_email === undefined) {
    ctx.error('confirm email invalid', { token: decode })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: _email }))
  }
  const email = cleanEmail(_email)
  const account = await confirmEmail(db, email)
  const workspaceInfo = await getWorkspaceById(db, decode.workspace.name)
  const result = {
    endpoint: workspaceInfo != null ? getEndpoint(ctx, workspaceInfo, EndpointKind.External) : '',
    email,
    token: generateToken(email, getWorkspaceId(''), getExtra(account))
  }
  ctx.info('confirm success', { email })
  return result
}

async function sendConfirmation (branding: Branding | null, account: Account): Promise<void> {
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
    getWorkspaceId(''),
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
  db: AccountDB,
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
    branding,
    email,
    workspace.name,
    invite?.role ?? AccountRole.User,
    invite?.personId
  )

  const token = (await login(ctx, db, branding, email, password)).token
  const result = await selectWorkspace(ctx, db, branding, token, ws.workspaceUrl ?? ws.workspace, 'external')
  await useInvite(db, inviteId)
  return result
}

/**
 * @public
 */
export async function createAcc (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  _email: string,
  password: string | null,
  first: string,
  last: string,
  confirmed: boolean = false,
  shouldConfirm: boolean = true,
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

  await db.account.insertOne(
    {
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
    },
    '_id'
  )

  const newAccount = await getAccount(db, email)
  if (newAccount === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, { account: email }))
  }
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (!confirmed && shouldConfirm) {
    if (sesURL !== undefined && sesURL !== '') {
      await sendConfirmation(branding, newAccount)
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
  db: AccountDB,
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
    branding,
    email,
    password,
    first,
    last,
    sesURL === undefined || sesURL === ''
  )

  const result = {
    endpoint: '',
    email,
    token: generateToken(email, getWorkspaceId(''), getExtra(account))
  }
  return result
}

/**
 * @public
 */
export async function signUpOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  _email: string
): Promise<OtpInfo> {
  const email = cleanEmail(_email)
  const first = email.split('@', 1)[0] ?? ''
  const last = ''

  await createAcc(ctx, db, branding, email, null, first, last, false, false)

  return await sendOtp(ctx, db, branding, _email)
}

/**
 * @public
 */
export async function listWorkspaces (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<WorkspaceInfo[]> {
  decodeToken(ctx, token) // Just verify token is valid

  return (await db.workspace.find({})).filter((it) => it.disabled !== true).map(trimWorkspaceInfo)
}

/**
 * @public
 */
export async function listWorkspacesByAccount (db: AccountDB, email: string): Promise<WorkspaceInfo[]> {
  const account = await getAccount(db, email)

  if (account === null) {
    return []
  }

  return (await db.workspace.find({ _id: { $in: account.workspaces } }))
    .filter((it) => it.disabled !== true)
    .map(trimWorkspaceInfo)
}

/**
 * @public
 */
export async function countWorkspacesInRegion (
  db: AccountDB,
  region: string = '',
  upToVersion?: Data<Version>,
  visitedSince?: number
): Promise<number> {
  return await db.workspace.countWorkspacesInRegion(region, upToVersion, visitedSince)
}

/**
 * @public
 */
export async function listWorkspacesRaw (db: AccountDB): Promise<Workspace[]> {
  return (await db.workspace.find({})).filter((it) => it.disabled !== true)
}

/**
 * @public
 */
export async function listWorkspacesPure (db: AccountDB): Promise<Workspace[]> {
  return await db.workspace.find({})
}

/**
 * @public
 */
export async function listInvites (db: AccountDB): Promise<Invite[]> {
  return await db.invite.find({})
}

/**
 * @public
 */
export async function setWorkspaceDisabled (
  db: AccountDB,
  workspaceId: Workspace['_id'],
  disabled: boolean
): Promise<void> {
  await db.workspace.updateOne({ _id: workspaceId }, { disabled })
}

export async function cleanExpiredOtp (db: AccountDB): Promise<void> {
  await db.otp.deleteMany({ expires: { $lte: Date.now() } })
}

/**
 * @public
 */
export async function updateWorkspace (db: AccountDB, info: Workspace, ops: Partial<Workspace>): Promise<void> {
  await db.workspace.updateOne({ _id: info._id }, { ...info, ...ops })
}

/**
 * @public
 */
export async function listAccounts (db: AccountDB): Promise<Account[]> {
  return await db.account.find({})
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
  db: AccountDB,
  email: string,
  branding: Branding | null,
  workspaceName: string,
  fixedWorkspace?: string,
  region?: string
): Promise<Workspace> {
  type WorkspaceData = Omit<Workspace, '_id' | 'endpoint'>
  const brandingKey = branding?.key ?? 'huly'

  const reg = getRegions().find((it) => it.region === (region ?? ''))
  if (reg === undefined) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.InternalServerError, {
        workspace: fixedWorkspace,
        region: region ?? ''
      })
    )
  }
  if (fixedWorkspace !== undefined) {
    const ws = await db.workspace.find({ workspaceUrl: fixedWorkspace })

    if ((await getWorkspaceById(db, fixedWorkspace)) !== null || ws.length > 0) {
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.WorkspaceAlreadyExists, { workspace: fixedWorkspace })
      )
    }

    const data: WorkspaceData = {
      workspace: fixedWorkspace,
      workspaceUrl: fixedWorkspace,
      version: { major: 0, minor: 0, patch: 0 }, // We do not know version until it will be created
      branding: brandingKey,
      workspaceName,
      accounts: [],
      disabled: true,
      region: region ?? '',
      mode: 'pending-creation',
      progress: 0,
      createdOn: Date.now(),
      lastVisit: Date.now(),
      createdBy: email,
      lastProcessingTime: 0,
      attempts: 0
    }
    // Add fixed workspace
    const id = await db.workspace.insertOne(data, '_id')
    return { _id: id, ...data, endpoint: '' }
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
    const sameUrl = await db.workspace.findOne({ workspaceUrl })
    const sameWorkspace = await db.workspace.findOne({ workspace })

    if (sameUrl === null && sameWorkspace === null) {
      const data: WorkspaceData = {
        workspace,
        workspaceUrl,
        version: { major: 0, minor: 0, patch: 0 }, // We do not know version until it will be created,
        branding: brandingKey,
        workspaceName,
        accounts: [],
        disabled: true,
        region: region ?? '',
        mode: 'pending-creation',
        progress: 0,
        createdOn: Date.now(),
        lastVisit: Date.now(),
        createdBy: email,
        lastProcessingTime: 0,
        attempts: 0
      }
      // Nice we do not have a workspace or workspaceUrl duplicated.
      const id = await db.workspace.insertOne(data, '_id')
      return { _id: id, ...data, endpoint: '' }
    }

    if (sameUrl !== null) {
      urlPostfix = generateId('-')
    }
    if (sameWorkspace !== null) {
      idPostfix = generateId('-')
    }
    iteration++

    // A stupid check, but for sure we not hang.
    if (iteration > 10000) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceRateLimit, { workspace }))
    }
  }
}

// It always should be one.
const createQueue = new RateLimiter(1)

/**
 * @public
 */
export async function createWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string,
  workspaceName: string,
  workspace?: string,
  region?: string
): Promise<Workspace> {
  // We need to search for duplicate workspaceUrl
  // Safe generate workspace record.
  return await createQueue.exec(async () => {
    return await generateWorkspaceRecord(db, email, branding, workspaceName, workspace, region)
  })
}

/**
 * @public
 */
export async function workerHandshake (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  region: string, // A worker region
  version: Data<Version>, // A worker version
  operation: WorkspaceOperation
): Promise<void> {
  const decodedToken = decodeToken(ctx, token)
  if (decodedToken.extra?.service !== 'workspace') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (!['all', 'upgrade'].includes(operation)) {
    return
  }

  const strVersion = versionToString(version)

  if ((await db.upgrade.findOne({ version: strVersion, region })) !== null) {
    return
  }

  const workspacesCnt = await ctx.with(
    'count-workspaces-in-region',
    {},
    async (ctx) => await countWorkspacesInRegion(db, region, version, Date.now() - 24 * 60 * 60 * 1000)
  )

  await db.upgrade.insertOne({
    region,
    version: strVersion,
    startTime: Date.now(),
    total: workspacesCnt,
    toProcess: workspacesCnt
  })
}

/**
 * @public
 */
export async function updateWorkspaceInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  workspaceId: string,
  event: WorkspaceEvent,
  version: Data<Version>, // A worker version
  progress: number,
  message?: string
): Promise<void> {
  const decodedToken = decodeToken(ctx, token)
  if (decodedToken.extra?.service !== 'workspace') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const workspaceInfo = await getWorkspaceById(db, workspaceId)
  if (workspaceInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceId }))
  }

  const update: Partial<WorkspaceInfo> = {}
  switch (event) {
    case 'create-started':
      update.mode = 'creating'
      if (workspaceInfo.mode !== 'creating') {
        update.attempts = 0
      }
      update.progress = progress
      break
    case 'upgrade-started':
      if (workspaceInfo.mode !== 'upgrading') {
        update.attempts = 0
      }
      update.mode = 'upgrading'
      update.progress = progress
      break
    case 'create-done':
      ctx.info('update workspace info: create-done', { workspaceId, event, version, progress })
      await db.workspace.updateOne(
        { _id: workspaceInfo._id },
        {
          version,
          lastProcessingTime: Date.now()
        }
      )
      await postCreateUserWorkspace(ctx, db, branding, workspaceInfo)
      update.mode = 'active'
      update.disabled = false
      update.progress = progress
      break
    case 'upgrade-done':
      ctx.info('update workspace info: upgrade-done', { workspaceId, event, version, progress })
      await postUpgradeUserWorkspace(ctx, db, branding, workspaceInfo.region ?? '', version)
      update.mode = 'active'
      update.version = version
      update.progress = progress
      break
    case 'progress':
      update.progress = progress
      break
    case 'ping':
    default:
      break
  }

  if (message != null) {
    update.message = message
  }

  await db.workspace.updateOne(
    { _id: workspaceInfo._id },
    {
      ...update,
      lastProcessingTime: Date.now()
    }
  )
}

/**
 * @public
 */
export async function updateBackupInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  backupInfo: BackupStatus
): Promise<void> {
  const decodedToken = decodeToken(ctx, token)
  if (decodedToken.extra?.service !== 'backup') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const workspaceInfo = await getWorkspaceById(db, decodedToken.workspace.name)
  if (workspaceInfo === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: decodedToken.workspace.name })
    )
  }

  await db.workspace.updateOne(
    { _id: workspaceInfo._id },
    {
      backupInfo,
      lastProcessingTime: Date.now()
    }
  )
}

async function postCreateUserWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  workspace: Workspace
): Promise<void> {
  const client = await connect(
    getEndpoint(ctx, workspace, EndpointKind.Internal),
    getWorkspaceId(workspace.workspace),
    undefined,
    {
      admin: 'true'
    }
  )
  try {
    await assignWorkspace(
      ctx,
      db,
      branding,
      workspace.createdBy,
      workspace.workspace,
      AccountRole.Owner,
      undefined,
      true,
      client
    )
    ctx.info('Creating server side done', { workspaceName: workspace.workspaceName, email: workspace.workspaceName })
  } catch (err: any) {
    Analytics.handleError(err)
  } finally {
    await client.close()
  }
}

async function postUpgradeUserWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  region: string,
  version: Data<Version>
): Promise<void> {
  // TODO: Exception $inc?
  await db.upgrade.updateOne(
    {
      region,
      version: versionToString(version),
      toProcess: { $gt: 0 }
    },
    {
      $inc: {
        toProcess: -1
      },
      lastUpdate: Date.now()
    }
  )
}

/**
 * Retrieves one workspace for which there are things to process.
 *
 * Workspace is provided for 30seconds. This timeout is reset
 * on every progress update.
 * If no progress is reported for the workspace during this time,
 * it will become available again to be processed by another executor.
 */
export async function getPendingWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  region: string, // A region requested
  version: Data<Version>, // A workspace version requested, if it doesn't match for the region, workspace will be returned for upgrade
  operation: WorkspaceOperation
): Promise<WorkspaceInfo | undefined> {
  const decodedToken = decodeToken(ctx, token)
  if (decodedToken.extra?.service !== 'workspace') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  // Move to config?
  const processingTimeoutMs = 30 * 1000
  const wsLivenessDays = getMetadata(accountPlugin.metadata.WsLivenessDays)
  const wsLivenessMs = wsLivenessDays !== undefined ? wsLivenessDays * 24 * 60 * 60 * 1000 : undefined

  const result = await db.workspace.getPendingWorkspace(region, version, operation, processingTimeoutMs, wsLivenessMs)

  if (result != null) {
    ctx.info('getPendingWorkspace', {
      workspaceId: result.workspace,
      mode: result.mode,
      workspaceName: result.workspaceName,
      operation,
      region,
      workspaceVersion: result.version,
      requestedVersion: version
    })
  }

  return result
}

/**
 * @public
 */
export async function createUserWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  workspaceName: string,
  region?: string
): Promise<LoginInfo> {
  const { email } = decodeToken(ctx, token)

  ctx.info('Creating workspace', { workspaceName, email })

  const userAccount = await getAccount(db, email)

  if (userAccount === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  if (userAccount.confirmed === false) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotConfirmed, { account: email }))
  }

  if (userAccount.lastWorkspace !== undefined && userAccount.admin === false) {
    if (Date.now() - userAccount.lastWorkspace < 60 * 1000) {
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.WorkspaceRateLimit, { workspace: workspaceName })
      )
    }
  }
  const workspaceInfo = await createWorkspace(ctx, db, branding, email, workspaceName, undefined, region)

  // Update last workspace time.
  await db.account.updateOne({ _id: userAccount._id }, { lastWorkspace: Date.now() })

  await assignWorkspaceRaw(db, { account: userAccount, workspace: workspaceInfo })

  const result = {
    endpoint: getEndpoint(ctx, workspaceInfo, EndpointKind.External),
    email,
    token: generateToken(email, getWorkspaceId(workspaceInfo.workspace), getExtra(userAccount)),
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
  db: AccountDB,
  branding: Branding | null,
  token: string,
  exp: number,
  emailMask: string,
  limit: number,
  role?: AccountRole,
  personId?: Ref<Person>
): Promise<ObjectId> {
  const { workspace, email } = decodeToken(ctx, token)
  const wsPromise = await getWorkspaceById(db, workspace.name)
  if (wsPromise === null) {
    ctx.error('workspace not found', { workspace, email })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  ctx.info('Getting invite link', { workspace: workspace.name, emailMask, limit })
  const data: Omit<Invite, '_id'> = {
    workspace,
    exp: exp < 0 ? -1 : Date.now() + exp,
    emailMask,
    limit,
    role: role ?? AccountRole.User
  }
  if (personId !== undefined) {
    data.personId = personId
  }
  const result = await db.invite.insertOne(data, '_id')
  return result
}

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
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<ClientWorkspaceInfo[]> {
  const { email } = decodeToken(ctx, token)
  const account = await getAccount(db, email)
  if (account === null) {
    ctx.error('account not found', { email })
    return []
  }

  if (account.admin !== true && account.workspaces.length === 0) {
    return []
  }

  return (
    await db.workspace.find(account.admin === true ? {} : { _id: { $in: account.workspaces } }, {
      lastVisit: 'descending'
    })
  )
    .filter((it) => it.disabled !== true || isWorkspaceCreating(it.mode))
    .map(mapToClientWorkspace)
}

export type ClientWSInfoWithUpgrade = ClientWorkspaceInfo & {
  upgrade?: {
    toProcess: number
    total: number
    elapsed: number
    eta: number
  }
}

/**
 * @public
 */
export async function getWorkspaceInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  _updateLastVisit: boolean = false
): Promise<ClientWSInfoWithUpgrade> {
  const { email, workspace, extra } = decodeToken(ctx, token)
  const guest = extra?.guest === 'true'
  let account: Pick<Account, 'admin' | 'workspaces'> | Account | null = null
  const query: Query<Workspace> = {
    workspace: workspace.name
  }
  if (email !== systemAccountEmail && !guest) {
    account = await ctx.with('get-account', {}, async () => await getAccount(db, email))
    if (account === null) {
      ctx.error('no account', { email, token })
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
    if (account.workspaces.length === 0) {
      ctx.error('no workspace', { workspace: workspace.name, email })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    query._id = { $in: account.workspaces }
  }

  const [ws] = await ctx.with('get-workspace', {}, async () =>
    (await db.workspace.find(query)).filter(
      (it) => it.disabled !== true || account?.admin === true || it.mode !== 'active'
    )
  )
  if (ws == null) {
    ctx.error('no workspace', { workspace: workspace.name, email })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  if (_updateLastVisit && (isAccount(account) || email === systemAccountEmail)) {
    void ctx.with('update-last-visit', {}, async () => {
      await updateLastVisit(db, ws, account as Account)
    })
  }

  const clientWs: ClientWSInfoWithUpgrade = mapToClientWorkspace(ws)
  const statistic = await getUpgradeStatistics(db, ws.region ?? '')
  let upgrade: ClientWSInfoWithUpgrade['upgrade']

  if (statistic !== undefined) {
    const elapsed = Date.now() - statistic.startTime

    upgrade = {
      toProcess: statistic.toProcess,
      total: statistic.total,
      elapsed,
      eta: Math.floor((elapsed / (statistic.total - statistic.toProcess + 1)) * statistic.toProcess)
    }
  }

  clientWs.upgrade = upgrade

  return clientWs
}

async function getUpgradeStatistics (db: AccountDB, region: string): Promise<UpgradeStatistic | undefined> {
  return (
    (await db.upgrade.findOne({
      region,
      toProcess: { $gt: 0 }
    })) ?? undefined
  )
}

function isAccount (data: Pick<Account, 'admin' | 'workspaces'> | Account | null): data is Account {
  return (data as Account)._id !== undefined
}

async function updateLastVisit (db: AccountDB, ws: Workspace, account: Account): Promise<void> {
  const now = Date.now()
  await db.workspace.updateOne({ _id: ws._id }, { lastVisit: now })

  // Add workspace to account
  await db.account.updateOne({ _id: account._id }, { lastVisit: now })
}

async function getWorkspaceAndAccount (
  ctx: MeasureContext,
  db: AccountDB,
  _email: string,
  workspaceUrl: string
): Promise<{ account: Account, workspace: Workspace }> {
  const email = cleanEmail(_email)
  const workspace = await getWorkspaceById(db, workspaceUrl)
  if (workspace === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceUrl }))
  }
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  return { account, workspace }
}

/**
 * @public
 */
export async function setRole (
  ctx: MeasureContext,
  db: AccountDB,
  _email: string,
  workspace: string,
  role: AccountRole,
  client?: Client
): Promise<void> {
  if (!Object.values(AccountRole).includes(role)) return
  const email = cleanEmail(_email)
  const workspaceInfo = await getWorkspaceById(db, workspace)
  if (workspaceInfo == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace }))
  }
  const connection =
    client ?? (await connect(getEndpoint(ctx, workspaceInfo, EndpointKind.Internal), getWorkspaceId(workspace)))
  try {
    const ops = new TxOperations(connection, core.account.System)

    const existingAccount = await ops.findOne(contact.class.PersonAccount, { email })

    if (existingAccount !== undefined) {
      await ops.update(existingAccount, {
        role
      })
    }
  } finally {
    if (client == null) {
      await connection.close()
    }
  }
}

/**
 * @public
 */
export async function createMissingEmployee (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<void> {
  const { email } = decodeToken(ctx, token)
  const wsInfo = await getWorkspaceInfo(ctx, db, branding, token)
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  await createPersonAccount(ctx, wsInfo, account, wsInfo.workspaceId, AccountRole.Guest)
}

/**
 * @public
 */
export async function assignWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
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
  const workspaceInfo = await getWorkspaceAndAccount(ctx, db, email, workspaceId)

  if (workspaceInfo.account !== null) {
    await createPersonAccount(
      ctx,
      workspaceInfo.workspace,
      workspaceInfo.account,
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

async function assignWorkspaceRaw (
  db: AccountDB,
  workspaceInfo: { account: Account, workspace: Workspace }
): Promise<void> {
  await db.assignWorkspace(workspaceInfo.account._id, workspaceInfo.workspace._id)
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
        contact.class.Person,
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
  ctx: MeasureContext,
  workspaceInfo: WorkspaceInfo,
  account: Account,
  workspace: string,
  role: AccountRole,
  personId?: Ref<Person>,
  shouldReplaceCurrent: boolean = false,
  client?: Client,
  personAccountId?: Ref<PersonAccount>
): Promise<void> {
  const connection =
    client ?? (await connect(getEndpoint(ctx, workspaceInfo, EndpointKind.Internal), getWorkspaceId(workspace)))
  try {
    const ops = new TxOperations(connection, core.account.System)

    const name = combineName(account.first, account.last)
    // Check if PersonAccount is not exists
    if (shouldReplaceCurrent) {
      const currentAccount = await ops.findOne(contact.class.PersonAccount, {})
      if (currentAccount !== undefined) {
        await replaceCurrentAccount(ops, account, currentAccount, name)
        return
      }
    }
    const shouldCreateEmployee = roleOrder[role] >= roleOrder[AccountRole.Guest]
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
    if (client == null) {
      await connection.close()
    }
  }
}

/**
 * @public
 */
export async function changePassword (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  oldPassword: string,
  password: string
): Promise<void> {
  const { email } = decodeToken(ctx, token)
  const account = await getAccountInfo(ctx, db, branding, email, oldPassword)

  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.account.updateOne({ _id: account._id }, { salt, hash })
  ctx.info('change-password success', { email })
}

/**
 * @public
 */
export async function changeEmail (
  ctx: MeasureContext,
  db: AccountDB,
  account: Account,
  newEmail: string
): Promise<void> {
  await db.account.updateOne({ _id: account._id }, { email: newEmail })
  ctx.info('change-email success', { email: newEmail })
}

/**
 * @public
 */
export async function replacePassword (db: AccountDB, email: string, password: string): Promise<void> {
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.account.updateOne({ _id: account._id }, { salt, hash })
}

/**
 * @public
 */
export async function requestPassword (
  ctx: MeasureContext,
  db: AccountDB,
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
    getWorkspaceId(''),
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
  db: AccountDB,
  branding: Branding | null,
  token: string,
  password: string
): Promise<LoginInfo> {
  const decode = decodeToken(ctx, token)
  const email = decode.extra?.restore
  if (email === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  await updatePassword(db, account, password)

  return await login(ctx, db, branding, email, password)
}

async function updatePassword (db: AccountDB, account: Account, password: string | null): Promise<void> {
  const salt = randomBytes(32)
  const hash = password !== null ? hashWithSalt(password, salt) : null

  await db.account.updateOne({ _id: account._id }, { salt, hash })
}

/**
 * @public
 */
export async function removeWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string,
  workspaceId: string
): Promise<void> {
  const { workspace, account } = await getWorkspaceAndAccount(ctx, db, email, workspaceId)

  await db.unassignWorkspace(account._id, workspace._id)
  ctx.info('Workspace removed', { email, workspace })
}

/**
 * @public
 */
export async function checkJoin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const { email } = decodeToken(ctx, token)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(ctx, invite, email)
  const ws = await getWorkspaceById(db, workspace.name)
  if (ws === null) {
    ctx.error('workspace not found', { name: workspace.name, email, inviteId })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }
  return await selectWorkspace(ctx, db, branding, token, ws?.workspaceUrl ?? ws.workspace, 'external', false)
}

/**
 * @public
 */
export async function dropWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  workspaceId: string
): Promise<Workspace> {
  const ws = await getWorkspaceById(db, workspaceId)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspaceId }))
  }

  await Promise.all(
    (ws.accounts ?? []).map(async (account) => {
      await db.unassignWorkspace(account, ws._id)
    })
  )

  await db.workspace.deleteMany({ _id: ws._id })

  ctx.info('Workspace dropped', { workspace: ws.workspace })
  return ws
}

/**
 * @public
 */
export async function dropWorkspaceFull (
  ctx: MeasureContext,
  db: AccountDB,
  client: MongoClient,
  branding: Branding | null,
  workspaceId: string,
  storageAdapter?: StorageAdapter
): Promise<void> {
  const ws = await dropWorkspace(ctx, db, branding, workspaceId)
  const workspaceDb = client.db(ws.workspace)
  await workspaceDb.dropDatabase()
  const wspace = getWorkspaceId(workspaceId)
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
  db: AccountDB,
  branding: Branding | null,
  email: string
): Promise<void> {
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const workspaces = await db.workspace.find({ _id: { $in: account.workspaces } })

  await Promise.all(
    workspaces.map(async (ws) => {
      await deactivatePersonAccount(ctx, db, account.email, ws.workspace)
    })
  )

  await Promise.all(
    (account.workspaces ?? []).map(async (ws) => {
      await db.unassignWorkspace(account._id, ws)
    })
  )

  await db.account.deleteMany({ _id: account._id })

  ctx.info('Account Dropped', { email, account })
}

/**
 * @public
 */
export async function leaveWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  email: string
): Promise<void> {
  const tokenData = decodeToken(ctx, token)

  const currentAccount = await getAccount(db, tokenData.email)
  if (currentAccount === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: tokenData.email }))
  }

  const workspace = await getWorkspaceById(db, tokenData.workspace.name)
  if (workspace === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: tokenData.workspace.name })
    )
  }

  await deactivatePersonAccount(ctx, db, email, workspace.workspace)

  const account = tokenData.email !== email ? await getAccount(db, email) : currentAccount
  if (account !== null) {
    await db.unassignWorkspace(account._id, workspace._id)
  }
  ctx.info('Account removed from workspace', { email, workspace })
}

/**
 * @public
 */
export async function sendInvite (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  email: string,
  personId?: Ref<Person>,
  role?: AccountRole
): Promise<void> {
  const tokenData = decodeToken(ctx, token)
  const currentAccount = await getAccount(db, tokenData.email)
  if (currentAccount === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: tokenData.email }))
  }

  const workspace = await getWorkspaceById(db, tokenData.workspace.name)
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

  const inviteId = await getInviteLink(ctx, db, branding, token, exp, email, 1)
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
  db: AccountDB,
  email: string,
  workspace: string
): Promise<void> {
  const workspaceInfo = await getWorkspaceById(db, workspace)
  if (workspaceInfo == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace }))
  }
  const connection = await connect(getEndpoint(ctx, workspaceInfo, EndpointKind.Internal), getWorkspaceId(workspace))
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
  db: AccountDB,
  branding: Branding | null,
  request: any,
  token?: string
) => Promise<any>

function wrap (
  accountMethod: (ctx: MeasureContext, db: AccountDB, branding: Branding | null, ...args: any[]) => Promise<any>
): AccountMethod {
  return async function (
    ctx: MeasureContext,
    db: AccountDB,
    branding: Branding | null,
    request: any,
    token?: string
  ): Promise<any> {
    if (token !== undefined) request.params.unshift(token)
    return await accountMethod(ctx, db, branding, ...request.params)
      .then((result) => ({ id: request.id, result }))
      .catch((err) => {
        const status =
          err instanceof PlatformError
            ? err.status
            : new Status(Severity.ERROR, platform.status.InternalServerError, {})

        if (((err.message as string) ?? '') === 'Signature verification failed') {
          // Let's send un authorized
          return {
            error: new Status(Severity.ERROR, platform.status.Unauthorized, {})
          }
        }
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
  db: AccountDB,
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

      const token = generateToken(email, getWorkspaceId(''), getExtra(account))
      const ws = await getWorkspaceById(db, workspace.name)

      if (ws != null && ws.accounts.includes(account._id)) {
        const result = {
          endpoint: getEndpoint(ctx, ws, EndpointKind.External),
          email,
          token
        }
        return result
      }

      const wsRes = await assignWorkspace(
        ctx,
        db,
        branding,
        email,
        workspace.name,
        invite?.role ?? AccountRole.User,
        invite?.personId
      )
      const result = await selectWorkspace(
        ctx,
        db,
        branding,
        token,
        wsRes.workspaceUrl ?? wsRes.workspace,
        'external',
        false
      )

      await useInvite(db, inviteId)
      return result
    }
    const newAccount = await createAcc(ctx, db, branding, email, null, first, last, true, true, extra)
    const token = generateToken(email, getWorkspaceId(''), getExtra(newAccount))
    const ws = await assignWorkspace(
      ctx,
      db,
      branding,
      email,
      workspace.name,
      invite?.role ?? AccountRole.User,
      invite?.personId
    )
    const result = await selectWorkspace(ctx, db, branding, token, ws.workspaceUrl ?? ws.workspace, 'external', false)

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
  db: AccountDB,
  branding: Branding | null,
  _email: string,
  first: string,
  last: string,
  extra?: Record<string, string>,
  signUpDisabled: boolean = false
): Promise<LoginInfo | null> {
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
        endpoint: '',
        email,
        token: generateToken(email, getWorkspaceId(''), getExtra(account))
      }
      return result
    }

    if (signUpDisabled) {
      return null
    }

    const newAccount = await createAcc(ctx, db, branding, email, null, first, last, true, true, extra)

    const result = {
      endpoint: '',
      email,
      token: generateToken(email, getWorkspaceId(''), getExtra(newAccount))
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
export async function changeUsername (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  first: string,
  last: string
): Promise<void> {
  const { email } = decodeToken(ctx, token)
  const account = await getAccount(db, email)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  await db.account.updateOne({ _id: account._id }, { first, last })
  ctx.info('change-username success', { email })
}

/**
 * @public
 */
export async function updateWorkspaceName (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  name: string
): Promise<void> {
  const decodedToken = decodeToken(ctx, token)
  const workspaceInfo = await getWorkspaceById(db, decodedToken.workspace.name)
  if (workspaceInfo === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: decodedToken.workspace.name })
    )
  }

  await db.workspace.updateOne(
    { _id: workspaceInfo._id },
    {
      workspaceName: name
    }
  )
}

/**
 * @public
 */
export async function deleteWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<void> {
  const { workspace, email } = decodeToken(ctx, token)
  const workspaceInfo = await getWorkspaceById(db, workspace.name)
  if (workspaceInfo === null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace: workspace.name })
    )
  }

  const connection = await connect(
    getEndpoint(ctx, workspaceInfo, EndpointKind.Internal),
    getWorkspaceId(workspaceInfo.workspace)
  )
  try {
    const ops = new TxOperations(connection, core.account.System)
    const ownerAccount = await ops.findOne(contact.class.PersonAccount, { email, role: AccountRole.Owner })
    if (ownerAccount == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }

    await db.workspace.updateOne(
      { _id: workspaceInfo._id },
      {
        disabled: true,
        mode: 'pending-deletion'
      }
    )
  } finally {
    await connection.close()
  }
}

/**
 * @public
 */
export function getMethods (hasSignUp: boolean = true): Record<string, AccountMethod> {
  return {
    login: wrap(login),
    join: wrap(join),
    sendOtp: wrap(sendOtp),
    validateOtp: wrap(validateOtp),
    signUpOtp: wrap(signUpOtp),
    checkJoin: wrap(checkJoin),
    signUpJoin: wrap(signUpJoin),
    selectWorkspace: wrap(selectWorkspace),
    getRegionInfo: wrap(getRegionInfo),
    getUserWorkspaces: wrap(getUserWorkspaces),
    getInviteLink: wrap(getInviteLink),
    getAccountInfo: wrap(getAccountInfo),
    getWorkspaceInfo: wrap(getWorkspaceInfo),
    ...(hasSignUp ? { createAccount: wrap(createAccount) } : {}),
    createWorkspace: wrap(createUserWorkspace),
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
    createMissingEmployee: wrap(createMissingEmployee),
    changeUsername: wrap(changeUsername),
    updateWorkspaceName: wrap(updateWorkspaceName),
    deleteWorkspace: wrap(deleteWorkspace),
    // updateAccount: wrap(updateAccount),
    // Workspace service methods
    getPendingWorkspace: wrap(getPendingWorkspace),
    updateWorkspaceInfo: wrap(updateWorkspaceInfo),
    updateBackupInfo: wrap(updateBackupInfo),
    workerHandshake: wrap(workerHandshake)
  }
}

export * from './plugin'
export default accountPlugin
