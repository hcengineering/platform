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
  concatLink,
  Data,
  isWorkspaceCreating,
  MeasureContext,
  systemAccountUuid,
  Version,
  SocialIdType,
  type BackupStatus,
  type Branding,
  AccountRole,
  type Person,
  type WorkspaceMemberInfo,
  PersonUuid,
  isActiveMode
} from '@hcengineering/core'
import platform, {
  getMetadata,
  PlatformError,
  Severity,
  Status,
  translate,
  unknownError
} from '@hcengineering/platform'
import { decodeTokenVerbose, generateToken } from '@hcengineering/server-token'

import { accountPlugin } from './plugin'
import type {
  AccountDB,
  LoginInfo,
  OtpInfo,
  RegionInfo,
  WorkspaceEvent,
  WorkspaceOperation,
  AccountMethodHandler,
  WorkspaceLoginInfo,
  WorkspaceInfoWithStatus,
  WorkspaceStatus,
  SocialId,
  Workspace
} from './types'
import {
  cleanEmail,
  EndpointKind,
  getEndpoint,
  getRegions,
  verifyPassword,
  isOtpValid,
  createAccount,
  sendOtp,
  setPassword,
  wrap,
  createWorkspaceRecord,
  checkInvite,
  GUEST_ACCOUNT,
  getWorkspaceById,
  getWorkspaceInvite,
  getRolePower,
  sendEmailConfirmation,
  getEmailSocialId,
  confirmEmail,
  getAccount,
  getSesUrl,
  getFrontUrl,
  getWorkspaceInfoWithStatusById,
  signUpByEmail,
  selectWorkspace,
  doJoinByInvite,
  getWorkspacesInfoWithStatusByIds,
  getSocialIdByKey
} from './utils'

// Move to config?
const processingTimeoutMs = 30 * 1000

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
  email: string,
  password: string
): Promise<LoginInfo> {
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

    if (!verifyPassword(password, existingAccount.hash, existingAccount.salt)) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
    }

    const isConfirmed = emailSocialId.verifiedOn != null

    ctx.info('Login succeeded', { email, normalizedEmail, isConfirmed, emailSocialId })

    return {
      account: existingAccount.uuid,
      token: isConfirmed ? generateToken(existingAccount.uuid) : undefined
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
  email: string
): Promise<OtpInfo> {
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
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<LoginInfo> {
  const account = await signUpByEmail(ctx, db, branding, email, password, firstName, lastName)

  const sesURL = getMetadata(accountPlugin.metadata.SES_URL)
  const forceConfirmation = sesURL !== undefined && sesURL !== ''
  if (forceConfirmation) {
    const normalizedEmail = cleanEmail(email)

    await sendEmailConfirmation(ctx, branding, account, normalizedEmail)
  } else {
    ctx.warn('Please provide SES_URL to enable sign up email confirmations.')
    await confirmEmail(ctx, db, account, email)
  }

  return {
    account,
    token: !forceConfirmation ? generateToken(account) : undefined
  }
}

export async function signUpOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string,
  firstName: string,
  lastName: string
): Promise<OtpInfo> {
  // Note: can support OTP based on any other social logins later
  const normalizedEmail = cleanEmail(email)
  let emailSocialId = await getEmailSocialId(db, normalizedEmail)
  let personUuid: string

  if (emailSocialId !== null) {
    const existingAccount = await db.account.findOne({ uuid: emailSocialId.personUuid })

    if (existingAccount !== null) {
      ctx.error('An account with the provided email already exists', { email })
      throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {}))
    }

    personUuid = emailSocialId.personUuid
  } else {
    // There's no person linked to this email, so we need to create a new one
    personUuid = await db.person.insertOne({ firstName, lastName })
    const newSocialId = { type: SocialIdType.EMAIL, value: normalizedEmail, personUuid }
    const emailSocialIdId = await db.socialId.insertOne(newSocialId)
    emailSocialId = { ...newSocialId, id: emailSocialIdId }
  }

  return await sendOtp(ctx, db, branding, emailSocialId)
}

