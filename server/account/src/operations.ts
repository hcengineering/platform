//
// Copyright © 2022-2024 Hardcore Engineering Inc.
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
import {
  AccountInfo,
  AccountRole,
  type Branding,
  buildSocialIdString,
  concatLink,
  isActiveMode,
  isWorkspaceCreating,
  MeasureContext,
  type Person,
  type PersonId,
  type PersonInfo,
  type PersonUuid,
  SocialIdType,
  systemAccountUuid,
  type WorkspaceMemberInfo,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform, { getMetadata, PlatformError, Severity, Status, translate } from '@hcengineering/platform'
import { decodeTokenVerbose, generateToken } from '@hcengineering/server-token'

import { isAdminEmail } from './admin'
import { accountPlugin } from './plugin'
import type {
  AccountDB,
  AccountMethodHandler,
  LoginInfo,
  Mailbox,
  MailboxOptions,
  Meta,
  OtpInfo,
  RegionInfo,
  SocialId,
  WorkspaceInfoWithStatus,
  WorkspaceInviteInfo,
  WorkspaceLoginInfo
} from './types'
import {
  addSocialId,
  checkInvite,
  cleanEmail,
  confirmEmail,
  createAccount,
  createWorkspaceRecord,
  doJoinByInvite,
  EndpointKind,
  generatePassword,
  getAccount,
  getEmailSocialId,
  getEndpoint,
  getFrontUrl,
  getInviteEmail,
  getMailUrl,
  getPersonName,
  getRegions,
  getRolePower,
  getWorkspaceById,
  getWorkspaceInfoWithStatusById,
  getWorkspaceInvite,
  getWorkspaceRole,
  GUEST_ACCOUNT,
  isEmail,
  isOtpValid,
  normalizeValue,
  releaseSocialId,
  selectWorkspace,
  sendEmail,
  sendEmailConfirmation,
  sendOtp,
  setPassword,
  setTimezoneIfNotDefined,
  signUpByEmail,
  updateWorkspaceRole,
  verifyAllowedRole,
  verifyAllowedServices,
  verifyPassword,
  wrap
} from './utils'
import { type AccountServiceMethods, getServiceMethods } from './serviceOperations'

// Note: it is IMPORTANT to always destructure params passed here to avoid sending extra params
// to the database layer when searching/inserting as they may contain SQL injection
// !!! NEVER PASS "params" DIRECTLY in any DB functions !!!

const workspaceLimitPerUser =
  process.env.WORKSPACE_LIMIT_PER_USER != null ? parseInt(process.env.WORKSPACE_LIMIT_PER_USER) : 10

/* =================================== */
/* ============OPERATIONS============= */
/* =================================== */

/**
 * Given an email and password, logs the user in and returns the account information and token.
 */
export async function login (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    password: string
  },
  meta?: Meta
): Promise<LoginInfo> {
  const { email, password } = params
  const normalizedEmail = cleanEmail(email)

  try {
    const emailSocialId = await getEmailSocialId(db, normalizedEmail)

    if (emailSocialId == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
    }

    const existingAccount = await db.account.findOne({ uuid: emailSocialId.personUuid })

    if (existingAccount == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
    }

    const person = await db.person.findOne({ uuid: emailSocialId.personUuid })
    if (person == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
    }

    if (!verifyPassword(password, existingAccount.hash, existingAccount.salt)) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
    }

    const isConfirmed = emailSocialId.verifiedOn != null

    const extraToken: Record<string, string> = isAdminEmail(email) ? { admin: 'true' } : {}
    ctx.info('Login succeeded', { email, normalizedEmail, isConfirmed, emailSocialId, ...extraToken })
    void setTimezoneIfNotDefined(ctx, db, emailSocialId.personUuid, existingAccount, meta)

    return {
      account: existingAccount.uuid,
      token: isConfirmed ? generateToken(existingAccount.uuid, undefined, extraToken) : undefined,
      name: getPersonName(person),
      socialId: emailSocialId._id
    }
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('Login failed', { email, normalizedEmail, err })
    throw err
  }
}

/**
 * Given an email sends an OTP code to the existing user and returns the OTP information.
 */
export async function loginOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { email: string },
  meta?: Meta
): Promise<OtpInfo> {
  const { email } = params

  // Note: can support OTP based on any other social logins later
  const normalizedEmail = cleanEmail(email)
  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  const account = await getAccount(db, emailSocialId.personUuid)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  void setTimezoneIfNotDefined(ctx, db, emailSocialId.personUuid, account, meta)

  return await sendOtp(ctx, db, branding, emailSocialId)
}

/**
 * Given an email, password, first name, and last name, creates a new account and sends a confirmation email.
 * The email confirmation is not required if the email service is not configured.
 */
export async function signUp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    password: string
    firstName: string
    lastName: string
  },
  meta?: Meta
): Promise<LoginInfo> {
  const { email, password, firstName, lastName } = params
  const { account, socialId } = await signUpByEmail(ctx, db, branding, email, password, firstName, lastName)
  const person = await db.person.findOne({ uuid: account })
  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const mailURL = getMetadata(accountPlugin.metadata.MAIL_URL)
  const forceConfirmation = mailURL !== undefined && mailURL !== ''
  if (forceConfirmation) {
    const normalizedEmail = cleanEmail(email)

    await sendEmailConfirmation(ctx, branding, account, normalizedEmail)
  } else {
    ctx.warn('Please provide MAIL_URL to enable sign up email confirmations.')
    await confirmEmail(ctx, db, account, email)
  }

  void setTimezoneIfNotDefined(ctx, db, account, null, meta)
  return {
    account,
    name: getPersonName(person),
    socialId,
    token: !forceConfirmation ? generateToken(account) : undefined
  }
}

