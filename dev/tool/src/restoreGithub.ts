import { type IntegrationKind, type PersonId, type WorkspaceUuid, systemAccountUuid } from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { type Integration } from '@hcengineering/account-client'
import { getDBClient } from '@hcengineering/postgres'

const GITHUB_INTEGRATION: IntegrationKind = 'github' as any

interface IntegrationSetting {
  workspaceId: WorkspaceUuid
  createdBy: PersonId
  installationIds: number[]
}

export async function restoreGithubIntegrations (dbUrl: string, dryrun: boolean): Promise<void> {
  try {
    const pg = getDBClient(dbUrl)
    const pgClient = await pg.getClient()
    const token = generateToken(systemAccountUuid, undefined, { service: 'admin', admin: 'true' })
    const accountClient = getAccountClient(token)

    const integrationSettings = await pgClient<
    { workspaceId: WorkspaceUuid, createdBy: PersonId, installationId: number }[]
    >`
      SELECT "workspaceId", "createdBy", data -> 'installationId' "installationId"
      FROM github
      WHERE _class='github:class:GithubIntegration'
    `

    // Group by workspace and createdBy, collecting installationIds
    const uniqueSettings = groupIntegrationSettings(integrationSettings)
    console.info('Start restoring GitHub installation IDs v3, count: ', uniqueSettings.length)

    let createdCount = 0
    let updatedCount = 0
    for (const setting of uniqueSettings) {
      try {
        const isMigratedSocialId = !isNaN(parseInt(setting.createdBy, 10))
        if (!isMigratedSocialId) {
          // Integration should not be affected in this case, since in corrupted migration socialIds were also used to search integrations
          console.info('Skip non-migrated integration:', setting.createdBy, setting.workspaceId)
          continue
        }

        const existingIntegration = await accountClient.getIntegration({
          workspaceUuid: setting.workspaceId,
          socialId: setting.createdBy,
          kind: GITHUB_INTEGRATION
        })

        let installationId: number | number[]

        if (existingIntegration != null) {
          const existingInstallationId = existingIntegration?.data?.installationId

          // Merge existing and new installation IDs
          const allInstallationIds = new Set<number>()
          if (existingInstallationId != null) {
            if (Array.isArray(existingInstallationId)) {
              existingInstallationId.filter(isValidInstallationId).forEach((id) => allInstallationIds.add(id))
            } else if (isValidInstallationId(existingInstallationId)) {
              allInstallationIds.add(existingInstallationId)
            }
          }
          setting.installationIds.forEach((id) => allInstallationIds.add(id))

          const mergedIds = Array.from(allInstallationIds)
          installationId = mergedIds.length === 1 ? mergedIds[0] : mergedIds

          // Check if the merged result is the same as existing
          const isSame = Array.isArray(installationId)
            ? Array.isArray(existingInstallationId) &&
              installationId.length === existingInstallationId.length &&
              installationId.every((id) => existingInstallationId.includes(id))
            : existingInstallationId === installationId

          if (isSame) {
            if (dryrun) {
              console.info('Dry run: skip existing integration', existingIntegration)
            }
            continue
          }

          const updatedData = {
            ...(existingIntegration.data ?? {}),
            installationId
          }
          const updatedIntegration: Integration = {
            ...existingIntegration,
            data: updatedData
          }
          if (dryrun) {
            console.info('Dry run: would update integration', existingIntegration, updatedIntegration)
            updatedCount++
            continue
          }
          await accountClient.updateIntegration(updatedIntegration)
          updatedCount++
        } else {
          installationId = setting.installationIds.length === 1 ? setting.installationIds[0] : setting.installationIds
          const integration: Integration = {
            workspaceUuid: setting.workspaceId,
            socialId: setting.createdBy,
            kind: GITHUB_INTEGRATION,
            data: {
              installationId
            }
          }
          if (dryrun) {
            console.info('Dry run: would create integration', integration)
            createdCount++
            continue
          }
          await accountClient.createIntegration(integration)
          createdCount++
        }
      } catch (e: any) {
        console.error('Error restoring GitHub integration', setting.createdBy, setting.workspaceId, e)
      }
    }
    console.info(`Finished restoring GitHub integrations, updated: ${updatedCount}, created: ${createdCount}`)
  } catch (e) {
    console.error('Failed to restore GitHub integrations', e)
  }
}

function groupIntegrationSettings (
  settings: Array<{ workspaceId: WorkspaceUuid, createdBy: PersonId, installationId: number }>
): IntegrationSetting[] {
  const groupedSettings = new Map<string, IntegrationSetting>()

  for (const setting of settings) {
    if (setting.installationId == null) continue

    const key = `${setting.workspaceId}-${setting.createdBy}`
    const existing = groupedSettings.get(key)

    if (existing != null) {
      if (!existing.installationIds.includes(setting.installationId)) {
        existing.installationIds.push(setting.installationId)
      }
    } else {
      groupedSettings.set(key, {
        workspaceId: setting.workspaceId,
        createdBy: setting.createdBy,
        installationIds: [setting.installationId]
      })
    }
  }

  return Array.from(groupedSettings.values())
}

function isValidInstallationId (id: any): boolean {
  if (typeof id === 'number' && !isNaN(id) && id > 0) {
    return true
  }
  const parsed = parseInt(String(id), 10)
  return !isNaN(parsed) && parsed > 0
}
