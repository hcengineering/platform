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
  Person
} from '@hcengineering/contact'
import core, {
  AccountRole,
  concatLink,
  Data,
  getWorkspaceId,
  Ref,
  systemAccountEmail,
  Tx,
  TxOperations,
  Version,
  WorkspaceId
} from '@hcengineering/core'
import { MigrateOperation } from '@hcengineering/model'
import platform, {
  getMetadata,
  Metadata,
  PlatformError,
  Plugin,
  plugin,
  Severity,
  Status
} from '@hcengineering/platform'
import { cloneWorkspace } from '@hcengineering/server-backup'
import { decodeToken, generateToken } from '@hcengineering/server-token'
import toolPlugin, { connect, initModel, upgradeModel } from '@hcengineering/server-tool'
import { pbkdf2Sync, randomBytes } from 'crypto'
import { Binary, Db, Filter, ObjectId } from 'mongodb'
import fetch from 'node-fetch'

const WORKSPACE_COLLECTION = 'workspace'
const ACCOUNT_COLLECTION = 'account'
const INVITE_COLLECTION = 'invite'

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
  metadata: {
    FrontURL: '' as Metadata<string>,
    SES_URL: '' as Metadata<string>
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
  workspace: string
  organisation: string
  accounts: ObjectId[]
  productId: string
  disabled?: boolean
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

/**
 * @public
 */
export async function getAccount (db: Db, email: string): Promise<Account | null> {
  return await db.collection(ACCOUNT_COLLECTION).findOne<Account>({ email })
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
 * @param workspace -
 * @returns
 */
export async function getWorkspace (db: Db, productId: string, workspace: string): Promise<Workspace | null> {
  return await db.collection(WORKSPACE_COLLECTION).findOne<Workspace>(withProductId(productId, { workspace }))
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
  if (!verifyPassword(password, account.hash.buffer, account.salt.buffer)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidPassword, { account: email }))
  }
  return toAccountInfo(account)
}

async function getAccountInfoByToken (db: Db, productId: string, token: string): Promise<AccountInfo> {
  const { email } = decodeToken(token)
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
export async function login (db: Db, productId: string, email: string, password: string): Promise<LoginInfo> {
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
  workspace: string,
  allowAdmin: boolean = true
): Promise<WorkspaceLoginInfo> {
  const { email } = decodeToken(token)
  const accountInfo = await getAccount(db, email)
  if (accountInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  if (accountInfo.admin === true && allowAdmin) {
    return {
      endpoint: getEndpoint(),
      email,
      token: generateToken(email, getWorkspaceId(workspace, productId), getExtra(accountInfo)),
      workspace,
      productId
    }
  }

  const workspaceInfo = await getWorkspace(db, productId, workspace)

  if (workspaceInfo !== null) {
    if (workspaceInfo.disabled === true) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace }))
    }
    const workspaces = accountInfo.workspaces

    for (const w of workspaces) {
      if (w.equals(workspaceInfo._id)) {
        const result = {
          endpoint: getEndpoint(),
          email,
          token: generateToken(email, getWorkspaceId(workspace, productId), getExtra(accountInfo)),
          workspace,
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
  email: string,
  password: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(invite, email)
  console.log(`join attempt:${email}, ${workspace.name}`)
  await assignWorkspace(db, productId, email, workspace.name)

  const token = (await login(db, productId, email, password)).token
  const result = await selectWorkspace(db, productId, token, workspace.name)
  await useInvite(db, inviteId)
  return result
}

/**
 * @public
 */
export async function confirmEmail (db: Db, email: string): Promise<Account> {
  const account = await getAccount(db, email)
  console.log(`confirm email:${email}`)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: accountId }))
  }
  if (account.confirmed === true) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyConfirmed, { account: accountId }))
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
  const email = decode.extra?.confirm
  if (email === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: accountId }))
  }
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
    throw new Error('Please provide email service url')
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

  let text = `Спасибо за ваш интерес к Bold. Для завершения регистрации копируйте ссылку в адресную строку вашего браузера ${link}. С уважением, Команда Bold.`
  let html = `<p>Здравствуйте,</p>
  <p>Спасибо за ваш интерес к Bold. Для завершения регистрации пройдите по <a href=${link}>этой ссылке</a> или скопируйте ссылку ниже в адресную строку вашего браузера.</p>
  <p>${link}</p>
  <p>С уважением,</p>
  <p>Команда Bold.</p>`
  let subject = 'Подтвердите адрес электронной почты для регистрации на Bold.ru'

  // A quick workaround for now to have confirmation email in english for ezqms.
  // Remove as soon as sever i18n is there.
  if (productId === 'ezqms') {
    text = `Thank you for your interest in ezQMS. To complete the sign up process please copy the following link into your browser's URL bar ${link}. Regards, ezQMS Team.`
    html = `<p>Hello,</p>
    <p>Thank you for your interest in ezQMS. To complete the sign up process please follow <a href=${link}>this link</a> or copy the following link into your browser's URL bar.</p>
    <p>${link}</p>
    <p>Regards,</p>
    <p>ezQMS Team.</p>`
    subject = 'Confirm your email address to sign up for ezQMS'
  }

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
export async function signUpJoin (
  db: Db,
  productId: string,
  email: string,
  password: string,
  first: string,
  last: string,
  inviteId: ObjectId
): Promise<WorkspaceLoginInfo> {
  console.log(`signup join:${email} ${first} ${last}`)
  const invite = await getInvite(db, inviteId)
  const workspace = await checkInvite(invite, email)
  await createAcc(db, productId, email, password, first, last, invite?.emailMask === email)
  await assignWorkspace(db, productId, email, workspace.name)

  const token = (await login(db, productId, email, password)).token
  const result = await selectWorkspace(db, productId, token, workspace.name)
  await useInvite(db, inviteId)
  return result
}