export async function signUpOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    firstName: string
    lastName: string
  },
  meta?: Meta
): Promise<OtpInfo> {
  const { email, firstName, lastName } = params
  // Note: can support OTP based on any other social logins later
  const normalizedEmail = cleanEmail(email)
  let emailSocialId = await getEmailSocialId(db, normalizedEmail)
  let personUuid: PersonUuid

  if (emailSocialId !== null) {
    const existingAccount = await db.account.findOne({ uuid: emailSocialId.personUuid })

    if (existingAccount !== null) {
      ctx.error('An account with the provided email already exists', { email })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {}))
    }

    await db.person.updateOne({ uuid: emailSocialId.personUuid }, { firstName, lastName })

    personUuid = emailSocialId.personUuid
  } else {
    // There's no person linked to this email, so we need to create a new one
    personUuid = await db.person.insertOne({ firstName, lastName })
    const newSocialId = { type: SocialIdType.EMAIL, value: normalizedEmail, personUuid }
    const emailSocialIdId = await db.socialId.insertOne(newSocialId)
    emailSocialId = { ...newSocialId, _id: emailSocialIdId, key: buildSocialIdString(newSocialId) }
  }
  void setTimezoneIfNotDefined(ctx, db, personUuid, null, meta)

  return await sendOtp(ctx, db, branding, emailSocialId)
}

export async function validateOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    code: string
  }
): Promise<LoginInfo> {
  const { email, code } = params

  // Note: can support OTP based on any other social logins later
  const normalizedEmail = cleanEmail(email)
  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const isValid = await isOtpValid(db, emailSocialId._id, code)

  if (!isValid) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidOtp, {}))
  }

  await db.otp.deleteMany({ socialId: emailSocialId._id })

  if (emailSocialId.verifiedOn == null) {
    await db.socialId.updateOne({ _id: emailSocialId._id }, { verifiedOn: Date.now() })
  }

  // This method handles both login and signup
  const account = await db.account.findOne({ uuid: emailSocialId.personUuid })

  if (account == null) {
    // This is a signup
    await createAccount(db, emailSocialId.personUuid, true)

    ctx.info('OTP signup success', emailSocialId)
  } else {
    // Confirm huly social id if hasn't been confirmed yet

    ctx.info('OTP login success', emailSocialId)
  }

  const person = await db.person.findOne({ uuid: emailSocialId.personUuid })
  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  return {
    account: emailSocialId.personUuid,
    name: getPersonName(person),
    socialId: emailSocialId._id,
    token: generateToken(emailSocialId.personUuid)
  }
}

export async function createWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    workspaceName: string
    region?: string
  }
): Promise<WorkspaceLoginInfo> {
  const { workspaceName, region } = params
  const { account } = decodeTokenVerbose(ctx, token)

  checkRateLimit(account, workspaceName)

  ctx.info('Creating workspace record', { workspaceName, account, region })

  // Any confirmed social ID will do
  const socialId = await db.socialId.findOne({ personUuid: account, verifiedOn: { $gt: 0 } })

  if (socialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotConfirmed, {}))
  }
  const person = await db.person.findOne({ uuid: socialId.personUuid })
  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  // Get a list of created workspaces
  const created = (await db.workspace.find({ createdBy: socialId.personUuid })).length

  // TODO: Add support for per person limit increase
  if (created >= workspaceLimitPerUser) {
    ctx.warn('created-by-limit', { person: socialId.key, workspace: workspaceName })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.WorkspaceLimitReached, { workspace: workspaceName })
    )
  }

  const { workspaceUuid, workspaceUrl } = await createWorkspaceRecord(ctx, db, branding, workspaceName, account, region)

  await db.assignWorkspace(account, workspaceUuid, AccountRole.Owner)

  ctx.info('Creating workspace record done', { workspaceName, region, account: socialId.personUuid })

  return {
    account,
    socialId: socialId._id,
    name: getPersonName(person),
    token: generateToken(account, workspaceUuid),
    endpoint: getEndpoint(ctx, workspaceUuid, region, EndpointKind.External),
    workspace: workspaceUuid,
    workspaceUrl,
    role: AccountRole.Owner
  }
}

export async function createInvite (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    exp: number
    emailMask?: string
    email?: string
    limit: number
    role: AccountRole
    autoJoin?: boolean
  }
): Promise<string> {
  const { exp, emailMask, email, limit, role, autoJoin } = params
  const { account, workspace: workspaceUuid, extra } = decodeTokenVerbose(ctx, token)

  const currentAccount = await db.account.findOne({ uuid: account })
  if (currentAccount == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account }))
  }

  const workspace = await db.workspace.findOne({ uuid: workspaceUuid })
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const callerRole = await db.getWorkspaceRole(account, workspace.uuid)
  verifyAllowedRole(callerRole, role, extra)

  if (autoJoin === true) {
    verifyAllowedServices(['schedule'], extra)
  }

  ctx.info('Creating invite', { workspace, workspaceName: workspace.name, email, emailMask, limit, autoJoin })

  return await db.invite.insertOne({
    workspaceUuid,
    expiresOn: exp < 0 ? -1 : Date.now() + exp,
    email,
    emailPattern: emailMask,
    remainingUses: limit,
    role,
    autoJoin
  })
}

// TODO: Temporary solution to prevent spam using sendInvite
const invitesSend = new Map<
string,
{
  lastSend: number
  totalSend: number
}
>()