export async function validateOtp (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string,
  code: string
): Promise<LoginInfo> {
  // Note: can support OTP based on any other social logins later
  const normalizedEmail = cleanEmail(email)
  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: email }))
  }

  const isValid = await isOtpValid(db, emailSocialId.id, code)

  if (!isValid) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InvalidOtp, {}))
  }

  await db.otp.deleteMany({ socialId: emailSocialId.id })

  if (emailSocialId.verifiedOn == null) {
    await db.socialId.updateOne({ id: emailSocialId.id }, { verifiedOn: Date.now() })
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

  return {
    account: emailSocialId.personUuid,
    token: generateToken(emailSocialId.personUuid)
  }
}

export async function createWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  workspaceName: string,
  region?: string
): Promise<WorkspaceLoginInfo> {
  const { account } = decodeTokenVerbose(ctx, token)

  ctx.info('Creating workspace record', { workspaceName, account, region })

  // Any confirmed social ID will do
  const socialId = await db.socialId.findOne({ personUuid: account, verifiedOn: { $gt: 0 } })

  if (socialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotConfirmed, {}))
  }

  const { workspaceUuid, workspaceUrl } = await createWorkspaceRecord(ctx, db, branding, workspaceName, account, region)

  await db.assignWorkspace(account, workspaceUuid, AccountRole.Owner)

  ctx.info('Creating workspace record done', { workspaceName, region, account: socialId.personUuid })

  return {
    account,
    token: generateToken(account, workspaceUuid),
    endpoint: getEndpoint(ctx, workspaceUuid, region, EndpointKind.External),
    workspace: workspaceUuid,
    workspaceUrl,
    role: AccountRole.Owner
  }
}

export async function createInviteLink (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  exp: number,
  emailMask: string,
  limit: number,
  role?: AccountRole
): Promise<string> {
  const { account, workspace: workspaceUuid } = decodeTokenVerbose(ctx, token)

  const currentAccount = await db.account.findOne({ uuid: account })
  if (currentAccount == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account }))
  }

  const workspace = await db.workspace.findOne({ uuid: workspaceUuid })
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  ctx.info('Creating invite link', { workspace, workspaceName: workspace.name, emailMask, limit })

  return await db.invite.insertOne({
    workspaceUuid,
    expiresOn: exp < 0 ? -1 : Date.now() + exp,
    emailPattern: emailMask,
    remainingUses: limit,
    role
  })
}

export async function sendInvite (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  email: string,
  role?: AccountRole
): Promise<void> {
  const { account, workspace: workspaceUuid } = decodeTokenVerbose(ctx, token)

  const currentAccount = await db.account.findOne({ uuid: account })
  if (currentAccount == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account }))
  }

  const workspace = await db.workspace.findOne({ uuid: workspaceUuid })
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const sesURL = getSesUrl()
  const front = getFrontUrl(branding)
  const expHours = 48
  const exp = expHours * 60 * 60 * 1000

  const inviteId = await createInviteLink(ctx, db, branding, token, exp, email, 1, role)
  const link = concatLink(front, `/login/join?inviteId=${inviteId}`)

  const ws = workspace.name !== '' ? workspace.name : 'workspace'
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

  ctx.info('Invite has been sent', { email, workspace, workspaceName: workspace.name, link })
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
  email: string,
  password: string,
  inviteId: string
): Promise<WorkspaceLoginInfo | LoginInfo> {
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

  const { token, account } = await login(ctx, db, branding, normalizedEmail, password)

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
  inviteId: string
): Promise<WorkspaceLoginInfo> {
  const { account: accountUuid } = decodeTokenVerbose(ctx, token)

  const invite = await getWorkspaceInvite(db, inviteId)
  if (invite == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

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

  const wsLoginInfo = await selectWorkspace(ctx, db, branding, token, workspace.url, 'external')

  if (getRolePower(wsLoginInfo.role) < getRolePower(invite.role)) {
    await db.updateWorkspaceRole(accountUuid, workspaceUuid, invite.role)
  }

  return {
    ...wsLoginInfo,
    role: invite.role
  }
}

/**
 * Given an invite and sign up information, creates an account and assigns it to the workspace.
 */
export async function signUpJoin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string,
  password: string,
  first: string,
  last: string,
  inviteId: string
): Promise<WorkspaceLoginInfo> {
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

  const account = await signUpByEmail(ctx, db, branding, email, password, first, last, true)

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

  await confirmEmail(ctx, db, account, email)

  const result = {
    account,
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
  oldPassword: string,
  password: string
): Promise<void> {
  const { account: accountUuid } = decodeTokenVerbose(ctx, token)

  ctx.info('Changing password', { accountUuid })

  const account = await getAccount(db, accountUuid)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: accountUuid }))
  }

  if (!verifyPassword(oldPassword, account.hash, account.salt)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await setPassword(ctx, db, branding, accountUuid, password)

  ctx.info('Password changed', { accountUuid })
}

