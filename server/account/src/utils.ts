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
  AccountRole,
  type AccountUuid,
  type Branding,
  concatLink,
  generateId,
  groupByArray,
  isActiveMode,
  type MeasureContext,
  type Person,
  type PersonId,
  type PersonUuid,
  readOnlyGuestAccountUuid,
  roleOrder,
  SocialIdType,
  type SocialKey,
  systemAccountUuid,
  type WorkspaceDataId,
  type WorkspaceInfoWithStatus as WorkspaceInfoWithStatusCore,
  type WorkspaceMode,
  type WorkspaceUuid
} from '@hcengineering/core'
import { getMongoClient } from '@hcengineering/mongo' // TODO: get rid of this import later
import platform, { getMetadata, PlatformError, Severity, Status, translate } from '@hcengineering/platform'
import { getDBClient, setDBExtraOptions } from '@hcengineering/postgres'
import { pbkdf2Sync, randomBytes } from 'crypto'
import otpGenerator from 'otp-generator'

import { Analytics } from '@hcengineering/analytics'
import { decodeTokenVerbose, generateToken, type PermissionsGrant, TokenError } from '@hcengineering/server-token'
import { MongoAccountDB } from './collections/mongo'
import { PostgresAccountDB } from './collections/postgres/postgres'
import { accountPlugin } from './plugin'
import {
  type Account,
  type AccountDB,
  AccountEventType,
  type AccountMethodHandler,
  type Integration,
  type LoginInfo,
  type LoginInfoRequestData,
  type Meta,
  type Operations,
  type OtpInfo,
  type RegionInfo,
  type SocialId,
  type Workspace,
  type WorkspaceInfoWithStatus,
  type WorkspaceInvite,
  type WorkspaceJoinInfo,
  type WorkspaceLoginInfo,
  type WorkspaceStatus
} from './types'
import { isAdminEmail } from './admin'

export const GUEST_ACCOUNT = 'b6996120-416f-49cd-841e-e4a5d2e49c9b' as PersonUuid