export async function sendInvite (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    role: AccountRole
    expHours?: number
  }
): Promise<void> {
  const { email, role, expHours } = params
  const { account, workspace: workspaceUuid, extra } = decodeTokenVerbose(ctx, token)

  const currentAccount = await db.account.findOne({ uuid: account })
  if (currentAccount == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account }))
  }

  const workspace = await db.workspace.findOne({ uuid: workspaceUuid })
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const callerRole = await db.getWorkspaceRole(account, workspace.uuid)
  verifyAllowedRole(callerRole, role, extra)

  const inviteLink = await createInviteLink(ctx, db, branding, token, params)
  const inviteEmail = await getInviteEmail(branding, email, inviteLink, workspace, expHours ?? 48, false)

  await sendEmail(inviteEmail, ctx)

  ctx.info('Invite has been sent', { to: inviteEmail.to, workspaceUuid: workspace.uuid, workspaceName: workspace.name })
}

export async function createInviteLink (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    role: AccountRole
    autoJoin?: boolean
    firstName?: string
    lastName?: string
    navigateUrl?: string
    expHours?: number
  }
): Promise<string> {
  const { email, role, autoJoin, firstName, lastName, navigateUrl, expHours } = params
  const { account, workspace: workspaceUuid, extra } = decodeTokenVerbose(ctx, token)

  const currentAccount = await db.account.findOne({ uuid: account })
  if (currentAccount == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account }))
  }

  const workspace = await db.workspace.findOne({ uuid: workspaceUuid })
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const callerRole = await db.getWorkspaceRole(account, workspace.uuid)
  verifyAllowedRole(callerRole, role, extra)

  if (autoJoin === true) {
    verifyAllowedServices(['schedule'], extra)

    if (firstName == null || firstName === '') {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
    }
  }

  const normalizedEmail = cleanEmail(email)
  const expiringInHrs = expHours ?? 48
  const exp = expiringInHrs * 60 * 60 * 1000

  const inviteId = await createInvite(ctx, db, branding, token, {
    exp,
    email: normalizedEmail,
    limit: 1,
    role,
    autoJoin
  })
  let path = `/login/join?inviteId=${inviteId}`
  if (autoJoin === true) {
    path += `&autoJoin&firstName=${encodeURIComponent((firstName ?? '').trim())}`

    if (lastName != null) {
      path += `&lastName=${encodeURIComponent(lastName.trim())}`
    }
  }
  if (navigateUrl != null) {
    path += `&navigateUrl=${encodeURIComponent(navigateUrl.trim())}`
  }

  const front = getFrontUrl(branding)
  const link = concatLink(front, path)
  ctx.info(`Created invite link: ${link}`)

  return link
}

function checkRateLimit (email: string, workspaceName: string): void {
  const now = Date.now()
  const lastInvites = invitesSend.get(email)
  if (lastInvites !== undefined) {
    lastInvites.totalSend++
    lastInvites.lastSend = now
    if (lastInvites.totalSend > 5 && now - lastInvites.lastSend < 60 * 1000) {
      // Less 60 seconds between invites
      throw new PlatformError(
        new Status(Severity.ERROR, platform.status.WorkspaceRateLimit, { workspace: workspaceName })
      )
    }
    invitesSend.delete(email)
  } else {
    invitesSend.set(email, {
      lastSend: now,
      totalSend: 1
    })
  }

  // We need to cleanup map
  for (const [k, vv] of invitesSend.entries()) {
    if (vv.lastSend < now - 60 * 1000) {
      invitesSend.delete(k)
    }
  }
}

export async function resendInvite (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  email: string,
  role: AccountRole
): Promise<void> {
  const { account, workspace: workspaceUuid, extra } = decodeTokenVerbose(ctx, token)
  const currentAccount = await db.account.findOne({ uuid: account })
  if (currentAccount == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account }))
  }

  const workspace = await db.workspace.findOne({ uuid: workspaceUuid })
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  checkRateLimit(account, workspaceUuid)

  const callerRole = await db.getWorkspaceRole(account, workspace.uuid)
  verifyAllowedRole(callerRole, role, extra)

  const expHours = 48
  const newExp = Date.now() + expHours * 60 * 60 * 1000

  const invite = await db.invite.findOne({ workspaceUuid, email })
  let inviteId: string
  if (invite != null) {
    inviteId = invite.id
    await db.invite.updateOne({ id: invite.id }, { expiresOn: newExp, remainingUses: 1, role })
  } else {
    inviteId = await createInvite(ctx, db, branding, token, { exp: newExp, email, limit: 1, role })
  }
  const front = getFrontUrl(branding)
  const link = concatLink(front, `/login/join?inviteId=${inviteId}`)

  const inviteEmail = await getInviteEmail(branding, email, link, workspace, expHours, true)
  await sendEmail(inviteEmail, ctx)

  ctx.info('Invite has been resent', {
    to: inviteEmail.to,
    workspaceUuid: workspace.uuid,
    workspaceName: workspace.name
  })
}

/**
 * Given an invite and sign in information, assigns the user to the workspace in a given role.
 * If already a member, updates the role if necessary.
 * Returns the workspace login information.
 */
