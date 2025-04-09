//
// Copyright © 2025 Hardcore Engineering Inc.
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

import {
  AccountRole,
  type PersonUuid,
  SocialIdType,
  type WorkspaceDataId,
  type WorkspaceUuid,
  type SocialKey,
  type AccountUuid
} from '@hcengineering/core'
import { type AccountDB, createAccount } from '@hcengineering/account'
import { getMongoAccountDB } from './utils'
import { type Account as OldAccount, type Workspace as OldWorkspace } from './types'
import { type MongoAccountDB } from './collections/mongo'

async function shouldMigrate (
  oldAccountDb: MongoAccountDB,
  migrationKey: string
): Promise<{ completed: boolean, exists: boolean }> {
  while (true) {
    const migration = await oldAccountDb.migration.findOne({ key: migrationKey })
    if (migration?.completed === true) {
      return { completed: true, exists: true }
    }

    if (migration == null) {
      return { completed: false, exists: false }
    }

    if (migration.lastProcessedTime === undefined || Date.now() - migration.lastProcessedTime > 1000 * 15) {
      return { completed: false, exists: true }
    }

    console.log('Migration of accounts database from old accounts is still in progress, waiting...')
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

export async function migrateFromOldAccounts (oldAccsUrl: string, accountDB: AccountDB): Promise<void> {
  const migrationKey = 'migrate-from-old-accounts'
  // Check if old accounts exist
  const [oldAccountDb, closeOldDb] = await getMongoAccountDB(oldAccsUrl)
  let processingHandle

  try {
    const { completed, exists } = await shouldMigrate(oldAccountDb, migrationKey)
    if (completed) {
      return
    }

    if (!exists) {
      await oldAccountDb.migration.insertOne({ key: migrationKey, completed: false, lastProcessedTime: Date.now() })
    } else {
      await oldAccountDb.migration.updateOne({ key: migrationKey }, { completed: false, lastProcessedTime: Date.now() })
    }

    processingHandle = setInterval(() => {
      void oldAccountDb.migration.updateOne({ key: migrationKey }, { lastProcessedTime: Date.now() })
    }, 1000 * 5)

    // Mapping between <ObjectId, UUID>
    const accountsIdToUuid: Record<string, AccountUuid> = {}
    // Mapping between <email, UUID>
    const accountsEmailToUuid: Record<string, AccountUuid> = {}
    // Mapping between <OldId, UUID>
    const workspacesIdToUuid: Record<WorkspaceDataId, WorkspaceUuid> = {}

    console.log('Migrating accounts database from old accounts')
    let accountsProcessed = 0
    const accountsCursor = oldAccountDb.account.findCursor({})
    try {
      while (await accountsCursor.hasNext()) {
        const account = await accountsCursor.next()
        if (account == null) {
          break
        }

        const accountUuid = await migrateAccount(account, accountDB)
        if (accountUuid == null) {
          console.log('Account not migrated', account)
          continue
        }
        accountsIdToUuid[account._id.toString()] = accountUuid
        accountsEmailToUuid[account.email] = accountUuid

        accountsProcessed++
        if (accountsProcessed % 100 === 0) {
          console.log('Processed accounts:', accountsProcessed)
        }
      }
    } finally {
      await accountsCursor.close()
    }

    console.log('Total accounts processed:', accountsProcessed)

    let processedWorkspaces = 0
    const workspacesCursor = oldAccountDb.workspace.findCursor({})
    try {
      while (await workspacesCursor.hasNext()) {
        const workspace = await workspacesCursor.next()
        if (workspace == null) {
          break
        }

        const workspaceUuid = await migrateWorkspace(workspace, accountDB, accountsIdToUuid, accountsEmailToUuid)

        if (workspaceUuid !== undefined) {
          workspacesIdToUuid[workspace.workspace] = workspaceUuid
        }
        processedWorkspaces++
        if (processedWorkspaces % 100 === 0) {
          console.log('Processed workspaces:', processedWorkspaces)
        }
      }
    } finally {
      await workspacesCursor.close()
    }

    console.log('Total workspaces processed:', processedWorkspaces)
    console.log('Total workspaces created/ensured:', Object.values(workspacesIdToUuid).length)

    let invitesProcessed = 0
    const invitesCursor = oldAccountDb.invite.findCursor({})
    try {
      while (await invitesCursor.hasNext()) {
        const invite = await invitesCursor.next()
        if (invite == null) {
          break
        }

        const workspaceUuid = workspacesIdToUuid[invite.workspace.name]
        if (workspaceUuid === undefined) {
          console.log('No workspace with id', invite.workspace.name, 'found for invite', invite._id)
          continue
        }

        await accountDB.invite.insertOne({
          migratedFrom: invite._id.toString(),
          workspaceUuid,
          expiresOn: invite.exp,
          emailPattern: invite.emailMask,
          remainingUses: invite.limit,
          role: invite.role ?? AccountRole.User
        })

        invitesProcessed++
        if (invitesProcessed % 100 === 0) {
          console.log('Processed invites:', invitesProcessed)
        }
      }
    } finally {
      await invitesCursor.close()
    }

    console.log('Total invites processed:', invitesProcessed)
    await oldAccountDb.migration.updateOne({ key: migrationKey }, { completed: true })
    console.log('Migration of accounts database from old accounts COMPLETED')
  } finally {
    if (processingHandle !== undefined) {
      clearTimeout(processingHandle)
    }
    closeOldDb()
  }
}

async function migrateAccount (account: OldAccount, accountDB: AccountDB): Promise<AccountUuid | undefined> {
  let primaryKey: SocialKey
  let secondaryKey: SocialKey | undefined

  if (account.githubId != null) {
    if (account.githubUser == null) {
      console.log('No github user found for github id', account.githubId)
      return
    }

    primaryKey = {
      type: SocialIdType.GITHUB,
      value: account.githubUser
    }
    secondaryKey = !account.email.startsWith('github:')
      ? {
          type: SocialIdType.EMAIL,
          value: account.email
        }
      : undefined
  } else if (account.openId != null) {
    primaryKey = {
      type: SocialIdType.OIDC,
      value: account.openId
    }
    secondaryKey = !account.email.startsWith('openid:')
      ? {
          type: SocialIdType.EMAIL,
          value: account.email
        }
      : undefined
  } else {
    primaryKey = {
      type: SocialIdType.EMAIL,
      value: account.email
    }
  }

  let personUuid: PersonUuid
  const verified = account.confirmed === true ? { verifiedOn: Date.now() } : {}

  const existing = await accountDB.socialId.findOne(primaryKey)
  if (existing == null) {
    // Create new global person
    personUuid = await accountDB.person.insertOne({
      firstName: account.first,
      lastName: account.last
    })

    await accountDB.socialId.insertOne({
      ...primaryKey,
      personUuid,
      ...verified
    })

    await createAccount(accountDB, personUuid, account.confirmed, false, account.createdOn)
    if (account.hash != null && account.salt != null) {
      await accountDB.account.updateOne({ uuid: personUuid as AccountUuid }, { hash: account.hash, salt: account.salt })
    }
  } else {
    personUuid = existing.personUuid
  }

  if (secondaryKey != null) {
    const existingSecondary = await accountDB.socialId.findOne(secondaryKey)
    if (existingSecondary == null) {
      await accountDB.socialId.insertOne({
        ...secondaryKey,
        personUuid,
        ...verified
      })
    }
  }

  return personUuid as AccountUuid
}

async function migrateWorkspace (
  workspace: OldWorkspace,
  accountDB: AccountDB,
  accountsIdToUuid: Record<string, AccountUuid>,
  accountsEmailToUuid: Record<string, AccountUuid>
): Promise<WorkspaceUuid | undefined> {
  if (workspace.workspaceUrl == null) {
    console.log('No workspace url, skipping', workspace.workspace)
    return
  }

  const createdBy =
    workspace.createdBy !== undefined ? accountsEmailToUuid[workspace.createdBy] : ('N/A' as AccountUuid)
  if (createdBy === undefined) {
    console.log('No account found for workspace', workspace.workspace, 'created by', workspace.createdBy)
    return
  }

  const existingWorkspace = await accountDB.workspace.findOne({ url: workspace.workspaceUrl })
  let workspaceUuid: WorkspaceUuid

  if (existingWorkspace == null) {
    workspaceUuid = await accountDB.workspace.insertOne({
      uuid: workspace.uuid,
      name: workspace.workspaceName,
      url: workspace.workspaceUrl,
      dataId: workspace.workspace,
      branding: workspace.branding,
      region: workspace.region,
      createdBy,
      billingAccount: createdBy,
      createdOn: workspace.createdOn
    })
  } else {
    workspaceUuid = existingWorkspace.uuid
  }

  const existingStatus = await accountDB.workspaceStatus.findOne({ workspaceUuid })

  if (existingStatus == null) {
    await accountDB.workspaceStatus.insertOne({
      workspaceUuid,
      mode: workspace.mode,
      processingProgress: workspace.progress,
      versionMajor: workspace.version?.major,
      versionMinor: workspace.version?.minor,
      versionPatch: workspace.version?.patch,
      lastProcessingTime: workspace.lastProcessingTime,
      lastVisit: workspace.lastVisit,
      isDisabled: workspace.disabled,
      processingAttempts: workspace.attempts,
      processingMessage: workspace.message,
      backupInfo: workspace.backupInfo
    })
  }

  const existingMembers = new Set((await accountDB.getWorkspaceMembers(workspaceUuid)).map((mi) => mi.person))
  for (const member of (workspace.accounts ?? []).map((it) => it.toString())) {
    const accountUuid = accountsIdToUuid[member]

    if (accountUuid === undefined) {
      console.log('No account found for workspace', workspace.workspace, 'member', member)
      continue
    }

    if (existingMembers.has(accountUuid)) {
      continue
    }

    // Actual roles are being set in workspace migration
    await accountDB.assignWorkspace(accountUuid, workspaceUuid, AccountRole.Guest)
  }

  return workspaceUuid
}