export async function getAccountDB (
  uri: string,
  dbNs?: string,
  appName: string = 'account'
): Promise<[AccountDB, () => void]> {
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
    setDBExtraOptions({
      connection: {
        application_name: appName
      }
    })
    const client = getDBClient(uri)
    const pgClient = await client.getClient()
    const pgAccount = new PostgresAccountDB(pgClient, dbNs ?? 'global_account')

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

export const assignableRoles = [AccountRole.Guest, AccountRole.User, AccountRole.Maintainer, AccountRole.Owner]

export function getRolePower (role: AccountRole): number {
  return roleOrder[role]
}

export function isReadOnlyOrGuest (account: AccountUuid, extra: Record<string, any> | undefined): boolean {
  return isGuest(account, extra) || extra?.readonly === 'true'
}

export function isGuest (account: AccountUuid, extra: Record<string, any> | undefined): boolean {
  return account === GUEST_ACCOUNT && extra?.guest === 'true'
}

export function wrap (
  accountMethod: (ctx: MeasureContext, db: AccountDB, branding: Branding | null, ...args: any[]) => Promise<any>
): AccountMethodHandler {
  return async function (
    ctx: MeasureContext,
    db: AccountDB,
    branding: Branding | null,
    request: any,
    token?: string,
    meta?: Meta
  ): Promise<any> {
    return await accountMethod(ctx, db, branding, token, { ...request.params }, meta)
      .then((result) => ({ id: request.id, result }))
      .catch((err: Error) => {
        const status =
          err instanceof PlatformError
            ? err.status
            : new Status(Severity.ERROR, platform.status.InternalServerError, {})

        if (err instanceof TokenError) {
          // Let's send un authorized
          return {
            error: new Status(Severity.ERROR, platform.status.Unauthorized, {})
          }
        }

        if (status.code === platform.status.InternalServerError) {
          Analytics.handleError(err)
          ctx.error('Error while processing account method', {
            method: accountMethod.name,
            status,
            origErr: err
          })
        } else {
          ctx.error('Error while processing account method', { method: accountMethod.name, status })
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

const toTransactor = (line: string): EndpointInfo => {
  const [internalUrl, externalUrl, region] = line
    .split(';')
    .map((it) => it.trim())
    .map((it) => (it.length === 0 ? undefined : it))
  return { internalUrl: internalUrl ?? '', region: region ?? '', externalUrl: externalUrl ?? internalUrl ?? '' }
}

/**
 * Internal. Exported for testing only.
 * @returns list of endpoints
 */
export const getEndpoints = (): string[] => {
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

// Info is static, so no need to calculate it every time.
let regionInfo: RegionInfo[] = []

export const getRegions = (): RegionInfo[] => {
  if (regionInfo.length === 0) {
    regionInfo = _getRegions()
  }
  return regionInfo
}

/**
 * Internal. Exported for tests only.
 * @returns list of endpoints
 */
export const _getRegions = (): RegionInfo[] => {
  let _regionInfo: RegionInfo[] = []
  const endpoints = getEndpoints()
    .map(toTransactor)
    .map((it) => ({ region: it.region.trim(), name: '' }))
  if (process.env.REGION_INFO !== undefined) {
    _regionInfo = process.env.REGION_INFO.split(';')
      .map((it) => it.split('|'))
      .map((it) => ({ region: it[0].trim(), name: it[1].trim() }))
    // We need to add all endpoints if they are not in info.
    for (const endpoint of endpoints) {
      if (_regionInfo.find((it) => it.region === endpoint.region) === undefined) {
        _regionInfo.push(endpoint)
      }
    }
  } else {
    _regionInfo = endpoints
  }

  return _regionInfo
}

export interface EndpointInfo {
  internalUrl: string
  externalUrl: string
  region: string
}

export function getEndpointInfo (): Map<string, EndpointInfo[]> {
  return groupByArray(getEndpoints().map(toTransactor), (it) => it.region)
}

export const selectKind = (kind: EndpointKind, it: EndpointInfo): string => {
  return kind === EndpointKind.Internal ? it.internalUrl : it.externalUrl
}

export const getEndpoint = (workspace: WorkspaceUuid, region: string | undefined, kind: EndpointKind): string => {
  const hash = hashWorkspace(workspace)
  const _endpointInfo = getEndpointInfo()

  let transactors = _endpointInfo.get(region ?? '') ?? []

  if (transactors.length === 0) {
    console.warn('No transactors for the target region, will use default region', { group: region })
    transactors = _endpointInfo.get('') ?? []
  }

  if (transactors.length === 0) {
    throw new Error('Please provide transactor endpoint url')
  }

  return selectKind(kind, transactors[Math.abs(hash % transactors.length)])
}

export const getWorkspaceEndpoint = (
  info: Map<string, EndpointInfo[]>,
  workspace: WorkspaceUuid,
  region: string | undefined
): EndpointInfo => {
  const hash = hashWorkspace(workspace)
  const byRegion = info.get(region ?? '') ?? []
  return byRegion[Math.abs(hash % byRegion.length)]
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

export function verifyPassword (password: string, hash?: Buffer | null, salt?: Buffer | null): boolean {
  if (hash == null || salt == null) {
    return false
  }

  // remove "as any" when types in node will be fixed
  return Buffer.compare(hash as any, hashWithSalt(password, salt) as any) === 0
}

export function cleanEmail (email: string): string {
  return email.toLowerCase().trim()
}

export function normalizeValue (value: string): string {
  return value.toLowerCase().trim()
}

export function isEmail (email: string): boolean {
  // RFC 5322 compliant email regex
  const EMAIL_REGEX =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-](?:\.?[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-])*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/ // eslint-disable-line no-control-regex
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
  personUuid: AccountUuid,
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
  const otpData = (await db.otp.find({ socialId: socialId._id }, { createdOn: 'descending' }, 1))[0]
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
  await db.otp.insertOne({ socialId: socialId._id, code, expiresOn: ts + ttlMs, createdOn: ts })

  return { sent: true, retryOn: ts + retryDelayMs }
}

export async function sendOtpEmail (
  ctx: MeasureContext,
  branding: Branding | null,
  otp: string,
  email: string
): Promise<void> {
  const mailURL = getMetadata(accountPlugin.metadata.MAIL_URL)
  if (mailURL === undefined || mailURL === '') {
    ctx.error('Please provide email service url to enable email otp')
    return
  }
  const mailAuth = getMetadata(accountPlugin.metadata.MAIL_AUTH_TOKEN)

  const lang = branding?.language
  const app = branding?.title ?? getMetadata(accountPlugin.metadata.ProductName)

  const text = await translate(accountPlugin.string.OtpText, { code: otp, app }, lang)
  const html = await translate(accountPlugin.string.OtpHTML, { code: otp, app }, lang)
  const subject = await translate(accountPlugin.string.OtpSubject, { code: otp, app }, lang)

  const to = email
  const response = await fetch(concatLink(mailURL, '/send'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(mailAuth != null ? { Authorization: `Bearer ${mailAuth}` } : {})
    },
    body: JSON.stringify({
      text,
      html,
      subject,
      to
    })
  })
  if (!response.ok) {
    ctx.error(`Failed to send otp email: ${response.statusText}`, { to })
  }
}

export async function isOtpValid (db: AccountDB, socialId: PersonId, code: string): Promise<boolean> {
  const otpData = await db.otp.findOne({ socialId, code })

  return (otpData?.expiresOn ?? 0) > Date.now()
}

/**
 * Creates an account and a Huly social id for the specified person.
 * Returns the _id of the newly created Huly social id.
 */
export async function createAccount (
  db: AccountDB,
  personUuid: PersonUuid,
  confirmed = false,
  automatic = false,
  createdOn = Date.now()
): Promise<PersonId> {
  // Create Huly social id and account
  const socialId = await db.socialId.insertOne({
    type: SocialIdType.HULY,
    value: personUuid,
    personUuid,
    ...(confirmed ? { verifiedOn: Date.now() } : {})
  })
  await db.account.insertOne({ uuid: personUuid as AccountUuid, automatic })
  await db.accountEvent.insertOne({
    accountUuid: personUuid as AccountUuid,
    eventType: AccountEventType.ACCOUNT_CREATED,
    time: createdOn
  })

  return socialId
}

export async function signUpByEmail (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string,
  password: string | null,
  firstName: string,
  lastName: string,
  confirmed = false,
  automatic = false
): Promise<{ account: AccountUuid, socialId: PersonId }> {
  const normalizedEmail = cleanEmail(email)

  const emailSocialId = await getEmailSocialId(db, normalizedEmail)
  let account: AccountUuid
  let socialId: PersonId

  if (emailSocialId !== null) {
    const existingAccount = await db.account.findOne({ uuid: emailSocialId.personUuid as AccountUuid })

    if (existingAccount !== null) {
      ctx.error('An account with the provided email already exists', { email })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {}))
    }

    account = emailSocialId.personUuid as AccountUuid
    socialId = emailSocialId._id
    // Person exists, but may have different name, need to update with what's been provided
    await db.person.update({ uuid: account }, { firstName, lastName })
  } else {
    // There's no person we can link to this email, so we need to create a new one
    account = await db.person.insertOne({ firstName, lastName })
    socialId = await db.socialId.insertOne({
      type: SocialIdType.EMAIL,
      value: normalizedEmail,
      personUuid: account,
      ...(confirmed ? { verifiedOn: Date.now() } : {})
    })
  }

  await createAccount(db, account, confirmed, automatic)
  if (password != null) {
    await setPassword(ctx, db, branding, account, password)
  }

  return { account, socialId }
}

export async function signUpByGrant (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  accountUuid: AccountUuid,
  grant: PermissionsGrant,
  info?: LoginInfoRequestData
): Promise<{ account: AccountUuid, socialId: PersonId }> {
  const firstName = grant.firstName ?? info?.firstName
  const lastName = grant.lastName ?? info?.lastName

  if (firstName == null || firstName === '') {
    ctx.error('First name is required for grant sign up', { grant, info })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const existingAccount = await db.account.findOne({ uuid: accountUuid })

  if (existingAccount != null) {
    ctx.error('An account with the provided uuid already exists', { accountUuid })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {}))
  }

  const existingPerson = await db.person.findOne({ uuid: accountUuid })

  if (existingPerson == null) {
    await db.person.insertOne({ uuid: accountUuid, firstName, lastName: lastName ?? '' })
  }

  // If there's no account there should be no Huly social id associated with the person if it existed
  // also, there should be no confirmed social ids associated
  // so we can safely proceed to account creation

  const socialId = await createAccount(db, accountUuid, true, true)

  return { account: accountUuid, socialId }
}

export async function selectWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string | undefined,
  params: {
    workspaceUrl: string
    kind: 'external' | 'internal' | 'byregion'
    externalRegions?: string[]
  },
  meta?: Meta
): Promise<WorkspaceLoginInfo> {
  const { workspaceUrl, kind, externalRegions = [] } = params

  let workspace: Workspace | null = null
  if (workspaceUrl !== '') {
    workspace = await getWorkspaceByUrl(db, workspaceUrl)
  }

  let accountUuid: AccountUuid
  let extra: Record<string, any> | undefined
  let grant: PermissionsGrant | undefined
  let sub: AccountUuid | undefined
  let exp: number | undefined
  let nbf: number | undefined
  try {
    const decodedToken = decodeTokenVerbose(ctx, token ?? '')
    accountUuid = decodedToken.account
    if (workspace == null) {
      workspace = await getWorkspaceById(db, decodedToken.workspace)
    }
    extra = decodedToken.extra
    grant = decodedToken.grant
    sub = decodedToken.sub
    exp = decodedToken.exp
    nbf = decodedToken.nbf
  } catch (e) {
    if (workspace?.allowReadOnlyGuest === true) {
      accountUuid = readOnlyGuestAccountUuid
    } else {
      throw e
    }
  }

  if (workspace == null) {
    ctx.error('Workspace not found in selectWorkspace', { workspaceUrl, kind, accountUuid, extra })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUrl }))
  }

  const getKind = (region: string | undefined): EndpointKind => {
    switch (kind) {
      case 'external':
        return EndpointKind.External
      case 'internal':
        return EndpointKind.Internal
      case 'byregion':
        return externalRegions.includes(region ?? '') ? EndpointKind.External : EndpointKind.Internal
      default:
        return meta?.clientNetworkPosition === 'internal' ? EndpointKind.Internal : EndpointKind.External
    }
  }

  if (isGuest(accountUuid, extra)) {
    const workspace = await getWorkspaceByUrl(db, workspaceUrl)
    if (workspace == null) {
      ctx.error('Workspace not found in selectWorkspace', { workspaceUrl, kind, accountUuid, extra })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUrl }))
    }

    // Guest mode select workspace
    return {
      account: accountUuid,
      endpoint: getEndpoint(workspace.uuid, workspace.region, getKind(workspace.region)),
      token,
      workspace: workspace.uuid,
      workspaceUrl: workspace.url,
      workspaceDataId: workspace.dataId,
      role: AccountRole.DocGuest
    }
  }

  if (accountUuid === systemAccountUuid) {
    return {
      account: accountUuid,
      token: generateToken(accountUuid, workspace.uuid, extra, undefined, {
        grant,
        sub,
        exp,
        nbf
      }),
      endpoint: getEndpoint(workspace.uuid, workspace.region, getKind(workspace.region)),
      workspace: workspace.uuid,
      workspaceUrl: workspace.url,
      role: AccountRole.Admin
    }
  }

  let role = await db.getWorkspaceRole(accountUuid, workspace.uuid)
  if (role == null && extra?.admin === 'true') {
    role = AccountRole.Admin
  }
  let account = await db.account.findOne({ uuid: accountUuid })

  if ((role == null || account == null) && workspace.allowReadOnlyGuest) {
    accountUuid = readOnlyGuestAccountUuid
    role = await db.getWorkspaceRole(accountUuid, workspace.uuid)
    account = await db.account.findOne({ uuid: accountUuid })
  }

  if (role == null) {
    ctx.error('Not a member of the workspace being selected', { workspaceUrl, accountUuid })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (accountUuid !== systemAccountUuid && account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  if (accountUuid !== systemAccountUuid && meta !== undefined) {
    void setTimezoneIfNotDefined(ctx, db, accountUuid, account, meta)
  }

  if (role === AccountRole.ReadOnlyGuest) {
    if (extra == null) {
      extra = {}
    }
    extra.readonly = 'true'
  }

  const wsStatus = await db.workspaceStatus.findOne({ workspaceUuid: workspace.uuid })

  if (wsStatus != null) {
    if (wsStatus.isDisabled && isActiveMode(wsStatus.mode)) {
      ctx.error('Selecting a disabled workspace', { workspaceUrl, accountUuid })

      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUrl }))
    }
  }

  const person = await db.person.findOne({ uuid: accountUuid })
  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  return {
    account: accountUuid,
    token: generateToken(accountUuid, workspace.uuid, extra, undefined, {
      grant,
      sub,
      exp,
      nbf
    }),
    endpoint: getEndpoint(workspace.uuid, workspace.region, getKind(workspace.region)),
    workspace: workspace.uuid,
    workspaceUrl: workspace.url,
    workspaceDataId: workspace.dataId,
    allowGuestSignUp: workspace.allowReadOnlyGuest && workspace.allowGuestSignUp,
    role
  }
}