export async function join (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  _token: string,
  params: {
    email: string
    password: string
    inviteId: string
  },
  meta?: Meta
): Promise<WorkspaceLoginInfo | LoginInfo> {
  const { email, password, inviteId } = params
  const normalizedEmail = cleanEmail(email)
  const invite = await getWorkspaceInvite(db, inviteId)
  if (invite == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceUuid = await checkInvite(ctx, invite, normalizedEmail)
  const workspace = await getWorkspaceById(db, workspaceUuid)

  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  ctx.info('Joining a workspace using invite', { email, normalizedEmail, ...invite })

  const { token, account } = await login(ctx, db, branding, _token, { email: normalizedEmail, password }, meta)

  if (token == null) {
    return {
      account
    }
  }

  return await doJoinByInvite(ctx, db, branding, token, account, workspace, invite)
}

/**
 * Given an invite and a token, checks if the user has already joined the workspace and updates the role if necessary.
 * Returns the workspace login information if the user has already joined. Otherwise, throws an error.
 */
export async function checkJoin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { inviteId: string }
): Promise<WorkspaceLoginInfo> {
  const { inviteId } = params

  const invite = await getWorkspaceInvite(db, inviteId)
  if (invite == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const { account: accountUuid } = decodeTokenVerbose(ctx, token)
  const emailSocialId = await db.socialId.findOne({
    type: SocialIdType.EMAIL,
    personUuid: accountUuid,
    verifiedOn: { $gt: 0 }
  })
  const email = emailSocialId?.value ?? ''
  const workspaceUuid = await checkInvite(ctx, invite, email)
  const workspace = await getWorkspaceById(db, workspaceUuid)

  if (workspace === null) {
    ctx.error('Workspace not found in checkJoin', { workspaceUuid, email, inviteId })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const wsLoginInfo = await selectWorkspace(ctx, db, branding, token, { workspaceUrl: workspace.url, kind: 'external' })

  if (getRolePower(wsLoginInfo.role) < getRolePower(invite.role)) {
    await db.updateWorkspaceRole(accountUuid, workspaceUuid, invite.role)
  }

  return {
    ...wsLoginInfo,
    role: invite.role
  }
}

export async function checkAutoJoin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { inviteId: string, firstName?: string, lastName?: string }
): Promise<WorkspaceLoginInfo | WorkspaceInviteInfo> {
  const { inviteId, firstName, lastName } = params
  const invite = await getWorkspaceInvite(db, inviteId)
  if (invite == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (invite.autoJoin !== true) {
    ctx.error('Not an auto-join invite', invite)
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  if (invite.role !== AccountRole.Guest) {
    ctx.error('Auto-join not for guest role is forbidden', invite)
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const normalizedEmail = invite.email != null ? cleanEmail(invite.email) : ''
  const workspaceUuid = invite.workspaceUuid
  const workspace = await getWorkspaceById(db, workspaceUuid)

  if (workspace === null) {
    ctx.error('Workspace not found in auto-joining workflow', { workspaceUuid, email: normalizedEmail, inviteId })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  if (normalizedEmail == null || normalizedEmail === '') {
    ctx.error('Malformed auto-join invite', invite)
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const emailSocialId = await db.socialId.findOne({
    type: SocialIdType.EMAIL,
    value: normalizedEmail
  })

  // If it's an existing account we should check for saved token or ask for login to prevent accidental access through shared link
  if (emailSocialId != null) {
    const targetAccount = await getAccount(db, emailSocialId.personUuid)
    if (targetAccount != null) {
      if (targetAccount.automatic == null || !targetAccount.automatic) {
        if (token == null) {
          // Login required
          const person = await db.person.findOne({ uuid: targetAccount.uuid })

          return {
            workspace: workspace.uuid,
            name: person == null ? '' : getPersonName(person),
            email: normalizedEmail
          }
        }

        const { account: callerAccount } = decodeTokenVerbose(ctx, token)

        if (callerAccount !== targetAccount.uuid) {
          // Login with target email required
          const person = await db.person.findOne({ uuid: targetAccount.uuid })

          return {
            workspace: workspace.uuid,
            name: person == null ? '' : getPersonName(person),
            email: normalizedEmail
          }
        }
      }

      const targetRole = await getWorkspaceRole(db, targetAccount.uuid, workspace.uuid)

      if (targetRole == null) {
        await db.assignWorkspace(targetAccount.uuid, workspace.uuid, invite.role)
      } else if (getRolePower(targetRole) < getRolePower(invite.role)) {
        await db.updateWorkspaceRole(targetAccount.uuid, workspace.uuid, invite.role)
      }

      if (token === undefined || token === null) {
        token = generateToken(targetAccount.uuid)
      }
      return await selectWorkspace(ctx, db, branding, token, { workspaceUrl: workspace.url, kind: 'external' })
    }
  }

  // No account yet, create a new one automatically
  if (firstName == null || firstName === '') {
    ctx.error('First name is required for auto-join', { firstName })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const { account } = await signUpByEmail(
    ctx,
    db,
    branding,
    normalizedEmail,
    null,
    firstName,
    lastName ?? '',
    true,
    true
  )

  return await doJoinByInvite(ctx, db, branding, generateToken(account, workspaceUuid), account, workspace, invite)
}

/**
 * Given an invite and sign up information, creates an account and assigns it to the workspace.
 */
export async function signUpJoin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    password: string
    first: string
    last: string
    inviteId: string
  },
  meta?: Meta
): Promise<WorkspaceLoginInfo> {
  const { email, password, first, last, inviteId } = params
  const normalizedEmail = cleanEmail(email)
  ctx.info('Signing up and joining a workspace using invite', { email, normalizedEmail, first, last, inviteId })

  const invite = await getWorkspaceInvite(db, inviteId)
  if (invite == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceUuid = await checkInvite(ctx, invite, normalizedEmail)
  const workspace = await getWorkspaceById(db, workspaceUuid)

  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const { account } = await signUpByEmail(ctx, db, branding, email, password, first, last, true)
  void setTimezoneIfNotDefined(ctx, db, account, null, meta)

  return await doJoinByInvite(ctx, db, branding, generateToken(account, workspaceUuid), account, workspace, invite)
}

export async function confirm (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<LoginInfo> {
  const { account, extra } = decodeTokenVerbose(ctx, token)

  const email = extra?.confirmEmail
  if (email === undefined) {
    ctx.error('Email not provided for confirmation', { account, extra })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const socialId = await confirmEmail(ctx, db, account, email)

  const person = await db.person.findOne({ uuid: account })
  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const result = {
    account,
    name: getPersonName(person),
    socialId,
    token: generateToken(account)
  }

  ctx.info('Email confirmed', { account, email })

  return result
}

export async function changePassword (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    oldPassword: string
    newPassword: string
  }
): Promise<void> {
  const { oldPassword, newPassword } = params
  const { account: accountUuid } = decodeTokenVerbose(ctx, token)

  ctx.info('Changing password', { accountUuid })

  const account = await getAccount(db, accountUuid)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: accountUuid }))
  }

  if (!verifyPassword(oldPassword, account.hash, account.salt)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await setPassword(ctx, db, branding, accountUuid, newPassword)

  ctx.info('Password changed', { accountUuid })
}

export async function requestPasswordReset (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  _token: string,
  params: { email: string }
): Promise<void> {
  const { email } = params
  const normalizedEmail = cleanEmail(email)

  ctx.info('Requesting password reset', { email, normalizedEmail })

  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    ctx.error('Email social id not found', { email, normalizedEmail })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.SocialIdNotFound, { value: email, type: SocialIdType.EMAIL })
    )
  }

  const account = await getAccount(db, emailSocialId.personUuid)

  if (account == null) {
    ctx.info('Account not found', { email, normalizedEmail })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.AccountNotFound, { account: emailSocialId.personUuid })
    )
  }

  const { mailURL, mailAuth } = getMailUrl()
  const front = getFrontUrl(branding)

  const token = generateToken(account.uuid, undefined, {
    restoreEmail: normalizedEmail
  })

  const link = concatLink(front, `/login/recovery?id=${token}`)
  const lang = branding?.language
  const text = await translate(accountPlugin.string.RecoveryText, { link }, lang)
  const html = await translate(accountPlugin.string.RecoveryHTML, { link }, lang)
  const subject = await translate(accountPlugin.string.RecoverySubject, {}, lang)

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
      to: normalizedEmail
    })
  })
  if (response.ok) {
    ctx.info('Password reset email sent', { email, normalizedEmail, account: account.uuid })
  } else {
    ctx.error(`Failed to send reset password email: ${response.statusText}`, {
      email,
      normalizedEmail,
      account: account.uuid
    })
  }
}

