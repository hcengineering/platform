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
import {
  type AccountRole,
  type Data,
  isActiveMode,
  type MeasureContext,
  SocialIdType,
  type Version,
  type WorkspaceMode,
  type PersonInfo,
  type BackupStatus,
  type Branding,
  type PersonId,
  type PersonUuid,
  type WorkspaceUuid,
  type AccountUuid,
  readOnlyGuestAccountUuid
} from '@hcengineering/core'
import platform, { getMetadata, PlatformError, Severity, Status, unknownError } from '@hcengineering/platform'
import { decodeTokenVerbose } from '@hcengineering/server-token'

import { accountPlugin } from './plugin'
import type {
  AccountAggregatedInfo,
  AccountDB,
  AccountMethodHandler,
  Integration,
  IntegrationKey,
  IntegrationSecret,
  IntegrationSecretKey,
  Query,
  SocialId,
  Workspace,
  WorkspaceEvent,
  WorkspaceInfoWithStatus,
  WorkspaceOperation,
  WorkspaceStatus
} from './types'
import {
  integrationServices,
  findExistingIntegration,
  cleanEmail,
  getAccount,
  getEmailSocialId,
  getRegions,
  getRolePower,
  getSocialIdByKey,
  getWorkspaceById,
  getWorkspacesInfoWithStatusByIds,
  verifyAllowedServices,
  wrap,
  addSocialIdBase,
  getWorkspaces,
  updateWorkspaceRole,
  getPersonName,
  doMergeAccounts,
  doMergePersons,
  assignableRoles
} from './utils'

// Note: it is IMPORTANT to always destructure params passed here to avoid sending extra params
// to the database layer when searching/inserting as they may contain SQL injection
// !!! NEVER PASS "params" DIRECTLY in any DB functions !!!

// Move to config?
const processingTimeoutMs = 30 * 1000

export async function listWorkspaces (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    region?: string | null
    mode?: WorkspaceMode | null
  }
): Promise<WorkspaceInfoWithStatus[]> {
  const { region, mode } = params
  const { extra } = decodeTokenVerbose(ctx, token)

  if (!['tool', 'backup', 'admin', 'github'].includes(extra?.service) && extra?.admin !== 'true') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return await getWorkspaces(db, false, region, mode)
}

export async function listAccounts (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { search?: string, skip?: number, limit?: number }
): Promise<AccountAggregatedInfo[]> {
  const { extra } = decodeTokenVerbose(ctx, token)
  const isAdmin = extra?.admin === 'true'

  if (!isAdmin) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const { skip, limit, search } = params

  return await db.listAccounts(search, skip, limit)
}

export async function performWorkspaceOperation (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  parameters: {
    workspaceId: WorkspaceUuid | WorkspaceUuid[]
    event: 'archive' | 'migrate-to' | 'unarchive' | 'delete' | 'reset-attempts'
    params: any[]
  }
): Promise<boolean> {
  const { workspaceId, event, params } = parameters
  const { extra, workspace } = decodeTokenVerbose(ctx, token)

  if (extra?.admin !== 'true') {
    if (event !== 'unarchive' || workspaceId !== workspace) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
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
      case 'reset-attempts':
        update.processingAttempts = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'delete':
        if (workspace.status.mode !== 'active') {
          throw new PlatformError(unknownError('Delete allowed only for active workspaces'))
        }

        update.mode = 'pending-deletion'
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'archive':
        if (!isActiveMode(workspace.status.mode)) {
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
        update.targetRegion = params[0]
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      }
      default:
        break
    }

    if (Object.keys(update).length !== 0) {
      await db.workspaceStatus.update({ workspaceUuid: workspace.uuid }, update)
      ops++
    }
  }
  return ops > 0
}