export async function updateAllowReadOnlyGuests (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    readOnlyGuestsAllowed: boolean
  }
): Promise<{ guestPerson: Person, guestSocialIds: SocialId[] } | undefined> {
  const { readOnlyGuestsAllowed } = params
  const { account, workspace } = decodeTokenVerbose(ctx, token)

  if (workspace === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  const accRole = account === systemAccountUuid ? AccountRole.Owner : await db.getWorkspaceRole(account, workspace)
  if (accRole == null || getRolePower(accRole) < getRolePower(AccountRole.Owner)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await db.updateAllowReadOnlyGuests(workspace, readOnlyGuestsAllowed)
  if (!readOnlyGuestsAllowed) {
    await db.unassignWorkspace(readOnlyGuestAccountUuid, workspace)
    return undefined
  }

  let guestPerson = await db.person.findOne({ uuid: readOnlyGuestAccountUuid as PersonUuid })
  if (guestPerson == null) {
    await db.person.insertOne({
      uuid: readOnlyGuestAccountUuid as PersonUuid,
      firstName: 'Anonymous',
      lastName: 'Guest'
    })
    await createAccount(db, readOnlyGuestAccountUuid as PersonUuid, true)
    guestPerson = await db.person.findOne({ uuid: readOnlyGuestAccountUuid as PersonUuid })
  }
  const roleInWorkspace = await db.getWorkspaceRole(readOnlyGuestAccountUuid, workspace)
  if (roleInWorkspace == null) {
    await db.assignWorkspace(readOnlyGuestAccountUuid, workspace, AccountRole.ReadOnlyGuest)
  }

  const guestAccount = await db.account.findOne({ uuid: readOnlyGuestAccountUuid })
  if (guestPerson === null || guestAccount == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }
  const guestSocialIds = await db.socialId.find({
    personUuid: readOnlyGuestAccountUuid as PersonUuid,
    verifiedOn: { $gt: 0 }
  })

  return { guestPerson, guestSocialIds: guestSocialIds.filter((si) => si.isDeleted !== true) }
}

export async function updateAllowGuestSignUp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    guestSignUpAllowed: boolean
  }
): Promise<void> {
  const { guestSignUpAllowed } = params
  const { account, workspace } = decodeTokenVerbose(ctx, token)

  if (workspace === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  const accRole = account === systemAccountUuid ? AccountRole.Owner : await db.getWorkspaceRole(account, workspace)
  if (accRole == null || getRolePower(accRole) < getRolePower(AccountRole.Owner)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await db.updateAllowGuestSignUp(workspace, guestSignUpAllowed)
}

export async function updateWorkspaceRole (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    targetAccount: AccountUuid
    targetRole: AccountRole
  }
): Promise<void> {
  const { targetAccount, targetRole } = params

  if (targetAccount === readOnlyGuestAccountUuid) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const { account, workspace } = decodeTokenVerbose(ctx, token)

  if (workspace === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  const accRole = account === systemAccountUuid ? AccountRole.Owner : await db.getWorkspaceRole(account, workspace)

  if (
    accRole == null ||
    getRolePower(accRole) < getRolePower(AccountRole.Maintainer) ||
    getRolePower(accRole) < getRolePower(targetRole)
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const currentRole = await db.getWorkspaceRole(targetAccount, workspace)

  if (currentRole == null || getRolePower(accRole) < getRolePower(currentRole)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (currentRole === targetRole) return

  if (currentRole === AccountRole.Owner) {
    // Check if there are other owners
    const owners = (await db.getWorkspaceMembers(workspace)).filter((m) => m.role === AccountRole.Owner)
    if (owners.length === 1) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  await db.updateWorkspaceRole(targetAccount, workspace, targetRole)
}

/**
 * Convert workspace name to a URL-friendly string following these rules:
 *
 * 1. Converts all characters to lowercase
 * 2. Only keeps alphanumeric characters (a-z, 0-9) and hyphens (-)
 * 3. Cannot start with a number or hyphen
 * 4. Cannot end with a hyphen
 * 5. Removes all other special characters
 */
export function generateWorkspaceUrl (name: string): string {
  const lowercaseName = name.toLowerCase()
  let result = ''
  let isFirst = true

  for (const char of lowercaseName) {
    const isValidChar = /[a-z0-9-]/.test(char)
    const isNumber = /[0-9]/.test(char)
    const isHyphen = char === '-'

    if (isValidChar && (!isFirst || (!isNumber && !isHyphen))) {
      result += char
      isFirst = false
    }
  }

  // Trim hyphens from the end
  return result.replace(/-+$/, '')
}

// TODO: rework later to map exact codes for specific DBs
const DB_ERROR_CODES = {
  UNIQUE_VIOLATION: [
    '23505', // Postgres, CockroachDB
    11000 // Mongo
  ]
}

interface CreateWorkspaceRecordResult {
  workspaceUuid: WorkspaceUuid
  workspaceUrl: string
}

export async function createWorkspaceRecord (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  workspaceName: string,
  account: PersonUuid,
  region: string = '',
  initMode: WorkspaceMode = 'pending-creation',
  dataId?: WorkspaceDataId
): Promise<CreateWorkspaceRecordResult> {
  const brandingKey = branding?.key ?? 'huly'
  const regionInfo = getRegions().find((it) => it.region === region)

  if (regionInfo === undefined) {
    ctx.error('Region not found', { region, regions: getRegions() })

    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.InternalServerError, {
        region
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
          dataId,
          branding: brandingKey,
          createdBy: account,
          billingAccount: account,
          allowReadOnlyGuest: false,
          allowGuestSignUp: false,
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
      if (!DB_ERROR_CODES.UNIQUE_VIOLATION.includes(err.code)) {
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

export async function checkInvite (ctx: MeasureContext, invite: WorkspaceInvite, email: string): Promise<WorkspaceUuid> {
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
  // if (
  //   invite.emailPattern != null &&
  //   invite.emailPattern.trim().length > 0 &&
  //   !new RegExp(invite.emailPattern).test(email)
  // ) {
  //   ctx.error("Invite doesn't allow this email address", { email, ...invite })
  //   Analytics.handleError(new Error(`Invite link email mask check failed ${invite.id} ${email} ${invite.emailPattern}`))
  //   throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  // }

  if (invite.email != null && invite.email.trim().length > 0 && invite.email !== email) {
    ctx.error("Invite doesn't allow this email address", { email, ...invite })
    Analytics.handleError(new Error(`Invite link email check failed ${invite.id} ${email} ${invite.email}`))
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return invite.workspaceUuid
}

export async function sendEmailConfirmation (
  ctx: MeasureContext,
  branding: Branding | null,
  account: PersonUuid,
  email: string
): Promise<void> {
  const mailURL = getMetadata(accountPlugin.metadata.MAIL_URL)
  if (mailURL === undefined || mailURL === '') {
    ctx.error('Please provide MAIL_URL to enable email confirmations.')
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const mailAuth = getMetadata(accountPlugin.metadata.MAIL_AUTH_TOKEN)

  const front = branding?.front ?? getMetadata(accountPlugin.metadata.FrontURL)
  if (front === undefined || front === '') {
    ctx.error('Please provide front url via branding configuration or FRONT_URL variable')
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const token = generateToken(account, undefined, {
    confirmEmail: email
  })

  const link = concatLink(front, `/login/confirm?id=${token}`)

  const name = branding?.title ?? getMetadata(accountPlugin.metadata.ProductName)
  const lang = branding?.language
  const text = await translate(accountPlugin.string.ConfirmationText, { name, link }, lang)
  const html = await translate(accountPlugin.string.ConfirmationHTML, { name, link }, lang)
  const subject = await translate(accountPlugin.string.ConfirmationSubject, { name }, lang)

  const response = await fetch(concatLink(mailURL, '/send'), {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      ...(mailAuth != null ? { Authorization: `Bearer ${mailAuth}` } : {})
    },
    body: JSON.stringify({
      text,
      html,
      subject,
      to: email
    })
  })
  if (!response.ok) {
    ctx.error(`Failed to send email confirmation: ${response.statusText}`, { email })
  }
}

export async function confirmEmail (
  ctx: MeasureContext,
  db: AccountDB,
  account: string,
  email: string
): Promise<PersonId> {
  const normalizedEmail = cleanEmail(email)
  ctx.info('Confirming email', { account, email, normalizedEmail })

  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    ctx.error('Email social id not found', { account, normalizedEmail })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.SocialIdNotFound, {
        value: normalizedEmail,
        type: SocialIdType.EMAIL
      })
    )
  }

  if (emailSocialId.verifiedOn != null) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.SocialIdAlreadyConfirmed, {
        socialId: normalizedEmail,
        type: SocialIdType.EMAIL
      })
    )
  }

  await db.socialId.update({ _id: emailSocialId._id }, { verifiedOn: Date.now() })
  return emailSocialId._id
}

export async function confirmHulyIds (ctx: MeasureContext, db: AccountDB, account: AccountUuid): Promise<void> {
  const hulySocialIds = await db.socialId.find({ personUuid: account, type: SocialIdType.HULY, verifiedOn: null })
  for (const hulySocialId of hulySocialIds) {
    await db.socialId.update({ _id: hulySocialId._id }, { verifiedOn: Date.now() })
  }
}

export async function useInvite (db: AccountDB, inviteId: string): Promise<void> {
  await db.invite.update({ id: inviteId }, { $inc: { remainingUses: -1 } })
}

export async function getAccount (db: AccountDB, uuid: AccountUuid): Promise<Account | null> {
  return await db.account.findOne({ uuid })
}

export async function getWorkspaceById (db: AccountDB, uuid: WorkspaceUuid): Promise<Workspace | null> {
  return await db.workspace.findOne({ uuid })
}

export async function getWorkspaceInfoWithStatusById (
  db: AccountDB,
  uuid: WorkspaceUuid
): Promise<WorkspaceInfoWithStatus | null> {
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

export async function getWorkspacesInfoWithStatusByIds (
  db: AccountDB,
  uuids: WorkspaceUuid[]
): Promise<WorkspaceInfoWithStatus[]> {
  const statuses = await db.workspaceStatus.find({ workspaceUuid: { $in: uuids } })
  const statusesMap = statuses.reduce<Record<string, WorkspaceStatus>>((sm, s) => {
    sm[s.workspaceUuid] = s
    return sm
  }, {})
  const workspaces = await db.workspace.find({ uuid: { $in: uuids } })

  return workspaces.map((it) => ({
    ...it,
    status: statusesMap[it.uuid]
  }))
}

export async function getWorkspaceByUrl (db: AccountDB, url: string): Promise<Workspace | null> {
  return await db.workspace.findOne({ url })
}

export async function getWorkspaceByDataId (
  db: AccountDB,
  dataId: string | null | undefined
): Promise<Workspace | null> {
  if (dataId == null || dataId === '') {
    return null
  }

  return await db.workspace.findOne({ dataId: dataId as WorkspaceDataId })
}

export async function getWorkspaceInvite (db: AccountDB, id: string): Promise<WorkspaceInvite | null> {
  const invite = await db.invite.findOne({ id })

  if (invite != null) {
    return invite
  }

  return await db.invite.findOne({ migratedFrom: id })
}

export async function getSocialIdByKey (db: AccountDB, socialKey: string): Promise<SocialId | null> {
  return await db.socialId.findOne({ key: socialKey })
}

export async function getEmailSocialId (db: AccountDB, email: string): Promise<SocialId | null> {
  return await db.socialId.findOne({ type: SocialIdType.EMAIL, value: email })
}

export function getMailUrl (): { mailURL: string, mailAuth: string | undefined } {
  const mailURL = getMetadata(accountPlugin.metadata.MAIL_URL)

  if (mailURL === undefined || mailURL === '') {
    throw new Error('Please provide email service url')
  }
  const mailAuth = getMetadata(accountPlugin.metadata.MAIL_AUTH_TOKEN)

  return { mailURL, mailAuth }
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

  await db.workspaceStatus.update(
    { workspaceUuid: workspace },
    {
      mode: 'archived'
    }
  )
}

export async function getWorkspaceJoinInfo (
  ctx: MeasureContext,
  db: AccountDB,
  email: string,
  inviteId: string,
  workspaceUrl: string
): Promise<WorkspaceJoinInfo> {
  if (email === undefined || email === '' || email === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }
  const normalizedEmail = cleanEmail(email)
  if (inviteId !== undefined && inviteId !== '' && inviteId !== null) {
    const invite = await getWorkspaceInvite(db, inviteId)
    if (invite == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    const workspaceUuid = await checkInvite(ctx, invite, normalizedEmail)
    const workspace = await getWorkspaceById(db, workspaceUuid)
    if (workspace == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
    }
    return {
      email,
      invite,
      workspace
    }
  }
  if (workspaceUrl !== undefined && workspaceUrl !== '' && workspaceUrl !== null) {
    const workspace = await getWorkspaceByUrl(db, workspaceUrl)
    if (workspace == null || !workspace.allowReadOnlyGuest || !workspace.allowGuestSignUp) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    return {
      email,
      workspace
    }
  }
  throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
}

export async function doJoinByInvite (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  account: AccountUuid,
  workspace: Workspace,
  invite: WorkspaceInvite | null | undefined
): Promise<WorkspaceLoginInfo> {
  const role = await db.getWorkspaceRole(account, workspace.uuid)

  if (invite !== undefined && invite != null) {
    // TODO: should we re-join kicked users? How are they marked as inactive?
    if (role == null) {
      await db.assignWorkspace(account, workspace.uuid, invite.role)
    } else if (getRolePower(role) < getRolePower(invite.role)) {
      await db.updateWorkspaceRole(account, workspace.uuid, invite.role)
    }
    await useInvite(db, invite.id)
  } else if (workspace.allowReadOnlyGuest && workspace.allowGuestSignUp) {
    if (role == null) {
      await db.assignWorkspace(account, workspace.uuid, AccountRole.Guest)
    }
  } else {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const result = await selectWorkspace(ctx, db, branding, token, { workspaceUrl: workspace.url, kind: 'external' })

  ctx.info('Successfully joined a workspace using invite', {
    account,
    workspaceUuid: workspace.uuid,
    workspaceUrl: workspace.url,
    workspaceName: workspace.name
  })

  return result
}

export async function loginOrSignUpWithProvider (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string | undefined,
  first: string,
  last: string,
  socialId: SocialKey,
  signUpDisabled = false
): Promise<LoginInfo | null> {
  try {
    const normalizedEmail = email != null ? cleanEmail(email) : ''
    const normalizedSocialId: SocialKey = {
      type: socialId.type,
      value: normalizeValue(socialId.value)
    }

    // Find if any of the target/email social ids exist
    const targetSocialId = await db.socialId.findOne(normalizedSocialId)
    const emailSocialId =
      normalizedEmail !== ''
        ? await db.socialId.findOne({ type: SocialIdType.EMAIL, value: normalizedEmail })
        : undefined
    let personUuid = targetSocialId?.personUuid ?? emailSocialId?.personUuid

    if (personUuid == null) {
      if (signUpDisabled) {
        return null
      }

      personUuid = await db.person.insertOne({ firstName: first, lastName: last })
    }

    if (personUuid == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
    }

    const person = await db.person.findOne({ uuid: personUuid })

    if (person == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
    }

    const account = await db.account.findOne({ uuid: personUuid as AccountUuid })

    if (account == null) {
      if (signUpDisabled) {
        return null
      }

      await createAccount(db, personUuid, true)
      await db.person.update({ uuid: personUuid }, { firstName: first, lastName: last })
    }

    // We should check and reset password if there's an account with password but no social ids have been
    // confirmed yet
    const confirmedSocialId = await db.socialId.findOne({ personUuid, verifiedOn: { $gt: 0 } })

    if (confirmedSocialId == null) {
      await db.resetPassword(personUuid as AccountUuid)
    }

    let socialIdId: PersonId | undefined
    // Create and/or confirm missing social ids
    if (targetSocialId == null) {
      socialIdId = await db.socialId.insertOne({ ...normalizedSocialId, personUuid, verifiedOn: Date.now() })
    } else if (targetSocialId.verifiedOn == null) {
      await db.socialId.update({ key: targetSocialId.key }, { verifiedOn: Date.now() })
      socialIdId = targetSocialId._id
    }

    if (emailSocialId == null) {
      if (normalizedEmail !== '') {
        await db.socialId.insertOne({
          type: SocialIdType.EMAIL,
          value: normalizedEmail,
          personUuid,
          verifiedOn: Date.now()
        })
      }
    } else if (emailSocialId.verifiedOn == null) {
      await db.socialId.update({ key: emailSocialId.key }, { verifiedOn: Date.now() })
    }

    await confirmHulyIds(ctx, db, personUuid as AccountUuid)
    const extraToken: Record<string, string> = isAdminEmail(normalizedEmail) ? { admin: 'true' } : {}
    ctx.info('Provider login succeeded', { email, normalizedEmail, emailSocialId, socialId, ...extraToken })

    return {
      account: personUuid as AccountUuid,
      socialId: socialIdId,
      name: getPersonName(person),
      token: generateToken(personUuid, undefined, extraToken)
    }
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('Provider login failed', { email, err })
    throw err
  }
}

export async function joinWithProvider (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string | undefined,
  first: string,
  last: string,
  inviteId: string,
  socialId: SocialKey,
  signUpDisabled = false
): Promise<WorkspaceLoginInfo | LoginInfo | null> {
  const normalizedEmail = email != null ? cleanEmail(email) : ''
  const invite = await getWorkspaceInvite(db, inviteId)
  if (invite == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceUuid = await checkInvite(ctx, invite, normalizedEmail)
  const workspace = await getWorkspaceById(db, workspaceUuid)

  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const loginInfo = await loginOrSignUpWithProvider(
    ctx,
    db,
    branding,
    normalizedEmail,
    first,
    last,
    socialId,
    signUpDisabled
  )

  if (loginInfo == null) {
    return null
  }

  return await doJoinByInvite(
    ctx,
    db,
    branding,
    generateToken(loginInfo.account, workspaceUuid),
    loginInfo.account,
    workspace,
    invite
  )
}

export function flattenStatus (ws: WorkspaceInfoWithStatus): WorkspaceInfoWithStatusCore {
  if (ws === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, {}))
  }

  const status = ws.status
  const result: WorkspaceInfoWithStatusCore = {
    ...ws,
    ...status,
    createdOn: ws.createdOn as number,
    processingAttemps: status.processingAttempts ?? 0
  }
  delete (result as any).status

  return result
}

export async function cleanExpiredOtp (db: AccountDB): Promise<void> {
  await db.otp.deleteMany({ expiresOn: { $lte: Date.now() } })
}

export async function getWorkspaces (
  db: AccountDB,
  isDisabled?: boolean | null,
  region?: string | null,
  mode?: WorkspaceMode | null
): Promise<WorkspaceInfoWithStatus[]> {
  const statuses = await db.workspaceStatus.find({})
  const statusesMap = statuses.reduce<Record<string, WorkspaceStatus>>((sm, s) => {
    sm[s.workspaceUuid] = s
    return sm
  }, {})

  const workspaces = (await db.workspace.find(region != null ? { region } : {})).filter((it) => {
    const status = statusesMap[it.uuid]
    if (isDisabled === true) {
      return status.isDisabled
    } else if (isDisabled === false) {
      return !status.isDisabled
    }

    if (mode != null) {
      return status.mode === mode
    }

    return true
  })

  return workspaces.map((it) => ({
    ...it,
    status: statusesMap[it.uuid]
  }))
}

export function verifyAllowedServices (services: string[], extra: any, shouldThrow = true): boolean {
  const ok = services.includes(extra?.service) || extra?.admin === 'true'

  if (!ok && shouldThrow) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return ok
}

export function verifyAllowedRole (
  callerRole: AccountRole | null,
  minRole: AccountRole,
  extra: any,
  shouldThrow = true
): boolean {
  const ok = extra?.admin === 'true' || (callerRole != null && getRolePower(callerRole) >= getRolePower(minRole))

  if (!ok && shouldThrow) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return ok
}

export function getPersonName (person: Person): string {
  // Should we control the order by config?
  return `${person.firstName} ${person.lastName}`
}

interface EmailInfo {
  text: string
  html: string
  subject: string
  to: string
}

export async function sendEmail (info: EmailInfo, ctx: MeasureContext): Promise<void> {
  const { text, html, subject, to } = info
  const { mailURL, mailAuth } = getMailUrl()
  const response = await fetch(concatLink(mailURL, '/send'), {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      ...(mailAuth != null ? { Authorization: `Bearer ${mailAuth}` } : {})
    },
    body: JSON.stringify({
      text,
      html,
      subject,
      to
    })
  })
  if (!response.ok) {
    ctx.error(`Failed to send mail: ${response.statusText}`, { to })
  }
}

export function sanitizeEmail (email: string): string {
  if (email == null || typeof email !== 'string') return ''
  const sanitizedEmail = email
    .trim()
    .replace(/[<>/\\@{}()[\]'"`]/g, '') // Remove special chars and quotes
    .replace(/^(http|ssh|ftp|https|mailto|javascript|data|file):?\/?\/?\s*/i, '') // Remove potentially dangerous protocols
    .slice(0, 40)
  return sanitizedEmail
}

export async function getInviteEmail (
  branding: Branding | null,
  email: string,
  link: string,
  workspace: Workspace,
  expHours: number,
  resend = false
): Promise<EmailInfo> {
  const ws = sanitizeEmail(workspace.name !== '' ? workspace.name : workspace.url)
  const lang = branding?.language

  return {
    text: await translate(
      resend ? accountPlugin.string.ResendInviteText : accountPlugin.string.InviteText,
      { link, ws, expHours },
      lang
    ),
    html: await translate(
      resend ? accountPlugin.string.ResendInviteHTML : accountPlugin.string.InviteHTML,
      { link, ws, expHours },
      lang
    ),
    subject: await translate(
      resend ? accountPlugin.string.ResendInviteSubject : accountPlugin.string.InviteSubject,
      { ws },
      lang
    ),
    to: email
  }
}

export async function addSocialIdBase (
  db: AccountDB,
  personUuid: PersonUuid,
  type: SocialIdType,
  value: string,
  confirmed: boolean,
  displayValue?: string
): Promise<PersonId> {
  const normalizedValue = normalizeValue(value ?? '')

  if (!Object.values(SocialIdType).includes(type) || normalizedValue.length === 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const person = await db.person.findOne({ uuid: personUuid })
  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: personUuid }))
  }

  const socialId = await db.socialId.findOne({ type, value: normalizedValue })
  if (socialId != null) {
    const update: Operations<SocialId> = {}
    let needUpdate = false

    if (socialId.personUuid !== personUuid) {
      if (socialId.verifiedOn != null) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.SocialIdAlreadyExists, {}))
      } else {
        // Was not verified.
        const accountFromSocialId = await db.account.findOne({ uuid: socialId.personUuid as AccountUuid })

        if (accountFromSocialId == null && confirmed) {
          // If attached to a person w/o account and adding verifiedOn - merge this person into the current account.
          await doMergePersons(db, personUuid, socialId.personUuid)
        } else {
          // Re-wire this social id into the current account
          update.personUuid = personUuid
          needUpdate = true
        }
      }
    }

    if (confirmed && socialId.verifiedOn == null) {
      update.verifiedOn = Date.now()
      needUpdate = true
    }

    if (displayValue !== socialId.displayValue) {
      update.displayValue = displayValue
      needUpdate = true
    }

    if (needUpdate) {
      await db.socialId.update({ _id: socialId._id }, update)
    }

    return socialId._id
  }

  const newSocialId: Omit<SocialId, '_id' | 'key'> = {
    type,
    value: normalizedValue,
    personUuid,
    displayValue
  }

  if (confirmed) {
    newSocialId.verifiedOn = Date.now()
  }

  return await db.socialId.insertOne(newSocialId)
}

export async function doReleaseSocialId (
  db: AccountDB,
  personUuid: PersonUuid,
  type: SocialIdType,
  value: string,
  releasedBy: string,
  deleteIntegrations = false
): Promise<SocialId> {
  const socialId = await db.socialId.findOne({ personUuid, type, value, isDeleted: { $ne: true } })

  if (socialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.SocialIdNotFound, {}))
  }

  const account = await db.account.findOne({ uuid: personUuid as AccountUuid })

  const integrations = await db.integration.find({ socialId: socialId._id })
  if (!deleteIntegrations && integrations.length > 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationExists, {}))
  }

  // Delete all integrations for this socialId
  // TODO: Send to pipe? to notify integration services somehow so they can clean up if needed
  await db.integrationSecret.deleteMany({ socialId: socialId._id })
  await db.integration.deleteMany({ socialId: socialId._id })

  // Release socialId
  await db.socialId.update({ _id: socialId._id }, { value: `${socialId.value}#${socialId._id}`, isDeleted: true })
  if (account != null) {
    await db.accountEvent.insertOne({
      accountUuid: account.uuid,
      eventType: AccountEventType.SOCIAL_ID_RELEASED,
      time: Date.now(),
      data: {
        socialId: socialId._id,
        releasedBy: releasedBy ?? ''
      }
    })
  }

  // read updated id (to avoid generating updated key manually)
  const deletedSocialId = await db.socialId.findOne({ _id: socialId._id })

  if (deletedSocialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  return deletedSocialId
}