/**
 * @public
 */
export async function createAcc (
  db: Db,
  productId: string,
  email: string,
  password: string,
  first: string,
  last: string,
  confirmed: boolean = false
): Promise<Account> {
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
  if (!confirmed) {
    await sendConfirmation(productId, newAccount)
  }
  return newAccount
}

/**
 * @public
 */
export async function createAccount (
  db: Db,
  productId: string,
  email: string,
  password: string,
  first: string,
  last: string
): Promise<LoginInfo> {
  const account = await createAcc(db, productId, email, password, first, last, false)

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
export async function listWorkspaces (db: Db, productId: string): Promise<WorkspaceInfoOnly[]> {
  return (await db.collection<Workspace>(WORKSPACE_COLLECTION).find(withProductId(productId, {})).toArray())
    .map((it) => ({ ...it, productId }))
    .filter((it) => it.disabled !== true)
    .map(trimWorkspace)
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
export async function createWorkspace (
  version: Data<Version>,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  db: Db,
  productId: string,
  workspace: string,
  organisation: string
): Promise<string> {
  if ((await getWorkspace(db, productId, workspace)) !== null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceAlreadyExists, { workspace }))
  }
  const result = await db
    .collection(WORKSPACE_COLLECTION)
    .insertOne({
      workspace,
      organisation,
      version,
      productId
    })
    .then((e) => e.insertedId.toHexString())
  const initWS = getMetadata(toolPlugin.metadata.InitWorkspace)
  if (initWS !== undefined) {
    if ((await getWorkspace(db, productId, initWS)) !== null) {
      await initModel(getTransactor(), getWorkspaceId(workspace, productId), txes, [])
      await cloneWorkspace(getTransactor(), getWorkspaceId(initWS, productId), getWorkspaceId(workspace, productId))
      await upgradeModel(getTransactor(), getWorkspaceId(workspace, productId), txes, migrationOperation)
      return result
    }
  }
  await initModel(getTransactor(), getWorkspaceId(workspace, productId), txes, migrationOperation)
  return result
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
  workspace: string
): Promise<string> {
  const ws = await getWorkspace(db, productId, workspace)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace }))
  }
  if (ws.productId !== productId) {
    if (productId !== '' || ws.productId !== undefined) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.ProductIdMismatch, { productId }))
    }
  }
  await db.collection(WORKSPACE_COLLECTION).updateOne(
    { workspace },
    {
      $set: { version }
    }
  )
  await upgradeModel(getTransactor(), getWorkspaceId(workspace, productId), txes, migrationOperation)
  return `${version.major}.${version.minor}.${version.patch}`
}