export async function restorePassword (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { password: string }
): Promise<LoginInfo> {
  const { password } = params

  const { account, extra } = decodeTokenVerbose(ctx, token)
  ctx.info('Restoring password', { account, extra })

  const email = extra?.restoreEmail
  if (email === undefined) {
    ctx.error('Email not provided for restoration', { account, extra })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const emailSocialId = await getEmailSocialId(db, email)

  if (emailSocialId == null) {
    ctx.error('Email social id not found', { email })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.SocialIdNotFound, { value: email, type: SocialIdType.EMAIL })
    )
  }

  await setPassword(ctx, db, branding, account, password)

  if (emailSocialId.verifiedOn == null) {
    await db.socialId.updateOne({ key: emailSocialId.key }, { verifiedOn: Date.now() })
  }

  return await login(ctx, db, branding, token, { email, password })
}

export async function leaveWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { account: PersonUuid }
): Promise<LoginInfo | null> {
  const { account: targetAccount } = params
  const { account, workspace } = decodeTokenVerbose(ctx, token)
  ctx.info('Removing account from workspace', { account, workspace })

  if (account == null || workspace == null) {
    ctx.error('Account or workspace not provided for leaving', { account, workspace })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const initiatorRole = await db.getWorkspaceRole(account, workspace)

  if (account !== targetAccount) {
    if (initiatorRole == null || getRolePower(initiatorRole) < getRolePower(AccountRole.Maintainer)) {
      ctx.error("Need to be at least maintainer to remove someone else's account from workspace", {
        account,
        workspace,
        initiatorRole
      })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  await db.unassignWorkspace(targetAccount, workspace)
  ctx.info('Account removed from workspace', { targetAccount, workspace })

  if (account === targetAccount) {
    const person = await db.person.findOne({ uuid: account })
    if (person == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
    }

    return {
      account,
      name: getPersonName(person),
      token: generateToken(account, undefined)
    }
  }

  return null
}

export async function changeUsername (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    first: string
    last: string
  }
): Promise<void> {
  const { first, last } = params
  const { account } = decodeTokenVerbose(ctx, token)

  ctx.info('Changing name of person', { account, first, last })

  await db.person.updateOne({ uuid: account }, { firstName: first, lastName: last })

  ctx.info('Name changed', { account, first, last })
}

export async function updateWorkspaceName (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { name: string }
): Promise<void> {
  const { name } = params
  const { account, workspace } = decodeTokenVerbose(ctx, token)
  const role = await db.getWorkspaceRole(account, workspace)

  if (role == null || getRolePower(role) < getRolePower(AccountRole.Maintainer)) {
    ctx.error('Need to be at least maintainer to update workspace name', { workspace, account, role })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await db.workspace.updateOne(
    { uuid: workspace },
    {
      name
    }
  )
}

export async function deleteWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<void> {
  const { account, workspace } = decodeTokenVerbose(ctx, token)
  const role = await db.getWorkspaceRole(account, workspace)

  if (role !== AccountRole.Owner) {
    ctx.error('Need to be an owner to delete a workspace', { workspace, account, role })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await db.workspaceStatus.updateOne(
    { workspaceUuid: workspace },
    {
      isDisabled: true,
      mode: 'pending-deletion'
    }
  )
}

/* =================================== */
/* ==========READ OPERATIONS========== */
/* =================================== */

export async function getRegionInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<RegionInfo[]> {
  return getRegions()
}

export async function getUserWorkspaces (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<WorkspaceInfoWithStatus[]> {
  const { account } = decodeTokenVerbose(ctx, token)

  return (await db.getAccountWorkspaces(account)).filter(
    (ws) => !ws.status.isDisabled || isWorkspaceCreating(ws.status.mode)
  )
}

/**
 * @public
 */
export async function getWorkspacesInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  ids: WorkspaceUuid[]
): Promise<WorkspaceInfoWithStatus[]> {
  const { account } = decodeTokenVerbose(ctx, token)

  if (account !== systemAccountUuid) {
    ctx.error('getWorkspaceInfos with wrong user', { account, token })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const workspaces: WorkspaceInfoWithStatus[] = []
  for (const id of ids) {
    const ws = await getWorkspaceInfoWithStatusById(db, id)
    if (ws !== null) {
      workspaces.push(ws)
    }
  }

  workspaces.sort((a, b) => (b.status.lastVisit ?? 0) - (a.status.lastVisit ?? 0))

  return workspaces
}

export async function getWorkspaceInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { updateLastVisit: boolean }
): Promise<WorkspaceInfoWithStatus> {
  const { updateLastVisit = false } = params

  const { account, workspace: workspaceUuid, extra } = decodeTokenVerbose(ctx, token)
  const isGuest = extra?.guest === 'true'
  const skipAssignmentCheck = isGuest || account === systemAccountUuid

  if (!skipAssignmentCheck) {
    const role = await db.getWorkspaceRole(account, workspaceUuid)

    if (role == null) {
      ctx.error('Not a member of the workspace', { workspaceUuid, account })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  const workspace = await getWorkspaceInfoWithStatusById(db, workspaceUuid)

  // TODO: what should we return for archived?
  if (workspace == null) {
    ctx.error('Workspace not found', { workspaceUuid, account })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  if (workspace.status.isDisabled && isActiveMode(workspace.status.mode)) {
    ctx.error('Workspace is disabled', { workspaceUuid, account })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  if (!isGuest && updateLastVisit) {
    await db.workspaceStatus.updateOne({ workspaceUuid }, { lastVisit: Date.now() })
  }

  return workspace
}

/**
 * Validates the token and returns the decoded account information.
 */
export async function getLoginInfoByToken (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<LoginInfo | WorkspaceLoginInfo> {
  let accountUuid: PersonUuid
  let workspaceUuid: WorkspaceUuid
  let extra: any
  try {
    ;({ account: accountUuid, workspace: workspaceUuid, extra } = decodeTokenVerbose(ctx, token))
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('Invalid token', { token })
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Unauthorized, {}))
  }

  if (accountUuid == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: accountUuid }))
  }

  const isDocGuest = accountUuid === GUEST_ACCOUNT && extra?.guest === 'true'
  const isSystem = accountUuid === systemAccountUuid
  let socialId: SocialId | null = null

  if (!isDocGuest && !isSystem) {
    // Any confirmed social ID will do
    socialId = await db.socialId.findOne({ personUuid: accountUuid, verifiedOn: { $gt: 0 } })
    if (socialId == null) {
      return {
        account: accountUuid
      }
    }
  }

  let person: Person | null
  if (isDocGuest) {
    person = {
      uuid: accountUuid,
      firstName: 'Guest',
      lastName: 'User'
    }
  } else if (isSystem) {
    person = {
      uuid: accountUuid,
      firstName: 'System',
      lastName: 'User'
    }
  } else {
    person = await db.person.findOne({ uuid: accountUuid })
  }

  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  }

  const loginInfo = {
    account: accountUuid,
    name: getPersonName(person),
    socialId: socialId?._id,
    token
  }

  if (workspaceUuid != null && workspaceUuid !== '') {
    const workspace = await getWorkspaceById(db, workspaceUuid)

    if (workspace == null) {
      ctx.error('Workspace not found', { workspaceUuid, account: accountUuid })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
    }

    if (isDocGuest) {
      return {
        ...loginInfo,
        workspace: workspaceUuid,
        endpoint: getEndpoint(ctx, workspace.uuid, workspace.region, EndpointKind.External),
        role: AccountRole.DocGuest
      }
    }

    const role = await getWorkspaceRole(db, accountUuid, workspace.uuid)

    if (role == null) {
      // User might have been removed from the workspace
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }

    return {
      ...loginInfo,
      workspace: workspace.uuid,
      workspaceDataId: workspace.dataId,
      endpoint: getEndpoint(ctx, workspace.uuid, workspace.region, EndpointKind.External),
      role
    }
  } else {
    return loginInfo
  }
}

export async function getSocialIds (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { confirmed: boolean }
): Promise<SocialId[]> {
  const { confirmed = true } = params
  const { account } = decodeTokenVerbose(ctx, token)

  // do not expose not-confirmed social ids for now
  if (!confirmed) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return await db.socialId.find({ personUuid: account, verifiedOn: { $gt: 0 } })
}

export async function getPerson (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<Person> {
  const { account } = decodeTokenVerbose(ctx, token)

  const person = await db.person.findOne({ uuid: account })

  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: account }))
  }

  return person
}