export async function getWorkspaceRole (
  db: AccountDB,
  account: AccountUuid,
  workspace: WorkspaceUuid
): Promise<AccountRole | null> {
  if (account === systemAccountUuid) {
    return AccountRole.Owner
  }

  return await db.getWorkspaceRole(account, workspace)
}

export async function getWorkspaceRoles (
  db: AccountDB,
  account: AccountUuid
): Promise<Map<WorkspaceUuid, AccountRole | null>> {
  return await db.getWorkspaceRoles(account)
}

export function generatePassword (len: number = 24): string {
  return randomBytes(len).toString('base64').slice(0, len)
}

export async function setTimezoneIfNotDefined (
  ctx: MeasureContext,
  db: AccountDB,
  accountId: AccountUuid,
  account: Account | null | undefined,
  meta?: Meta
): Promise<void> {
  try {
    if (meta?.timezone === undefined) return
    const existingAccount = account ?? (await db.account.findOne({ uuid: accountId }))
    if (existingAccount === undefined || existingAccount === null) {
      ctx.warn('Failed to find account')
      return
    }
    if (existingAccount.timezone != null) return
    await db.account.update({ uuid: accountId }, { timezone: meta.timezone })
  } catch (err: any) {
    ctx.error('Failed to set account timezone', err)
  }
}