/**
 * @public
 */
export const createUserWorkspace =
  (version: Data<Version>, txes: Tx[], migrationOperation: [string, MigrateOperation][]) =>
    async (db: Db, productId: string, token: string, workspace: string): Promise<LoginInfo> => {
      if (!/^[0-9a-z][0-9a-z-]{2,62}[0-9a-z]$/.test(workspace)) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidId, { id: workspace }))
      }

      const { email, extra } = decodeToken(token)
      const nonConfirmed = extra?.confirmed === false
      console.log(`Creating workspace ${workspace} for ${email} ${nonConfirmed ? 'non confirmed' : 'confirmed'}`)

      if (nonConfirmed) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
      }
      const info = await getAccount(db, email)
      if (info === null) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
      }

      if (info.lastWorkspace !== undefined) {
        if (Date.now() - info.lastWorkspace < 60 * 1000) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceRateLimit, { workspace }))
        }
      }

      if ((await getWorkspace(db, productId, workspace)) !== null) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceAlreadyExists, { workspace }))
      }
      try {
        await createWorkspace(version, txes, migrationOperation, db, productId, workspace, '')
      } catch (err: any) {
        console.error(err)
        // We need to drop workspace, to prevent wrong data usage.
        const ws = await getWorkspace(db, productId, workspace)
        if (ws === null) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace }))
        }
        await db.collection(WORKSPACE_COLLECTION).updateOne(
          {
            _id: ws._id
          },
          { $set: { disabled: true, message: JSON.stringify(err?.message ?? ''), err: JSON.stringify(err) } }
        )
        throw err
      }
      info.lastWorkspace = Date.now()

      // Update last workspace time.
      await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: info._id }, { $set: { lastWorkspace: Date.now() } })

      await assignWorkspace(db, productId, email, workspace)
      await setRole(email, workspace, productId, AccountRole.Owner)
      const result = {
        endpoint: getEndpoint(),
        email,
        token: generateToken(email, getWorkspaceId(workspace, productId), getExtra(info)),
        productId
      }
      console.log(`Creating workspace ${workspace} Done`)
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
  const wsPromise = await getWorkspace(db, productId, workspace.name)
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
export type WorkspaceInfoOnly = Omit<Workspace, '_id' | 'accounts'>

function trimWorkspace (ws: Workspace): WorkspaceInfoOnly {
  const { _id, accounts, ...data } = ws
  return data
}

/**
 * @public
 */
export async function getUserWorkspaces (db: Db, productId: string, token: string): Promise<WorkspaceInfoOnly[]> {
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
    .map(trimWorkspace)
}

async function getWorkspaceAndAccount (
  db: Db,
  productId: string,
  email: string,
  workspace: string
): Promise<{ accountId: ObjectId, workspaceId: ObjectId }> {
  const wsPromise = await getWorkspace(db, productId, workspace)
  if (wsPromise === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace }))
  }
  const workspaceId = wsPromise._id
  const account = await getAccount(db, email)
  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }
  const accountId = account._id
  return { accountId, workspaceId }
}

/**
 * @public
 */
export async function setRole (email: string, workspace: string, productId: string, role: AccountRole): Promise<void> {
  const connection = await connect(getTransactor(), getWorkspaceId(workspace, productId), email)
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
    await connection.close()
  }
}