export async function requestPasswordReset (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  email: string
): Promise<void> {
  const normalizedEmail = cleanEmail(email)

  ctx.info('Requesting password reset', { email, normalizedEmail })

  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    ctx.error('Email social id not found', { email, normalizedEmail })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.SocialIdNotFound, { socialId: email, type: SocialIdType.EMAIL })
    )
  }

  const account = await getAccount(db, emailSocialId.personUuid)

  if (account == null) {
    ctx.info('Account not found', { email, normalizedEmail })
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.AccountNotFound, { account: emailSocialId.personUuid })
    )
  }

  const sesURL = getSesUrl()
  const front = getFrontUrl(branding)

  const token = generateToken(account.uuid, '', {
    restoreEmail: normalizedEmail
  })

  const link = concatLink(front, `/login/recovery?id=${token}`)
  const lang = branding?.language
  const text = await translate(accountPlugin.string.RecoveryText, { link }, lang)
  const html = await translate(accountPlugin.string.RecoveryHTML, { link }, lang)
  const subject = await translate(accountPlugin.string.RecoverySubject, {}, lang)

  await fetch(concatLink(sesURL, '/send'), {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      html,
      subject,
      to: normalizedEmail
    })
  })

  ctx.info('Password reset email sent', { email, normalizedEmail, account: account.uuid })
}

export async function restorePassword (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  password: string
): Promise<LoginInfo> {
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
      new Status(Severity.ERROR, platform.status.SocialIdNotFound, { socialId: email, type: SocialIdType.EMAIL })
    )
  }

  await setPassword(ctx, db, branding, account, password)

  if (emailSocialId.verifiedOn == null) {
    await db.socialId.updateOne({ id: emailSocialId.id }, { verifiedOn: Date.now() })
  }

  return await login(ctx, db, branding, email, password)
}

export async function leaveWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  targetAccount: string
): Promise<LoginInfo | null> {
  const { account, workspace } = decodeTokenVerbose(ctx, token)
  ctx.info('Removing account from workspace', { targetAccount, workspace })

  if (targetAccount == null || workspace == null) {
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
    return {
      account,
      token: generateToken(account, '')
    }
  }

  return null
}

