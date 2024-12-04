//
// Copyright © 2024 Hardcore Engineering Inc.
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
import {
  Branding,
  concatLink,
  generateId,
  groupByArray,
  MeasureContext,
  AccountRole,
  roleOrder,
  SocialIdType,
  WorkspaceUuid,
  WorkspaceMode
} from '@hcengineering/core'
import { getMongoClient } from '@hcengineering/mongo' // TODO: get rid of this import later
import platform, { getMetadata, PlatformError, Severity, Status, translate } from '@hcengineering/platform'
import { getDBClient } from '@hcengineering/postgres'
import otpGenerator from 'otp-generator'
import { pbkdf2Sync, randomBytes } from 'crypto'

import { MongoAccountDB } from './collections/mongo'
import { PostgresAccountDB } from './collections/postgres'
import { accountPlugin } from './plugin'
import {
  AccountMethodHandler,
  OtpInfo,
  WorkspaceInvite,
  WorkspaceInfoWithStatus,
  type Account,
  type AccountDB,
  type RegionInfo,
  type SocialId,
  type Workspace
} from './types'
import { Analytics } from '@hcengineering/analytics'
import { generateToken } from '@hcengineering/server-token'

export const GUEST_ACCOUNT = 'b6996120-416f-49cd-841e-e4a5d2e49c9b'