export async function updateWorkspaceRoleBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    socialKey: string
    targetRole: AccountRole
  }
): Promise<void> {
  const { socialKey, targetRole } = params

  if (socialKey == null || socialKey === '' || targetRole == null || !assignableRoles.includes(targetRole)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['workspace', 'tool'], extra)

  const socialId = await getSocialIdByKey(db, socialKey.toLowerCase() as PersonId)
  if (socialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  await updateWorkspaceRole(ctx, db, branding, token, { targetAccount: socialId.personUuid as AccountUuid, targetRole })
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
  params: {
    region: string
    version: Data<Version>
    operation: WorkspaceOperation
  }
): Promise<WorkspaceInfoWithStatus | undefined> {
  const { region, version, operation } = params
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
      dataId: result.dataId,
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
  params: {
    workspaceUuid: WorkspaceUuid
    event: WorkspaceEvent
    version: Data<Version> // A worker version
    progress: number
    message?: string
  }
): Promise<void> {
  const { workspaceUuid, event, version, message } = params

  const { extra } = decodeTokenVerbose(ctx, token)
  if (!['workspace', 'tool'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (workspaceUuid == null || workspaceUuid === '' || event == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  let progress = params.progress

  const wsExists = await db.workspace.exists({ uuid: workspaceUuid })
  if (!wsExists) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }
  progress = Math.round(progress)

  const ts = Date.now()
  const update: Partial<WorkspaceStatus> = {}
  const wsUpdate: Partial<Workspace> = {}
  const query: Query<WorkspaceStatus> = { workspaceUuid }

  // Only read status for certain events because it is not needed for others
  // and it interferes with status updates when concurrency is high
  let wsStatus: WorkspaceStatus | null = null
  if (['create-started', 'upgrade-started', 'migrate-clean-done'].includes(event)) {
    wsStatus = await db.workspaceStatus.findOne({ workspaceUuid })
  }
  switch (event) {
    case 'create-started':
      update.mode = 'creating'
      if (wsStatus != null && wsStatus.mode !== 'creating') {
        update.processingAttempts = 0
      }
      update.processingProgress = progress
      break
    case 'upgrade-started':
      if (wsStatus != null && wsStatus.mode !== 'upgrading') {
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
      query.processingProgress = { $lte: progress }
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
      wsUpdate.region = wsStatus?.targetRegion ?? ''
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
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
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
      query.lastProcessingTime = { $lte: ts }
      break
  }

  if (message != null) {
    update.processingMessage = message
  }

  await db.workspaceStatus.update(query, {
    lastProcessingTime: ts, // Some operations override it.
    ...update
  })

  if (Object.keys(wsUpdate).length !== 0) {
    await db.workspace.update({ uuid: workspaceUuid }, wsUpdate)
  }
}

export async function workerHandshake (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    region: string
    version: Data<Version>
    operation: WorkspaceOperation
  }
): Promise<void> {
  const { region, version, operation } = params
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
  params: { backupInfo: BackupStatus }
): Promise<void> {
  const { backupInfo } = params
  const { extra, workspace } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'backup') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceInfo = await getWorkspaceById(db, workspace)
  if (workspaceInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  await db.workspaceStatus.update(
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
  params: {
    email: string
    workspaceUuid: WorkspaceUuid
    role: AccountRole
  }
): Promise<void> {
  const { email, workspaceUuid, role } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  if (!['aibot', 'tool', 'workspace'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (
    email == null ||
    email === '' ||
    workspaceUuid == null ||
    workspaceUuid === '' ||
    role == null ||
    !assignableRoles.includes(role)
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const normalizedEmail = cleanEmail(email)
  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  const account = await getAccount(db, emailSocialId.personUuid as AccountUuid)

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

export async function getPersonInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { account: PersonUuid }
): Promise<PersonInfo> {
  const { account } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['workspace', 'tool', 'gmail', 'huly-mail'], extra)

  if (account == null || account === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const person = await db.person.findOne({ uuid: account })

  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: account }))
  }

  const verifiedSocialIds = await db.socialId.find({ personUuid: account, verifiedOn: { $gt: 0 } })

  return {
    personUuid: account,
    name: getPersonName(person),
    socialIds: verifiedSocialIds
  }
}

export async function addSocialIdToPerson (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { person: PersonUuid, type: SocialIdType, value: string, confirmed: boolean, displayValue?: string }
): Promise<PersonId> {
  const { person, type, value, confirmed, displayValue } = params
  const { extra } = decodeTokenVerbose(ctx, token)

  verifyAllowedServices(
    ['github', 'telegram-bot', 'gmail', 'tool', 'workspace', 'hulygram', 'google-calendar', 'ai-assistant'],
    extra
  )

  if (person == null || person === '' || !Object.values(SocialIdType).includes(type) || value == null || value === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  return await addSocialIdBase(db, person, type, value, confirmed, displayValue)
}

export async function updateSocialId (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { personId: PersonId, displayValue: string }
): Promise<void> {
  const { personId, displayValue } = params
  const { extra } = decodeTokenVerbose(ctx, token)

  verifyAllowedServices(['telegram-bot', 'gmail'], extra)

  if (personId == null || personId === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const socialId = await db.socialId.findOne({ _id: personId })
  if (socialId != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.SocialIdNotFound, { _id: personId }))
  }

  await db.socialId.update({ _id: personId }, { displayValue })
}

export async function createIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Integration
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  // it checks params and throws BadRequest if params are invalid
  const existing = await findExistingIntegration(account, db, params, extra)
  if (existing != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationAlreadyExists, {}))
  }

  const { socialId, kind, workspaceUuid, data } = params
  const social = await db.socialId.findOne({ _id: socialId })

  if (social?.personUuid === readOnlyGuestAccountUuid) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await db.integration.insertOne({ socialId, kind, workspaceUuid, data })
}