// Move to config?
export const integrationServices = [
  'github',
  'telegram-bot',
  'hulygram',
  'mailbox',
  'caldav',
  'gmail',
  'google-calendar',
  'huly-mail'
]

export async function findExistingIntegration (
  account: AccountUuid,
  db: AccountDB,
  params: Integration,
  extra: any
): Promise<Integration | null> {
  const { socialId, kind, workspaceUuid } = params
  // Note: workspaceUuid === null is a decent use case for account-wise integration not related to a particular workspace
  if (kind == null || kind === '' || socialId == null || socialId === '' || workspaceUuid === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  if (verifyAllowedServices(integrationServices, extra, false)) {
    const existingSocialId = await db.socialId.findOne({ _id: socialId, verifiedOn: { $gt: 0 } })
    if (existingSocialId == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.SocialIdNotFound, { _id: socialId }))
    }
  } else {
    if (account == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    // Allow accounts to operate on their own integrations
    const existingSocialId = await db.socialId.findOne({ _id: socialId, personUuid: account, verifiedOn: { $gt: 0 } })
    if (existingSocialId == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  if (workspaceUuid != null) {
    const workspace = await getWorkspaceById(db, workspaceUuid)
    if (workspace == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
    }
  }

  return await db.integration.findOne({ socialId, kind, workspaceUuid })
}

export async function doMergePersons (
  db: AccountDB,
  primaryPerson: PersonUuid,
  secondaryPerson: PersonUuid,
  mergeVerified = false
): Promise<void> {
  if (primaryPerson === secondaryPerson) {
    // Nothing to do
    return
  }

  const primaryPersonObj = await db.person.findOne({ uuid: primaryPerson })
  if (primaryPersonObj == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: primaryPerson }))
  }

  const secondaryPersonObj = await db.person.findOne({ uuid: secondaryPerson })
  if (secondaryPersonObj == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: secondaryPerson }))
  }

  // Merge social ids. Re-wire the secondary person social ids to the primary person.
  // Keep their ids. This way all PersonIds inside the workspaces will remain the same.
  const secondarySocialIds = await db.socialId.find({ personUuid: secondaryPerson })

  if (!mergeVerified && secondarySocialIds.some((si) => si.verifiedOn != null)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Conflict, {}))
  }

  for (const secondarySocialId of secondarySocialIds) {
    await db.socialId.update({ _id: secondarySocialId._id, personUuid: secondaryPerson }, { personUuid: primaryPerson })
  }

  await db.person.update({ uuid: secondaryPerson }, { migratedTo: primaryPerson })
}