export async function getAccountDB (uri: string, dbNs?: string): Promise<[AccountDB, () => void]> {
  const isMongo = uri.startsWith('mongodb://')

  if (isMongo) {
    const client = getMongoClient(uri)
    const db = (await client.getClient()).db(dbNs ?? 'global-account')
    const mongoAccount = new MongoAccountDB(db)

    await mongoAccount.init()

    return [
      mongoAccount,
      () => {
        client.close()
      }
    ]
  } else {
    const client = getDBClient(uri)
    const pgClient = await client.getClient()
    // TODO: if dbNs is provided put tables in that schema
    const pgAccount = new PostgresAccountDB(pgClient)

    let error = false

    do {
      try {
        await pgAccount.init()
        error = false
      } catch (e) {
        console.error('Error while initializing postgres account db', e)
        error = true
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } while (error)

    return [
      pgAccount,
      () => {
        client.close()
      }
    ]
  }
}

export function getRolePower (role: AccountRole): number {
  return roleOrder[role]
}

export function wrap (
  accountMethod: (ctx: MeasureContext, db: AccountDB, branding: Branding | null, ...args: any[]) => Promise<any>
): AccountMethodHandler {
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

/**
 * Returns a hash code for a string.
 * (Compatible to Java's String.hashCode())
 *
 * The hash code for a string object is computed as
 *     s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
 * using number arithmetic, where s[i] is the i th character
 * of the given string, n is the length of the string,
 * and ^ indicates exponentiation.
 * (The hash value of the empty string is zero.)
 *
 */
function hashWorkspace (dbWorkspaceName: string): number {
  return [...dbWorkspaceName].reduce((hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0, 0)
}

export enum EndpointKind {
  Internal,
  External
}

const toTransactor = (line: string): { internalUrl: string, region: string, externalUrl: string } => {
  const [internalUrl, externalUrl, region] = line
    .split(';')
    .map((it) => it.trim())
    .map((it) => (it.length === 0 ? undefined : it))
  return { internalUrl: internalUrl ?? '', region: region ?? '', externalUrl: externalUrl ?? internalUrl ?? '' }
}

const getEndpoints = (): string[] => {
  const transactorsUrl = getMetadata(accountPlugin.metadata.Transactors)
  if (transactorsUrl === undefined) {
    throw new Error('Please provide transactor endpoint url')
  }
  const endpoints = transactorsUrl
    .split(',')
    .map((it) => it.trim())
    .filter((it) => it.length > 0)

  if (endpoints.length === 0) {
    throw new Error('Please provide transactor endpoint url')
  }
  return endpoints
}

export const getRegions = (): RegionInfo[] => {
  if (process.env.REGION_INFO !== undefined) {
    return process.env.REGION_INFO.split(';')
      .map((it) => it.split('|'))
      .map((it) => ({ region: it[0].trim(), name: it[1].trim() }))
  }
  return getEndpoints()
    .map(toTransactor)
    .map((it) => ({ region: it.region.trim(), name: '' }))
}

export const getEndpoint = (
  ctx: MeasureContext,
  workspace: string,
  region: string | undefined,
  kind: EndpointKind
): string => {
  const byRegions = groupByArray(getEndpoints().map(toTransactor), (it) => it.region)
  let transactors = (byRegions.get(region ?? '') ?? [])
    .map((it) => (kind === EndpointKind.Internal ? it.internalUrl : it.externalUrl))
    .flat()

  // This is really bad
  if (transactors.length === 0) {
    ctx.error('No transactors for the target region, will use default region', { group: region })

    transactors = (byRegions.get('') ?? [])
      .map((it) => (kind === EndpointKind.Internal ? it.internalUrl : it.externalUrl))
      .flat()
  }

  if (transactors.length === 0) {
    ctx.error('No transactors for the default region')
    throw new Error('Please provide transactor endpoint url')
  }

  const hash = hashWorkspace(workspace)
  return transactors[Math.abs(hash % transactors.length)]
}

export function getAllTransactors (kind: EndpointKind): string[] {
  const transactorsUrl = getMetadata(accountPlugin.metadata.Transactors)
  if (transactorsUrl === undefined) {
    throw new Error('Please provide transactor endpoint url')
  }
  const endpoints = transactorsUrl
    .split(',')
    .map((it) => it.trim())
    .filter((it) => it.length > 0)

  if (endpoints.length === 0) {
    throw new Error('Please provide transactor endpoint url')
  }

  const toTransactor = (line: string): { internalUrl: string, group: string, externalUrl: string } => {
    const [internalUrl, externalUrl, group] = line.split(';')
    return { internalUrl, group: group ?? '', externalUrl: externalUrl ?? internalUrl }
  }

  return endpoints.map(toTransactor).map((it) => (kind === EndpointKind.External ? it.externalUrl : it.internalUrl))
}

export function hashWithSalt (password: string, salt: Buffer): Buffer {
  // remove "as any" when types in node will be fixed
  return pbkdf2Sync(password, salt as any, 1000, 32, 'sha256')
}

export function verifyPassword (password: string, hash?: Buffer, salt?: Buffer): boolean {
  if (hash === undefined || salt === undefined) {
    return false
  }

  // remove "as any" when types in node will be fixed
  return Buffer.compare(hash as any, hashWithSalt(password, salt) as any) === 0
}

export function cleanEmail (email: string): string {
  return email.toLowerCase().trim()
}

export function isEmail (email: string): boolean {
  const EMAIL_REGEX =
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/
  return EMAIL_REGEX.test(email)
}

export function isShallowEqual (obj1: Record<string, any>, obj2: Record<string, any>): boolean {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  return keys1.length === keys2.length && keys1.every((k) => obj1[k] === obj2[k])
}

export async function setPassword (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  personUuid: string,
  password: string
): Promise<void> {
  if (password == null || password === '') {
    return
  }

  const salt = randomBytes(32)
  await db.setPassword(personUuid, hashWithSalt(password, salt), salt)
}

export async function generateUniqueOtp (db: AccountDB): Promise<string> {
  let exists = true
  let code = ''

  do {
    code = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    })

    exists = (await db.otp.findOne({ code })) != null
  } while (exists)

  return code
}

export async function sendOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  socialId: SocialId
): Promise<OtpInfo> {
  const ts = Date.now()
  const otpData = (await db.otp.find({ socialId: socialId.id }, { createdOn: 'descending' }, 1))[0]
  const retryDelay = getMetadata(accountPlugin.metadata.OtpRetryDelaySec) ?? 30

  if (otpData !== undefined && otpData.expiresOn > ts && otpData.createdOn + retryDelay * 1000 > ts) {
    return { sent: true, retryOn: otpData.createdOn + retryDelay * 1000 }
  }

  let sendMethod: (ctx: MeasureContext, branding: Branding | null, code: string, target: string) => Promise<void>

  switch (socialId.type) {
    case SocialIdType.EMAIL: {
      sendMethod = sendOtpEmail
      break
    }
    default:
      throw new Error('Unsupported OTP social id type')
  }

  const retryDelayMs = (getMetadata(accountPlugin.metadata.OtpRetryDelaySec) ?? 30) * 1000
  const ttlMs = (getMetadata(accountPlugin.metadata.OtpTimeToLiveSec) ?? 60) * 1000
  const code = await generateUniqueOtp(db)

  await sendMethod(ctx, branding, code, socialId.value)
  await db.otp.insertOne({ socialId: socialId.id, code, expiresOn: ts + ttlMs, createdOn: ts })

  return { sent: true, retryOn: ts + retryDelayMs }
}

