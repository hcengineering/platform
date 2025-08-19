import {
  type IntegrationKind,
  type PersonId,
  type WorkspaceUuid,
  systemAccountUuid
} from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { type Integration } from '@hcengineering/account-client'
import { getDBClient } from '@hcengineering/postgres'

const GITHUB_INTEGRATION: IntegrationKind = 'github' as any

export async function restoreGithubIntegrations (dbUrl: string): Promise<void> {
  try {
    const pg = getDBClient(dbUrl)
    const pgClient = await pg.getClient()
    const token = generateToken(systemAccountUuid, undefined, { service: 'admin', admin: 'true' })
    const accountClient = getAccountClient(token)

    const integrationSettings = await pgClient<{ workspaceId: WorkspaceUuid, createdBy: PersonId, installationId: number }[]>`
      SELECT "workspaceId", "createdBy", data -> 'installationId' "installationId"
      FROM github
      WHERE _class='github:class:GithubIntegration'
    `
    console.info('Start restoring GitHub installation IDs, count: ', integrationSettings.length)

    let createdCount = 0
    let updatedCount = 0
    for (const setting of integrationSettings) {
      try {
        if (setting.installationId == null) continue
        const existingIntegration = await accountClient.getIntegration({
          workspaceUuid: setting.workspaceId,
          socialId: setting.createdBy,
          kind: GITHUB_INTEGRATION
        })
        if (existingIntegration != null) {
          if (existingIntegration?.data?.installationId === setting.installationId) {
            continue
          }
          const updatedData = {
            ...(existingIntegration.data ?? {}),
            installationId: setting.installationId
          }
          const updatedIntegration: Integration = {
            ...existingIntegration,
            data: updatedData
          }
          await accountClient.updateIntegration(updatedIntegration)
          updatedCount++
        } else {
          await accountClient.createIntegration({
            workspaceUuid: setting.workspaceId,
            socialId: setting.createdBy,
            kind: GITHUB_INTEGRATION,
            data: {
              installationId: setting.installationId
            }
          })
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