export async function doMergeAccounts (
  db: AccountDB,
  primaryAccount: AccountUuid,
  secondaryAccount: AccountUuid
): Promise<void> {
  if (primaryAccount === secondaryAccount) {
    // Nothing to do
    return
  }

  const primaryAccountObj = await db.account.findOne({ uuid: primaryAccount })
  if (primaryAccountObj == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: primaryAccount }))
  }

  const secondaryAccountObj = await db.account.findOne({ uuid: secondaryAccount })
  if (secondaryAccountObj == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: secondaryAccount }))
  }

  await doMergePersons(db, primaryAccount, secondaryAccount, true)

  // Workspace assignments. Assign primary account to all workspaces of the secondary account.
  const secondaryWorkspacesRoles = await db.getWorkspaceRoles(secondaryAccount)
  for (const [workspaceUuid, role] of secondaryWorkspacesRoles) {
    await db.unassignWorkspace(secondaryAccount, workspaceUuid)

    const primaryRole = await db.getWorkspaceRole(primaryAccount, workspaceUuid)
    if (primaryRole != null) {
      if (getRolePower(primaryRole) < getRolePower(role)) {
        await db.updateWorkspaceRole(primaryAccount, workspaceUuid, role)
      }
    } else {
      await db.assignWorkspace(primaryAccount, workspaceUuid, role)
    }
  }

  // Merge passwords. Keep the primary account password if exists, otherwise take the secondary account password.
  if (primaryAccountObj.hash == null && secondaryAccountObj.hash != null && secondaryAccountObj.salt != null) {
    await db.setPassword(primaryAccount, secondaryAccountObj.hash, secondaryAccountObj.salt)
  }
}