export async function updateIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Integration
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  // it checks params and throws BadRequest if params are invalid
  const existing = await findExistingIntegration(account, db, params, extra)
  if (existing == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const { socialId, kind, workspaceUuid, data } = params
  await db.integration.update({ socialId, kind, workspaceUuid }, { data })
}

export async function deleteIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationKey
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  // it checks params and throws BadRequest if params are invalid
  const existing = await findExistingIntegration(account, db, params, extra)
  if (existing == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const { socialId, kind, workspaceUuid } = params
  await db.integrationSecret.deleteMany({ socialId, kind, workspaceUuid })
  await db.integration.deleteMany({ socialId, kind, workspaceUuid })
}

export async function listIntegrations (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Partial<IntegrationKey>
): Promise<Integration[]> {
  const { account, extra } = decodeTokenVerbose(ctx, token)
  const isAllowedService = verifyAllowedServices(integrationServices, extra, false)
  const { socialId, kind, workspaceUuid } = params
  let socialIds: PersonId[] | undefined

  if (isAllowedService) {
    socialIds = socialId != null ? [socialId] : undefined
  } else {
    const socialIdObjs = await db.socialId.find({ personUuid: account, verifiedOn: { $gt: 0 } })

    if (socialIdObjs.length === 0) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }

    const allowedSocialIds = socialIdObjs.map((it) => it._id)

    if (socialId !== undefined) {
      if (!allowedSocialIds.includes(socialId)) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      }

      socialIds = [socialId]
    } else {
      socialIds = allowedSocialIds
    }
  }

  return await db.integration.find({
    ...(socialIds != null ? { socialId: { $in: socialIds } } : {}),
    kind,
    workspaceUuid
  })
}

export async function getIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationKey
): Promise<Integration | null> {
  const { account, extra } = decodeTokenVerbose(ctx, token)
  const isAllowedService = verifyAllowedServices(integrationServices, extra, false)
  const { socialId, kind, workspaceUuid } = params

  if (kind == null || kind === '' || socialId == null || socialId === '' || workspaceUuid === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  if (!isAllowedService) {
    const existingSocialId = await db.socialId.findOne({ _id: socialId, personUuid: account, verifiedOn: { $gt: 0 } })

    if (existingSocialId == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  return await db.integration.findOne({ socialId, kind, workspaceUuid })
}

export async function addIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecret
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  const { socialId, kind, workspaceUuid, key, secret } = params
  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const existingIntegration = await findExistingIntegration(account, db, params, extra)
  if (existingIntegration == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const secretKey: IntegrationSecretKey = { socialId, kind, workspaceUuid, key }
  const existingSecret = await db.integrationSecret.findOne(secretKey)
  if (existingSecret != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretAlreadyExists, {}))
  }

  await db.integrationSecret.insertOne({ ...secretKey, secret })
}

export async function updateIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecret
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  const { socialId, kind, workspaceUuid, key, secret } = params
  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const existingIntegration = await findExistingIntegration(account, db, params, extra)
  if (existingIntegration == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const secretKey: IntegrationSecretKey = { socialId, kind, workspaceUuid, key }
  const existingSecret = await db.integrationSecret.findOne(secretKey)
  if (existingSecret == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
  }

  await db.integrationSecret.update(secretKey, { secret })
}

export async function deleteIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecretKey
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  const { socialId, kind, workspaceUuid, key } = params
  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const existingIntegration = await findExistingIntegration(account, db, params, extra)
  if (existingIntegration == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const secretKey: IntegrationSecretKey = { socialId, kind, workspaceUuid, key }
  const existingSecret = await db.integrationSecret.findOne(secretKey)
  if (existingSecret == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
  }

  await db.integrationSecret.deleteMany(secretKey)
}

export async function getIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecretKey
): Promise<IntegrationSecret | null> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(integrationServices, extra)
  const { socialId, kind, workspaceUuid, key } = params

  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }
  const existing = await db.integrationSecret.findOne({ socialId, kind, workspaceUuid, key })

  return existing
}

export async function listIntegrationsSecrets (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Partial<IntegrationSecretKey>
): Promise<IntegrationSecret[]> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(integrationServices, extra)
  const { socialId, kind, workspaceUuid, key } = params

  return await db.integrationSecret.find({ socialId, kind, workspaceUuid, key })
}

export async function findFullSocialIdBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialKey: string }
): Promise<SocialId | null> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['telegram-bot', 'gmail', 'tool', 'workspace', 'google-calendar'], extra)

  const { socialKey } = params

  if (socialKey == null || socialKey === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  return await db.socialId.findOne({ key: socialKey })
}