export async function sendOtpEmail (
  ctx: MeasureContext,
  branding: Branding | null,
  otp: string,
  email: string
): Promise<void> {
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    ctx.error('Please provide email service url to enable email otp')
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

export async function isOtpValid (db: AccountDB, socialId: string, code: string): Promise<boolean> {
  const otpData = await db.otp.findOne({ socialId, code })

  return (otpData?.expiresOn ?? 0) > Date.now()
}

export async function createAccount (db: AccountDB, personUuid: string): Promise<void> {
  // Create Huly social id and account
  await db.socialId.insertOne({ type: SocialIdType.HULY, value: personUuid, personId: personUuid })
  await db.account.insertOne({ uuid: personUuid })
}

export async function signUpByEmail (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  confirmed = false
): Promise<string> {
  const normalizedEmail = cleanEmail(email)

  const emailSocialId = await getEmailSocialId(db, normalizedEmail)
  let personUuid: string

  if (emailSocialId !== null) {
    const existingAccount = await db.account.findOne({ uuid: emailSocialId.personId })

    if (existingAccount !== null) {
      ctx.error('An account with the provided email already exists', { email })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {}))
    }

    personUuid = emailSocialId.personId
    // Person exists, but may have different name, need to update with what's been provided
    await db.person.updateOne({ uuid: personUuid }, { firstName, lastName })
  } else {
    // There's no person we can link to this email, so we need to create a new one
    personUuid = await db.person.insertOne({ firstName, lastName })
    await db.socialId.insertOne({ type: SocialIdType.EMAIL, value: normalizedEmail, personId: personUuid, ...(confirmed ? { verifiedOn: Date.now() } : {}) })
  }

  await createAccount(db, personUuid)
  await setPassword(ctx, db, branding, personUuid, password)

  return personUuid
}

/**
 * Convert workspace name to a URL-friendly string following these rules:
 *
 * 1. Converts all characters to lowercase
 * 2. Only keeps alphanumeric characters (a-z, 0-9) and hyphens (-)
 * 3. Cannot start with a number
 * 4. Removes all other special characters
 */
export function generateWorkspaceUrl (name: string): string {
  const lowercaseName = name.toLowerCase()
  let result = ''

  for (const char of lowercaseName) {
    const isValidChar = /[a-z0-9-]/.test(char)
    const isNumber = /[0-9]/.test(char)

    if (isValidChar && (result.length > 0 || !isNumber)) {
      result += char
    }
  }

  return result
}

const DB_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505'
}

interface CreateWorkspaceRecordResult {
  workspaceUuid: string
  workspaceUrl: string
}

export async function createWorkspaceRecord (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  workspaceName: string,
  account: string,
  region?: string,
  initMode: WorkspaceMode = 'pending-creation'
): Promise<CreateWorkspaceRecordResult> {
  const brandingKey = branding?.key ?? 'huly'
  const regionInfo = getRegions().find((it) => it.region === (region ?? ''))

  if (regionInfo === undefined) {
    ctx.error('Region not found', { region })

    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.InternalServerError, {
        region: region ?? ''
      })
    )
  }

  // The workspace url must be unique.
  // This function is not concurrency safe, moreover multiple account services may be
  // creating a workspace with the same base url at the same time so it's not possible
  // to make it safe in the first place.
  // But the uniqueness is guaranteed by the database rules and it will reject duplicate workspace urls.
  // So we just need to handle the expected error and retry until we get a unique url.
  let iteration = 0
  let baseWorkspaceUrl = generateWorkspaceUrl(workspaceName)
  let workspaceUrl = baseWorkspaceUrl

  if (baseWorkspaceUrl === '') {
    baseWorkspaceUrl = 'ws'
    workspaceUrl = `ws-${generateId('-')}`
  }

  while (true) {
    try {
      const workspaceUuid = await db.createWorkspace(
        {
          name: workspaceName,
          url: workspaceUrl,
          branding: brandingKey,
          createdBy: account,
          billingAccount: account,
          region
        },
        {
          mode: initMode,
          versionMajor: 0,
          versionMinor: 0,
          versionPatch: 0,
          isDisabled: true
        }
      )

      return {
        workspaceUuid,
        workspaceUrl
      }
    } catch (err: any) {
      // Only valid for postgres and cockroachdb (not for mongo)
      if (err.code !== DB_ERROR_CODES.UNIQUE_VIOLATION) {
        throw err
      }
    }

    workspaceUrl = `${baseWorkspaceUrl}-${generateId('-')}`
    iteration++
    // Safety check to prevent infinite loop. Should never happen if the code is alright.
    if (iteration > 1000) {
      ctx.error('Workspace record generation failed. Could not create a workspace record in 1000 attempts.', {
        workspaceName
      })
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.InternalServerError, { region, workspaceName, baseWorkspaceUrl })
      )
    }
  }
}