/**
 * @public
 */
export async function assignWorkspace (db: Db, productId: string, email: string, workspace: string): Promise<void> {
  const initWS = getMetadata(toolPlugin.metadata.InitWorkspace)
  if (initWS !== undefined && initWS === workspace) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const { workspaceId, accountId } = await getWorkspaceAndAccount(db, productId, email, workspace)
  const account = await db.collection<Account>(ACCOUNT_COLLECTION).findOne({ _id: accountId })

  if (account !== null) await createPersonAccount(account, productId, workspace)

  // Add account into workspace.
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: workspaceId }, { $addToSet: { accounts: accountId } })

  // Add workspace to account
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: accountId }, { $addToSet: { workspaces: workspaceId } })
}

async function createEmployee (ops: TxOperations, name: string, email: string): Promise<Ref<Person>> {
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

async function createPersonAccount (account: Account, productId: string, workspace: string): Promise<void> {
  const connection = await connect(getTransactor(), getWorkspaceId(workspace, productId))
  try {
    const ops = new TxOperations(connection, core.account.System)

    const name = combineName(account.first, account.last)
    // Check if EmployeeAccoun is not exists
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
    await connection.close()
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
export async function requestPassword (db: Db, productId: string, email: string): Promise<void> {
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

  const text = `We received a request to reset the password for your account. To reset your password, please paste the following link in your web browser's address bar: ${link}. If you have not ordered a password recovery just ignore this letter.`
  const html = `<p>We received a request to reset the password for your account. To reset your password, please click the link below: <a href=${link}>Reset password</a></p><p>
  If the Reset password link above does not work, paste the following link in your web browser's address bar: ${link}
</p><p>If you have not ordered a password recovery just ignore this letter.</p>`
  const subject = 'Password recovery'
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
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: accountId }))
  }
  const account = await getAccount(db, email)

  if (account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: accountId }))
  }
  const salt = randomBytes(32)
  const hash = hashWithSalt(password, salt)

  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: account._id }, { $set: { salt, hash } })

  return await login(db, productId, email, password)
}

/**
 * @public
 */
export async function removeWorkspace (db: Db, productId: string, email: string, workspace: string): Promise<void> {
  const { workspaceId, accountId } = await getWorkspaceAndAccount(db, productId, email, workspace)

  // Add account into workspace.
  await db.collection(WORKSPACE_COLLECTION).updateOne({ _id: workspaceId }, { $pull: { accounts: accountId } })

  // Add account a workspace
  await db.collection(ACCOUNT_COLLECTION).updateOne({ _id: accountId }, { $pull: { workspaces: workspaceId } })
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
  return await selectWorkspace(db, productId, token, workspace.name, false)
}

/**
 * @public
 */
export async function dropWorkspace (db: Db, productId: string, workspace: string): Promise<void> {
  const ws = await getWorkspace(db, productId, workspace)
  if (ws === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspace }))
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
      return await deactivatePersonAccount(account.email, ws.workspace, productId)
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

  const workspace = await getWorkspace(db, productId, tokenData.workspace.name)
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

  const workspace = await getWorkspace(db, productId, tokenData.workspace.name)
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

  const text = `You were invited to ${workspace.workspace}. To join please paste the following link in your web browser's address bar: ${link}. Link valid for ${expHours} hours.`

  const html = `<p>You were invited to ${workspace.workspace}. To join, please click the link below: <a href=${link}>Join</a></p><p>
  If the invite link above does not work, paste the following link in your web browser's address bar: ${link}
</p><p>Link valid for ${expHours} hours.</p>`
  const subject = `Invite to ${workspace.workspace}`
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
  const connection = await connect(getTransactor(), getWorkspaceId(workspace, productId), email)
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
        console.error(err)
        return {
          error:
            err instanceof PlatformError
              ? err.status
              : new Status(Severity.ERROR, platform.status.InternalServerError, {})
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

export default accountPlugin