export async function findFullSocialIds (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialIds: PersonId[] }
): Promise<SocialId[]> {
  const { socialIds } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['gmail', 'tool', 'workspace', 'huly-mail'], extra)

  if (socialIds == null || socialIds.length === 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  return await db.socialId.find({ _id: { $in: socialIds } })
}

export async function mergeSpecifiedPersons (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    primaryPerson: PersonUuid
    secondaryPerson: PersonUuid
  }
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['tool', 'workspace'], extra)

  const { primaryPerson, secondaryPerson } = params
  if (primaryPerson == null || primaryPerson === '' || secondaryPerson == null || secondaryPerson === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  await doMergePersons(db, primaryPerson, secondaryPerson)
}

export async function mergeSpecifiedAccounts (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    primaryAccount: AccountUuid
    secondaryAccount: AccountUuid
  }
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['tool', 'workspace'], extra)

  const { primaryAccount, secondaryAccount } = params
  if (primaryAccount == null || primaryAccount === '' || secondaryAccount == null || secondaryAccount === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  await doMergeAccounts(db, primaryAccount, secondaryAccount)
}

export async function findPersonBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialString: string, requireAccount?: boolean }
): Promise<PersonUuid | undefined> {
  const { socialString } = params

  if (socialString == null || socialString === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const { extra } = decodeTokenVerbose(ctx, token)

  verifyAllowedServices(['tool', 'workspace', 'aibot', ...integrationServices], extra)

  const socialId = await db.socialId.findOne({ key: socialString })

  if (socialId == null) {
    return
  }

  if (params.requireAccount === true) {
    const account = await db.account.findOne({ uuid: socialId.personUuid as AccountUuid })

    return account?.uuid
  }

  return socialId.personUuid
}

export type AccountServiceMethods =
  | 'getPendingWorkspace'
  | 'updateWorkspaceInfo'
  | 'workerHandshake'
  | 'updateBackupInfo'
  | 'assignWorkspace'
  | 'listWorkspaces'
  | 'performWorkspaceOperation'
  | 'updateWorkspaceRoleBySocialKey'
  | 'addSocialIdToPerson'
  | 'updateSocialId'
  | 'getPersonInfo'
  | 'createIntegration'
  | 'updateIntegration'
  | 'deleteIntegration'
  | 'listIntegrations'
  | 'getIntegration'
  | 'addIntegrationSecret'
  | 'updateIntegrationSecret'
  | 'deleteIntegrationSecret'
  | 'getIntegrationSecret'
  | 'listIntegrationsSecrets'
  | 'findFullSocialIdBySocialKey'
  | 'mergeSpecifiedPersons'
  | 'mergeSpecifiedAccounts'
  | 'findPersonBySocialKey'
  | 'listAccounts'
  | 'findFullSocialIds'

/**
 * @public
 */
export function getServiceMethods (): Partial<Record<AccountServiceMethods, AccountMethodHandler>> {
  return {
    getPendingWorkspace: wrap(getPendingWorkspace),
    updateWorkspaceInfo: wrap(updateWorkspaceInfo),
    workerHandshake: wrap(workerHandshake),
    updateBackupInfo: wrap(updateBackupInfo),
    assignWorkspace: wrap(assignWorkspace),
    listWorkspaces: wrap(listWorkspaces),
    performWorkspaceOperation: wrap(performWorkspaceOperation),
    updateWorkspaceRoleBySocialKey: wrap(updateWorkspaceRoleBySocialKey),
    addSocialIdToPerson: wrap(addSocialIdToPerson),
    updateSocialId: wrap(updateSocialId),
    getPersonInfo: wrap(getPersonInfo),
    createIntegration: wrap(createIntegration),
    updateIntegration: wrap(updateIntegration),
    deleteIntegration: wrap(deleteIntegration),
    listIntegrations: wrap(listIntegrations),
    getIntegration: wrap(getIntegration),
    addIntegrationSecret: wrap(addIntegrationSecret),
    updateIntegrationSecret: wrap(updateIntegrationSecret),
    deleteIntegrationSecret: wrap(deleteIntegrationSecret),
    getIntegrationSecret: wrap(getIntegrationSecret),
    listIntegrationsSecrets: wrap(listIntegrationsSecrets),
    findFullSocialIdBySocialKey: wrap(findFullSocialIdBySocialKey),
    findFullSocialIds: wrap(findFullSocialIds),
    mergeSpecifiedPersons: wrap(mergeSpecifiedPersons),
    mergeSpecifiedAccounts: wrap(mergeSpecifiedAccounts),
    findPersonBySocialKey: wrap(findPersonBySocialKey),
    listAccounts: wrap(listAccounts)
  }
}
