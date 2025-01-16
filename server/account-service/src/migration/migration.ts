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

import { AccountRole, SocialIdType, type SocialKey } from '@hcengineering/core'
import { type AccountDB, createAccount } from '@hcengineering/account'
import { getMongoAccountDB } from './utils'
import { type Account as OldAccount, type Workspace as OldWorkspace } from './types'

export async function migrateFromOldAccounts (oldAccsUrl: string, accountDB: AccountDB): Promise<void> {
  const migrationKey = 'migrate-from-old-accounts'
  // Check if old accounts exist
  const [oldAccountDb, closeOldDb] = await getMongoAccountDB(oldAccsUrl)

  try {
    const migration = await oldAccountDb.migration.findOne({ key: migrationKey })
    if (migration?.completed === true) {
      return
    }

    // Mapping between <ObjectId, UUID>
    const accountsIdToUuid: Record<string, string> = {}
    // Mapping between <email, UUID>
    const accountsEmailToUuid: Record<string, string> = {}
    // Mapping between <OldId, UUID>
    const workspacesIdToUuid: Record<string, string> = {}

    console.log('Migrating accounts database from old accounts')
    let accountsProcessed = 0
    const accountsCursor = oldAccountDb.account.findCursor({})
    while (await accountsCursor.hasNext()) {
      const account = await accountsCursor.next()
      if (account == null) {
        break
      }

      const accountUuid = await migrateAccount(account, accountDB)
      accountsIdToUuid[account._id] = accountUuid
      accountsEmailToUuid[account.email] = accountUuid

      accountsProcessed++
      if (accountsProcessed % 100 === 0) {
        console.log('Processed accounts: ', accountsProcessed)
      }
    }

    console.log('Total accounts processed: ', accountsProcessed)

    let processedWorkspaces = 0
    const workspacesCursor = oldAccountDb.workspace.findCursor({})
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
        console.log('Processed workspaces: ', processedWorkspaces)
      }
    }

    console.log('Total workspaces processed: ', processedWorkspaces)
    console.log('Total workspaces created/ensured: ', Object.values(workspacesIdToUuid).length)

    let invitesProcessed = 0
    const invitesCursor = oldAccountDb.invite.findCursor({})
    while (await invitesCursor.hasNext()) {
      const invite = await invitesCursor.next()
      if (invite == null) {
        break
      }

      const workspaceUuid = workspacesIdToUuid[invite.workspace.name]
      if (workspaceUuid === undefined) {
        console.log('No workspace with id', invite.workspace.name, ' found for invite ', invite._id)
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
        console.log('Processed invites: ', invitesProcessed)
      }
    }
    console.log('Total invites processed: ', invitesProcessed)
    await oldAccountDb.migration.insertOne({ key: migrationKey, completed: true })
    console.log('Migration of accounts database from old accounts COMPLETED')
  } finally {
    closeOldDb()
  }
}

async function migrateAccount (account: OldAccount, accountDB: AccountDB): Promise<string> {
  let primaryKey: SocialKey
  let secondaryKey: SocialKey | undefined

  if (account.githubId != null) {
    primaryKey = {
      type: SocialIdType.GITHUB,
      value: account.githubId
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

  let personUuid: string
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

    await createAccount(accountDB, personUuid, account.confirmed, account.createdOn)
    if (account.hash != null && account.salt != null) {
      await accountDB.account.updateOne({ uuid: personUuid }, { hash: account.hash, salt: account.salt })
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

  return personUuid
}

async function migrateWorkspace (workspace: OldWorkspace, accountDB: AccountDB, accountsIdToUuid: Record<string, string>, accountsEmailToUuid: Record<string, string>): Promise<string | undefined> {
  if (workspace.workspaceUrl == null) {
    console.log('No workspace url, skipping ', workspace.workspace)
    return
  }

  const createdBy = workspace.createdBy !== undefined ? accountsEmailToUuid[workspace.createdBy] : 'N/A'
  if (createdBy === undefined) {
    console.log('No account found for workspace ', workspace.workspace, ' created by ', workspace.createdBy)
    return
  }

  const existingWorkspace = await accountDB.workspace.findOne({ url: workspace.workspaceUrl })
  let workspaceUuid: string

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
  for (const member of workspace.accounts) {
    const accountUuid = accountsIdToUuid[member]

    if (accountUuid === undefined) {
      console.log('No account found for workspace ', workspace.workspace, ' member ', member)
      continue
    }

    if (existingMembers.has(accountUuid)) {
      continue
    }

    await accountDB.assignWorkspace(accountUuid, workspaceUuid, AccountRole.User) // TODO: SET ACTUAL USER ROLE
  }

  return workspaceUuid
}
