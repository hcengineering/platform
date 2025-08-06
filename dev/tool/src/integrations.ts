import {
  type Client,
  type IntegrationKind,
  MeasureMetricsContext,
  type Ref,
  type Tx,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid,
  systemAccountUuid
} from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { type Integration } from '@hcengineering/account-client'
import setting, { type IntegrationType, type Integration as IntegrationSetting } from '@hcengineering/setting'

import { type PipelineFactory, createDummyStorageAdapter, wrapPipeline } from '@hcengineering/server-core'
import { createBackupPipeline, createEmptyBroadcastOps } from '@hcengineering/server-pipeline'

interface WorkspaceInfoProvider {
  getWorkspaceInfo: (workspaceUuid: WorkspaceUuid) => Promise<WorkspaceInfoWithStatus | undefined>
}

const GMAIL_INTEGRATION: IntegrationKind = 'gmail' as any
const CALENDAR_INTEGRATION: IntegrationKind = 'google-calendar' as any
const GITHUB_INTEGRATION: IntegrationKind = 'github' as any

export async function performIntegrationMigrations (dbUrl: string, region: string | null, txes: Tx[]): Promise<void> {
  console.log('Start integration migrations')
  const token = generateToken(systemAccountUuid, undefined, { service: 'admin', admin: 'true' })
  const accountClient = getAccountClient(token)

  const allWorkspaces = await accountClient.listWorkspaces(region)
  const byId = new Map(allWorkspaces.map((it) => [it.uuid, it]))
  const workspaceProvider: WorkspaceInfoProvider = {
    getWorkspaceInfo: async (workspaceUuid: WorkspaceUuid) => {
      const ws = byId.get(workspaceUuid as any)
      if (ws == null) {
        console.error('No workspace found for token', workspaceUuid)
        return undefined
      }
      return ws
    }
  }
  const metricsContext = new MeasureMetricsContext('integrations-migrate', {})

  const factory: PipelineFactory = createBackupPipeline(metricsContext, dbUrl, txes, {
    externalStorage: createDummyStorageAdapter(),
    usePassedCtx: true
  })

  await migrateIntegrations(token, workspaceProvider, factory, metricsContext)

  console.log('Finished integration migrations')
}

async function migrateIntegrations (
  token: string,
  workspaceProvider: WorkspaceInfoProvider,
  factory: PipelineFactory,
  metricsContext: MeasureMetricsContext
): Promise<void> {
  try {
    console.log('Start integrations data migrations')
    const accountClient = getAccountClient(token)
    const integrations = await accountClient.listIntegrations({})
    console.log('Integrations count', integrations.length)

    const workspaceUuids = new Set<WorkspaceUuid>()
    const integrationsByWorkspaces = integrations.reduce<Record<string, typeof integrations>>((acc, integration) => {
      const workspaceId = integration.workspaceUuid
      if (workspaceId == null) {
        return acc
      }
      if (acc[workspaceId] === undefined) {
        workspaceUuids.add(workspaceId)
        acc[workspaceId] = []
      }
      acc[workspaceId].push(integration)
      return acc
    }, {})

    for (const workspace of workspaceUuids) {
      const wsInfo = await workspaceProvider.getWorkspaceInfo(workspace)
      if (wsInfo == null) {
        console.error('No workspace found for token', workspace)
        continue
      }
      const pipeline = await factory(metricsContext, wsInfo, createEmptyBroadcastOps(), null)
      const client = wrapPipeline(metricsContext, pipeline, wsInfo, false)
      const integrations = integrationsByWorkspaces[workspace]
      for (const integration of integrations) {
        try {
          const integrationSetting = await getIntegrationSetting(client, integration)
          if (integrationSetting === undefined) {
            console.warn('No integration setting found for integration', integration)
            continue
          }
          const integrationData = getIntegrationData(integrationSetting, integration)
          const updatedData = {
            ...(integration.data ?? {}),
            ...integrationData
          }
          const updatedIntegration: Integration = {
            ...integration,
            data: updatedData
          }
          await accountClient.updateIntegration(updatedIntegration)
          console.log('Updated integration', updatedIntegration.socialId, updatedIntegration.workspaceUuid)
        } catch (e: any) {
          console.error('Error updating integration', integration.socialId, integration.workspaceUuid, e)
        }
      }
    }
    console.log('Integrations migrations done')
  } catch (e) {
    console.error('Error migrating integrations', e)
  }
}

async function getIntegrationSetting (
  client: Client,
  integration: Integration
): Promise<IntegrationSetting | undefined> {
  const integrationType = getIntegrationType(integration)
  if (integrationType === undefined) {
    return undefined
  }
  let integrations = await client.findAll(setting.class.Integration, {
    createdBy: integration.socialId,
    type: integrationType
  })
  if (integrations.length === 0) {
    integrations = await client.findAll(setting.class.Integration, {
      modifiedBy: integration.socialId,
      type: integrationType
    })
  }
  if (integrations.length === 0) {
    return undefined
  }
  const enabledIntegration = integrations.find((i) => !i.disabled && i.value !== undefined && i.value !== '')
  if (enabledIntegration !== undefined) {
    return enabledIntegration
  }
  return integrations.find((i) => i.value !== undefined && i.value !== '')
}

function getIntegrationData (setting: IntegrationSetting, integration: Integration): Record<string, any> | undefined {
  if (setting.value == null || setting.value === '') {
    return {}
  }
  if (integration.kind === GMAIL_INTEGRATION) {
    return {
      email: setting.value
    }
  }
  if (integration.kind === CALENDAR_INTEGRATION) {
    return {
      email: setting.value
    }
  }
  if (integration.kind === GITHUB_INTEGRATION) {
    return {
      installationId: setting.value
    }
  }
}

function getIntegrationType (integration: Integration): Ref<IntegrationType> | undefined {
  if (integration.kind === GMAIL_INTEGRATION) {
    return 'gmail:integrationType:Gmail' as any
  }
  if (integration.kind === CALENDAR_INTEGRATION) {
    return 'calendar:integrationType:Calendar' as any
  }
  if (integration.kind === GITHUB_INTEGRATION) {
    return 'github:integrationType:Github' as any
  }

  return undefined
}