export async function getPersonInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { account: PersonUuid }
): Promise<PersonInfo> {
  const { account } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['workspace', 'tool'], extra)

  const person = await db.person.findOne({ uuid: account })

  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: account }))
  }

  const verifiedSocialIds = await db.socialId.find({ personUuid: account, verifiedOn: { $gt: 0 } })

  return {
    personUuid: account,
    name: getPersonName(person),
    socialIds: verifiedSocialIds.map((it) => it._id)
  }
}

export async function findPersonBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialString: string, requireAccount?: boolean }
): Promise<PersonUuid | undefined> {
  const { socialString } = params
  decodeTokenVerbose(ctx, token)

  const socialId = await db.socialId.findOne({ key: socialString })

  if (socialId == null) {
    return
  }

  if (params.requireAccount === true) {
    const account = await db.account.findOne({ uuid: socialId.personUuid })

    return account?.uuid
  }

  return socialId.personUuid
}

export async function findPersonBySocialId (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialId: PersonId, requireAccount?: boolean }
): Promise<PersonUuid | undefined> {
  const { socialId, requireAccount } = params
  decodeTokenVerbose(ctx, token)

  const socialIdObj = await db.socialId.findOne({ _id: socialId })

  if (socialIdObj == null) {
    return
  }

  // TODO: combine into one request with join
  if (requireAccount === true) {
    const account = await db.account.findOne({ uuid: socialIdObj.personUuid })
    if (account == null) {
      return
    }
  }

  return socialIdObj.personUuid
}