export async function checkInvite (ctx: MeasureContext, invite: WorkspaceInvite, email: string): Promise<string> {
  if (invite.remainingUses === 0) {
    ctx.error('Invite limit exceeded', { email, ...invite })
    Analytics.handleError(new Error(`Invite limit exceeded ${email}`))
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (invite.expiresOn > 0 && invite.expiresOn < Date.now()) {
    ctx.error('Invite link expired', { email, ...invite })
    Analytics.handleError(new Error(`Invite link expired ${invite.id} ${email}`))
    throw new PlatformError(new Status(Severity.ERROR, platform.status.ExpiredLink, {}))
  }

  // TODO: consider not using RegExp with user input as some regexes might
  // be slow or even cause catastrophic backtracking
  if (
    invite.emailPattern != null &&
    invite.emailPattern.trim().length > 0 &&
    !new RegExp(invite.emailPattern).test(email)
  ) {
    ctx.error("Invite doesn't allow this email address", { email, ...invite })
    Analytics.handleError(new Error(`Invite link email mask check failed ${invite.id} ${email} ${invite.emailPattern}`))
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return invite.workspaceUuid
}

export async function sendEmailConfirmation (
  ctx: MeasureContext,
  branding: Branding | null,
  account: string,
  email: string
): Promise<void> {
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  if (sesURL === undefined || sesURL === '') {
    ctx.error('Please provide SES_URL to enable email confirmations.')
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const front = branding?.front ?? getMetadata(accountPlugin.metadata.FrontURL)
  if (front === undefined || front === '') {
    ctx.error('Please provide front url via branding configuration or FRONT_URL variable')
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const token = generateToken(account, '', {
    confirmEmail: email
  })

  const link = concatLink(front, `/login/confirm?id=${token}`)

  const name = branding?.title ?? getMetadata(accountPlugin.metadata.ProductName)
  const lang = branding?.language
  const text = await translate(accountPlugin.string.ConfirmationText, { name, link }, lang)
  const html = await translate(accountPlugin.string.ConfirmationHTML, { name, link }, lang)
  const subject = await translate(accountPlugin.string.ConfirmationSubject, { name }, lang)

  await fetch(concatLink(sesURL, '/send'), {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      html,
      subject,
      to: email
    })
  })
}

export async function confirmEmail (ctx: MeasureContext, db: AccountDB, account: string, email: string): Promise<void> {
  ctx.info('Confirming email', { account, email })

  const emailSocialId = await getEmailSocialId(db, email)

  if (emailSocialId == null) {
    ctx.error('Email social id not found', { account, email })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.SocialIdNotFound, { socialId: email, type: SocialIdType.EMAIL })
    )
  }

  if (emailSocialId.verifiedOn != null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.SocialIdAlreadyConfirmed, {
        socialId: email,
        type: SocialIdType.EMAIL
      })
    )
  }

  await db.socialId.updateOne({ id: emailSocialId.id }, { verifiedOn: Date.now() })
}

export async function useInvite (db: AccountDB, inviteId: string): Promise<void> {
  await db.invite.updateOne({ id: inviteId }, { $inc: { remainingUses: -1 } })
}

export async function getAccount (db: AccountDB, uuid: string): Promise<Account | null> {
  return await db.account.findOne({ uuid })
}

export async function getWorkspaceById (db: AccountDB, uuid: string): Promise<Workspace | null> {
  return await db.workspace.findOne({ uuid })
}

export async function getWorkspaceInfoWithStatusById (db: AccountDB, uuid: string): Promise<WorkspaceInfoWithStatus | null> {
  const ws = await db.workspace.findOne({ uuid })
  const status = await db.workspaceStatus.findOne({ workspaceUuid: uuid })

  if (ws == null || status == null) {
    return null
  }

  return {
    ...ws,
    status
  }
}

export async function getWorkspaceByUrl (db: AccountDB, url: string): Promise<Workspace | null> {
  return await db.workspace.findOne({ url })
}

export async function getWorkspaceInvite (db: AccountDB, id: string): Promise<WorkspaceInvite | null> {
  return await db.invite.findOne({ id })
}

export async function getEmailSocialId (db: AccountDB, email: string): Promise<SocialId | null> {
  return await db.socialId.findOne({ type: SocialIdType.EMAIL, value: email })
}

export function getSesUrl (): string {
  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)

  if (sesURL === undefined || sesURL === '') {
    throw new Error('Please provide email service url')
  }

  return sesURL
}

export function getFrontUrl (branding: Branding | null): string {
  const front = branding?.front ?? getMetadata(accountPlugin.metadata.FrontURL)

  if (front === undefined || front === '') {
    throw new Error('Please provide front url')
  }

  return front
}

export async function updateArchiveInfo (
  ctx: MeasureContext,
  db: AccountDB,
  workspace: WorkspaceUuid,
  value: boolean
): Promise<void> {
  const workspaceInfo = await getWorkspaceById(db, workspace)
  if (workspaceInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  await db.workspaceStatus.updateOne(
    { workspaceUuid: workspace },
    {
      mode: 'archived'
    }
  )
}