export async function changeUsername (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  first: string,
  last: string
): Promise<void> {
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
  name: string
): Promise<void> {
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
  branding: Branding | null
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

export async function getWorkspaceInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  updateLastVisit: boolean = false
): Promise<WorkspaceInfoWithStatus> {
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

export async function listWorkspaces (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  region?: string | null,
  includeDisabled: boolean = false
): Promise<WorkspaceInfoWithStatus[]> {
  const { extra } = decodeTokenVerbose(ctx, token)

  if (!['tool', 'backup', 'admin'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const statuses = await db.workspaceStatus.find({})
  const statusesMap = statuses.reduce<Record<string, WorkspaceStatus>>((sm, s) => {
    sm[s.workspaceUuid] = s
    return sm
  }, {})

  let workspaces = await db.workspace.find(region != null ? { region } : {})

  if (!includeDisabled) {
    workspaces = workspaces.filter((it) => !statusesMap[it.uuid].isDisabled)
  }

  return workspaces.map((it) => ({
    ...it,
    status: statusesMap[it.uuid]
  }))
}

export async function performWorkspaceOperation (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  workspaceId: string | string[],
  event: 'archive' | 'migrate-to' | 'unarchive' | 'delete',
  ...params: any
): Promise<boolean> {
  const { extra } = decodeTokenVerbose(ctx, token)

  if (extra?.service !== 'admin') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceUuids = Array.isArray(workspaceId) ? workspaceId : [workspaceId]

  const workspaces = await getWorkspacesInfoWithStatusByIds(db, workspaceUuids)
  if (workspaces.length === 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, {}))
  }

  let ops = 0
  for (const workspace of workspaces) {
    const update: Partial<WorkspaceStatus> = {}
    switch (event) {
      case 'delete':
        if (workspaceInfo.mode !== 'active') {
          throw new PlatformError(unknownError('Archive allowed only for active workspaces'))
        }

        update.mode = 'pending-deletion'
        update.attempts = 0
        update.progress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'archive':
        if (isActiveMode(workspace.status.mode)) {
          throw new PlatformError(unknownError('Archiving allowed only for active workspaces'))
        }

        update.mode = 'archiving-pending-backup'
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'unarchive':
        if (event === 'unarchive') {
          if (workspace.status.mode !== 'archived') {
            throw new PlatformError(unknownError('Unarchive allowed only for archived workspaces'))
          }
        }

        update.mode = 'pending-restore'
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'migrate-to': {
        if (!isActiveMode(workspace.status.mode)) {
          return false
        }
        if (params.length !== 1 && params[0] == null) {
          throw new PlatformError(unknownError('Invalid region passed to migrate operation'))
        }
        const regions = getRegions()
        if (regions.find((it) => it.region === params[0]) === undefined) {
          throw new PlatformError(unknownError('Invalid region passed to migrate operation'))
        }
        if ((workspace.region ?? '') === params[0]) {
          throw new PlatformError(unknownError('Invalid region passed to migrate operation'))
        }

        update.mode = 'migration-pending-backup'
        // NOTE: will only work for Mongo accounts
        ;(update as any).targetRegion = params[0]
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      }
      default:
        break
    }

    if (Object.keys(update).length !== 0) {
      await db.workspaceStatus.updateOne({ workspaceUuid: workspace.uuid }, update)
      ops++
    }
  }
  return ops > 0
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
  let accountUuid: string
  let workspaceUuid: string
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

  if (!isDocGuest && !isSystem) {
    // Any confirmed social ID will do
    const socialId = await db.socialId.findOne({ personUuid: accountUuid, verifiedOn: { $gt: 0 } })

    if (socialId == null) {
      return {
        account: accountUuid
      }
    }
  }

  const loginInfo = {
    account: accountUuid,
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

    const role = isSystem ? AccountRole.Owner : await db.getWorkspaceRole(accountUuid, workspace.uuid)

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
  confirmed: boolean = true
): Promise<SocialId[]> {
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

export async function findPerson (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  socialString: string
): Promise<PersonUuid | undefined> {
  decodeTokenVerbose(ctx, token)

  const socialId = await db.socialId.findOne({ key: socialString })

  if (socialId == null) {
    return
  }

  return socialId.personUuid
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

  const accRole = await db.getWorkspaceRole(account, workspace)

  if (accRole == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return await db.getWorkspaceMembers(workspace)
}

export async function updateWorkspaceRoleBySocialId (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  socialKey: string,
  targetRole: AccountRole
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)

  if (!['workspace', 'tool'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const socialId = await getSocialIdByKey(db, socialKey.toLowerCase())
  if (socialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  await updateWorkspaceRole(ctx, db, branding, token, socialId.personUuid, targetRole)
}

export async function updateWorkspaceRole (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  targetAccount: string,
  targetRole: AccountRole
): Promise<void> {
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

/* =================================== */
/* ===WORKSPACE SERVICE OPERATIONS==== */
/* =================================== */

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
): Promise<WorkspaceInfoWithStatus | undefined> {
  const { extra } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'workspace') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const wsLivenessDays = getMetadata(accountPlugin.metadata.WsLivenessDays)
  const wsLivenessMs = wsLivenessDays !== undefined ? wsLivenessDays * 24 * 60 * 60 * 1000 : undefined

  const result = await db.getPendingWorkspace(region, version, operation, processingTimeoutMs, wsLivenessMs)

  if (result != null) {
    ctx.info('getPendingWorkspace', {
      workspaceId: result.uuid,
      workspaceName: result.name,
      mode: result.status.mode,
      operation,
      region,
      major: result.status.versionMajor,
      minor: result.status.versionMinor,
      patch: result.status.versionPatch,
      requestedVersion: version
    })
  }

  return result
}

export async function updateWorkspaceInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  workspaceUuid: string,
  event: WorkspaceEvent,
  version: Data<Version>, // A worker version
  progress: number,
  message?: string
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)
  if (!['workspace', 'tool'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspace = await getWorkspaceInfoWithStatusById(db, workspaceUuid)
  if (workspace === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }
  progress = Math.round(progress)

  const update: Partial<WorkspaceStatus> = {}
  const wsUpdate: Partial<Workspace> = {}
  switch (event) {
    case 'create-started':
      update.mode = 'creating'
      if (workspace.status.mode !== 'creating') {
        update.processingAttempts = 0
      }
      update.processingProgress = progress
      break
    case 'upgrade-started':
      if (workspace.status.mode !== 'upgrading') {
        update.processingAttempts = 0
      }
      update.mode = 'upgrading'
      update.processingProgress = progress
      break
    case 'create-done':
      ctx.info('Updating workspace info on create-done', { workspaceUuid, event, version, progress })
      update.mode = 'active'
      update.isDisabled = false
      update.versionMajor = version.major
      update.versionMinor = version.minor
      update.versionPatch = version.patch
      update.processingProgress = progress
      break
    case 'upgrade-done':
      ctx.info('Updating workspace info on upgrade-done', { workspaceUuid, event, version, progress })
      update.mode = 'active'
      update.versionMajor = version.major
      update.versionMinor = version.minor
      update.versionPatch = version.patch
      update.processingProgress = progress
      break
    case 'progress':
      update.processingProgress = progress
      break
    case 'migrate-backup-started':
      update.mode = 'migration-backup'
      update.processingProgress = progress
      break
    case 'migrate-backup-done':
      update.mode = 'migration-pending-clean'
      update.processingProgress = progress
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
      break
    case 'migrate-clean-started':
      update.mode = 'migration-clean'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'migrate-clean-done':
      wsUpdate.region = (workspace as any).targetRegion ?? ''
      update.mode = 'pending-restore'
      update.processingProgress = progress
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
      break
    case 'restore-started':
      update.mode = 'restoring'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'restore-done':
      update.mode = 'active'
      update.processingProgress = 100
      break
    case 'archiving-backup-started':
      update.mode = 'archiving-backup'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'archiving-backup-done':
      update.mode = 'archiving-pending-clean'
      update.processingProgress = progress
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
      break
    case 'archiving-clean-started':
      update.mode = 'archiving-clean'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'archiving-clean-done':
      update.mode = 'archived'
      update.processingProgress = 100
      break
    case 'ping':
    default:
      break
  }

  if (message != null) {
    update.processingMessage = message
  }

  await db.workspaceStatus.updateOne(
    { workspaceUuid: workspace.uuid },
    {
      ...update,
      lastProcessingTime: Date.now()
    }
  )

  if (Object.keys(wsUpdate).length !== 0) {
    await db.workspace.updateOne({ uuid: workspace.uuid }, wsUpdate)
  }
}

export async function workerHandshake (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  region: string, // A worker region
  version: Data<Version>, // A worker version
  operation: WorkspaceOperation
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'workspace') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  ctx.info('Worker handshake happened', { region, version, operation })
  // Nothing else to do now but keeping to have track of workers in logs
}

export async function updateBackupInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  backupInfo: BackupStatus
): Promise<void> {
  const { extra, workspace } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'backup') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceInfo = await getWorkspaceById(db, workspace)
  if (workspaceInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  await db.workspaceStatus.updateOne(
    { workspaceUuid: workspace },
    {
      backupInfo,
      lastProcessingTime: Date.now()
    }
  )
}

export async function assignWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  email: string,
  workspaceUuid: string,
  role: AccountRole
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)
  if (!['aibot', 'tool', 'workspace'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const normalizedEmail = cleanEmail(email)
  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  const account = await getAccount(db, emailSocialId.personUuid)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  const workspace = await getWorkspaceById(db, workspaceUuid)

  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const currentRole = await db.getWorkspaceRole(account.uuid, workspaceUuid)

  if (currentRole == null) {
    await db.assignWorkspace(account.uuid, workspaceUuid, role)
  } else if (getRolePower(currentRole) < getRolePower(role)) {
    await db.updateWorkspaceRole(account.uuid, workspaceUuid, role)
  }
}

export type AccountMethods =
  | 'login'
  | 'loginOtp'
  | 'signUp'
  | 'signUpOTP'
  | 'validateOtp'
  | 'createWorkspace'
  | 'createInviteLink'
  | 'sendInvite'
  | 'selectWorkspace'
  | 'join'
  | 'checkJoin'
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
  | 'listWorkspaces'
  | 'getLoginInfoByToken'
  | 'getSocialIds'
  | 'getPendingWorkspace'
  | 'updateWorkspaceInfo'
  | 'workerHandshake'
  | 'updateBackupInfo'
  | 'assignWorkspace'
  | 'getPerson'
  | 'getWorkspaceMembers'
  | 'updateWorkspaceRole'
  | 'findPerson'
  | 'performWorkspaceOperation'
  | 'updateWorkspaceRoleBySocialId'

/**
 * @public
 */
export function getMethods (hasSignUp: boolean = true): Partial<Record<AccountMethods, AccountMethodHandler>> {
  return {
    /* OPERATIONS */
    login: wrap(login),
    loginOtp: wrap(loginOtp),
    ...(hasSignUp ? { signUp: wrap(signUp) } : {}),
    ...(hasSignUp ? { signUpOTP: wrap(signUpOtp) } : {}),
    validateOtp: wrap(validateOtp),
    createWorkspace: wrap(createWorkspace),
    createInviteLink: wrap(createInviteLink),
    sendInvite: wrap(sendInvite),
    selectWorkspace: wrap(selectWorkspace),
    join: wrap(join),
    checkJoin: wrap(checkJoin),
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

    /* READ OPERATIONS */
    getRegionInfo: wrap(getRegionInfo),
    getUserWorkspaces: wrap(getUserWorkspaces),
    getWorkspaceInfo: wrap(getWorkspaceInfo),
    getLoginInfoByToken: wrap(getLoginInfoByToken),
    getSocialIds: wrap(getSocialIds),
    getPerson: wrap(getPerson),
    findPerson: wrap(findPerson),
    getWorkspaceMembers: wrap(getWorkspaceMembers),

    /* SERVICE METHODS */
    getPendingWorkspace: wrap(getPendingWorkspace),
    updateWorkspaceInfo: wrap(updateWorkspaceInfo),
    workerHandshake: wrap(workerHandshake),
    updateBackupInfo: wrap(updateBackupInfo),
    assignWorkspace: wrap(assignWorkspace),
    listWorkspaces: wrap(listWorkspaces),
    performWorkspaceOperation: wrap(performWorkspaceOperation),
    updateWorkspaceRoleBySocialId: wrap(updateWorkspaceRoleBySocialId)
  }
}

export * from './plugin'
export default accountPlugin