export async function findSocialIdBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialKey: string, requireAccount?: boolean }
): Promise<PersonId | undefined> {
  const { socialKey, requireAccount } = params
  decodeTokenVerbose(ctx, token)

  const socialIdObj = await db.socialId.findOne({ key: socialKey })

  if (socialIdObj == null) {
    return
  }

  // TODO: combine into one request with join
  if (requireAccount === true) {
    const account = await db.account.findOne({ uuid: socialIdObj.personUuid })
    if (account == null) {
      return
    }
  }

  return socialIdObj._id
}

export async function getSocialIdBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialKey: string }
): Promise<SocialId | null> {
  const { socialKey } = params
  decodeTokenVerbose(ctx, token)

  return await db.socialId.findOne({ key: socialKey })
}

export async function getWorkspaceMembers (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<WorkspaceMemberInfo[]> {
  const { account, workspace } = decodeTokenVerbose(ctx, token)

  if (workspace === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  const accRole = await getWorkspaceRole(db, account, workspace)

  if (accRole == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return await db.getWorkspaceMembers(workspace)
}

export async function getAccountInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { accountId: PersonUuid }
): Promise<AccountInfo> {
  decodeTokenVerbose(ctx, token)
  const { accountId } = params
  const account = await getAccount(db, accountId)
  if (account === undefined || account === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }
  return { timezone: account?.timezone, locale: account?.locale }
}

export async function ensurePerson (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    socialType: SocialIdType
    socialValue: string
    firstName: string
    lastName: string
  }
): Promise<{ uuid: PersonUuid, socialId: PersonId }> {
  const { account, workspace, extra } = decodeTokenVerbose(ctx, token)
  const allowedService = verifyAllowedServices(['tool', 'workspace', 'schedule', 'mail'], extra, false)

  if (!allowedService) {
    const callerRole = await getWorkspaceRole(db, account, workspace)
    verifyAllowedRole(callerRole, AccountRole.User, extra)
  }

  const { socialType, socialValue, firstName, lastName } = params
  const trimmedFirst = firstName == null ? '' : firstName.trim()
  const trimmedLast = lastName == null ? '' : lastName.trim()
  const normalizedValue = normalizeValue(socialValue ?? '')

  if (!Object.values(SocialIdType).includes(socialType) || trimmedFirst.length === 0 || normalizedValue.length === 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const socialId = await db.socialId.findOne({ type: socialType, value: normalizedValue })
  if (socialId != null) {
    return { uuid: socialId.personUuid, socialId: socialId._id }
  }

  const personUuid = await db.person.insertOne({ firstName: trimmedFirst, lastName: trimmedLast })
  const newSocialId = await db.socialId.insertOne({ type: socialType, value: normalizedValue, personUuid })

  return { uuid: personUuid, socialId: newSocialId }
}

async function getMailboxOptions (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<MailboxOptions> {
  decodeTokenVerbose(ctx, token)

  return {
    availableDomains: process.env.MAILBOX_DOMAINS?.split(',') ?? [],
    minNameLength: parseInt(process.env.MAILBOX_MIN_NAME_LENGTH ?? '6'),
    maxNameLength: parseInt(process.env.MAILBOX_MAX_NAME_LENGTH ?? '30'),
    maxMailboxCount: parseInt(process.env.MAILBOX_MAX_COUNT_PER_ACCOUNT ?? '1')
  }
}

async function createMailbox (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    name: string
    domain: string
  }
): Promise<{ mailbox: string, socialId: PersonId }> {
  const { account } = decodeTokenVerbose(ctx, token)
  const { name, domain } = params
  const normalizedName = cleanEmail(name)
  const normalizedDomain = cleanEmail(domain)
  const mailbox = normalizedName + '@' + normalizedDomain
  const opts = await getMailboxOptions(ctx, db, branding, token)

  if (normalizedName.length === 0 || normalizedDomain.length === 0 || !isEmail(mailbox)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.MailboxError, { reason: 'invalid-name' }))
  }
  if (!opts.availableDomains.includes(normalizedDomain)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.MailboxError, { reason: 'domain-not-found' }))
  }
  if (normalizedName.length < opts.minNameLength || normalizedName.length > opts.maxNameLength) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.MailboxError, { reason: 'name-rules-violated' }))
  }

  if ((await db.mailbox.findOne({ mailbox })) !== null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.MailboxError, { reason: 'mailbox-exists' }))
  }
  const mailboxes = await db.mailbox.find({ accountUuid: account })
  if (mailboxes.length >= opts.maxMailboxCount) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.MailboxError, { reason: 'mailbox-count-limit' }))
  }

  await db.mailbox.insertOne({ accountUuid: account, mailbox })
  await db.mailboxSecret.insertOne({ mailbox, secret: generatePassword() })
  const socialId = await addSocialId(db, account, SocialIdType.EMAIL, mailbox, true)
  ctx.info('Mailbox created', { mailbox, account, socialId })
  return { mailbox, socialId }
}

async function getMailboxes (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string
): Promise<Mailbox[]> {
  const { account } = decodeTokenVerbose(ctx, token)
  return await db.mailbox.find({ accountUuid: account })
}

async function deleteMailbox (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { mailbox: string }
): Promise<void> {
  const { account } = decodeTokenVerbose(ctx, token)
  const mailbox = cleanEmail(params.mailbox)

  if (!isEmail(mailbox)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.MailboxError, { reason: 'invalid-name' }))
  }

  const mb = await db.mailbox.findOne({ mailbox, accountUuid: account })
  if (mb == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.MailboxError, { reason: 'mailbox-not-found' }))
  }

  await db.mailboxSecret.deleteMany({ mailbox })
  await db.mailbox.deleteMany({ mailbox })
  await releaseSocialId(db, account, SocialIdType.EMAIL, mailbox)
  ctx.info('Mailbox deleted', { mailbox, account })
}

export type AccountMethods =
  | AccountServiceMethods
  | 'login'
  | 'loginOtp'
  | 'signUp'
  | 'signUpOtp'
  | 'validateOtp'
  | 'createWorkspace'
  | 'createInvite'
  | 'createInviteLink'
  | 'sendInvite'
  | 'resendInvite'
  | 'selectWorkspace'
  | 'join'
  | 'checkJoin'
  | 'checkAutoJoin'
  | 'signUpJoin'
  | 'confirm'
  | 'changePassword'
  | 'requestPassword'
  | 'restorePassword'
  | 'leaveWorkspace'
  | 'changeUsername'
  | 'updateWorkspaceName'
  | 'deleteWorkspace'
  | 'getRegionInfo'
  | 'getUserWorkspaces'
  | 'getWorkspaceInfo'
  | 'getWorkspacesInfo'
  | 'getLoginInfoByToken'
  | 'getSocialIds'
  | 'getPerson'
  | 'getPersonInfo'
  | 'getWorkspaceMembers'
  | 'updateWorkspaceRole'
  | 'findPersonBySocialKey'
  | 'findPersonBySocialId'
  | 'findSocialIdBySocialKey'
  | 'getSocialIdBySocialKey'
  | 'ensurePerson'
  | 'getMailboxOptions'
  | 'createMailbox'
  | 'getMailboxes'
  | 'deleteMailbox'
  | 'addSocialIdToPerson'
  | 'updateSocialId'
  | 'getAccountInfo'

/**
 * @public
 */
export function getMethods (hasSignUp: boolean = true): Partial<Record<AccountMethods, AccountMethodHandler>> {
  return {
    /* OPERATIONS */
    login: wrap(login),
    loginOtp: wrap(loginOtp),
    ...(hasSignUp ? { signUp: wrap(signUp) } : {}),
    ...(hasSignUp ? { signUpOtp: wrap(signUpOtp) } : {}),
    validateOtp: wrap(validateOtp),
    createWorkspace: wrap(createWorkspace),
    createInvite: wrap(createInvite),
    createInviteLink: wrap(createInviteLink),
    sendInvite: wrap(sendInvite),
    resendInvite: wrap(resendInvite),
    selectWorkspace: wrap(selectWorkspace),
    join: wrap(join),
    checkJoin: wrap(checkJoin),
    checkAutoJoin: wrap(checkAutoJoin),
    signUpJoin: wrap(signUpJoin),
    confirm: wrap(confirm),
    changePassword: wrap(changePassword),
    requestPassword: wrap(requestPasswordReset),
    restorePassword: wrap(restorePassword),
    leaveWorkspace: wrap(leaveWorkspace),
    changeUsername: wrap(changeUsername),
    updateWorkspaceName: wrap(updateWorkspaceName),
    deleteWorkspace: wrap(deleteWorkspace),
    updateWorkspaceRole: wrap(updateWorkspaceRole),
    createMailbox: wrap(createMailbox),
    getMailboxes: wrap(getMailboxes),
    deleteMailbox: wrap(deleteMailbox),
    ensurePerson: wrap(ensurePerson),

    /* READ OPERATIONS */
    getRegionInfo: wrap(getRegionInfo),
    getUserWorkspaces: wrap(getUserWorkspaces),
    getWorkspaceInfo: wrap(getWorkspaceInfo),
    getWorkspacesInfo: wrap(getWorkspacesInfo),
    getLoginInfoByToken: wrap(getLoginInfoByToken),
    getSocialIds: wrap(getSocialIds),
    getPerson: wrap(getPerson),
    getPersonInfo: wrap(getPersonInfo),
    findPersonBySocialKey: wrap(findPersonBySocialKey),
    findPersonBySocialId: wrap(findPersonBySocialId),
    findSocialIdBySocialKey: wrap(findSocialIdBySocialKey),
    getSocialIdBySocialKey: wrap(getSocialIdBySocialKey),
    getWorkspaceMembers: wrap(getWorkspaceMembers),
    getMailboxOptions: wrap(getMailboxOptions),
    getAccountInfo: wrap(getAccountInfo),

    /* SERVICE METHODS */
    ...getServiceMethods()
  }
}

export * from './plugin'
export * from './serviceOperations'
export default accountPlugin
