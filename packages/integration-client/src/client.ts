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
//
// packages/integration/src/account.ts

import {
  getClient as getAccountClientRaw,
  Integration,
  IntegrationKey,
  IntegrationSecret,
  type AccountClient
} from '@hcengineering/account-client'
import { IntegrationKind, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { v4 as uuid } from 'uuid'

import { IntegrationClient, IntegrationEventData, IntegrationUpdatedData, IntegrationErrorData } from './types'
import { isConnection } from './utils'
import { type EventCallback, getIntegrationEventBus } from './events'

export function getIntegrationClient (
  accountsUrl: string,
  token: string,
  integrationKind: IntegrationKind,
  serviceName: string
): IntegrationClient {
  const client = getAccountClientRaw(accountsUrl, token)
  return new IntegrationClientImpl(client, integrationKind, serviceName)
}

export class IntegrationClientImpl implements IntegrationClient {
  private readonly events = getIntegrationEventBus()

  constructor (
    private readonly client: AccountClient,
    private readonly integrationKind: IntegrationKind,
    private readonly serviceName: string
  ) {}

  // Event methods
  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    return this.events.on(event, callback)
  }

  off (event: string, callback?: EventCallback): void {
    this.events.off(event, callback)
  }

  private emit<T = any>(event: string, data: T): void {
    this.events.emit(event, data)
  }

  async getIntegrations (): Promise<Integration[]> {
    return (await this.client.listIntegrations({ kind: this.integrationKind })) ?? []
  }

  async getConnection (integration: Integration): Promise<Integration | null> {
    try {
      if (isConnection(integration)) {
        return integration
      }
      const connectionKey = {
        socialId: integration.socialId,
        kind: integration.kind,
        workspaceUuid: null
      }
      return await this.client.getIntegration(connectionKey)
    } catch (error) {
      const errorData: IntegrationErrorData = {
        operation: 'connect',
        error: error instanceof Error ? error.message : String(error),
        socialId: integration.socialId,
        timestamp: Date.now()
      }
      this.emit('integration:error', errorData)
      throw error
    }
  }

  async integrate (connection: Integration, workspace: WorkspaceUuid, data?: Record<string, any>): Promise<Integration> {
    try {
      const existingData = data ?? connection.data ?? {}
      const integration = {
        socialId: connection.socialId,
        kind: connection.kind ?? this.integrationKind,
        workspaceUuid: workspace,
        data: {
          ...existingData,
          _id: uuid(),
          connectionId: connection.data?._id
        }
      }

      const existingIntegration = await this.client.getIntegration(integration)
      if (existingIntegration != null) {
        const eventData: IntegrationEventData = {
          integration,
          timestamp: Date.now()
        }
        this.emit('integration:updated', eventData)
        return existingIntegration
      }

      await this.client.createIntegration(integration)

      const eventData: IntegrationEventData = {
        integration,
        timestamp: Date.now()
      }
      this.emit('integration:created', eventData)

      return integration
    } catch (error) {
      const errorData: IntegrationErrorData = {
        operation: 'integrate',
        error: error instanceof Error ? error.message : String(error),
        workspaceUuid: workspace,
        timestamp: Date.now()
      }
      this.emit('integration:error', errorData)
      throw error
    }
  }

  async connect (socialId: PersonId, data?: Record<string, any>): Promise<Integration> {
    try {
      const connection = {
        socialId,
        kind: this.integrationKind,
        workspaceUuid: null,
        data
      }
      const existingConnection = await this.client.getIntegration(connection)
      if (existingConnection != null) {
        // Check if data needs to be updated
        if (data == null) {
          return existingConnection
        }
        const existingData = existingConnection.data ?? {}
        const updatedData = {
          ...existingData,
          ...data
        }
        const needsUpdate = data != null && JSON.stringify(updatedData) !== JSON.stringify(existingData)

        if (needsUpdate) {
          const updatedConnection = {
            ...existingConnection,
            data: updatedData
          }

          await this.client.updateIntegration(updatedConnection)

          const eventData: IntegrationEventData = {
            integration: updatedConnection,
            timestamp: Date.now()
          }
          this.emit('connection:updated', eventData)

          return updatedConnection
        }

        return existingConnection
      }

      await this.client.createIntegration(connection)

      const eventData: IntegrationEventData = {
        integration: connection,
        timestamp: Date.now()
      }
      this.emit('connection:created', eventData)

      return connection
    } catch (error) {
      const errorData: IntegrationErrorData = {
        operation: 'connect',
        error: error instanceof Error ? error.message : String(error),
        socialId,
        timestamp: Date.now()
      }
      this.emit('integration:error', errorData)
      throw error
    }
  }

  async updateConfig (
    integrationKey: IntegrationKey,
    config: Record<string, any>,
    refresh?: () => Promise<void>
  ): Promise<void> {
    try {
      const integration = await this.client.getIntegration(integrationKey)
      if (integration == null) {
        throw new Error(`Integration not found: ${JSON.stringify(integrationKey)}`)
      }

      const oldConfig = integration.data?.config
      const data = {
        ...integration.data,
        config
      }

      await this.client.updateIntegration({
        ...integration,
        data
      })
      if (refresh != null) {
        await refresh()
      }

      const eventData: IntegrationUpdatedData = {
        integration,
        oldConfig,
        newConfig: config,
        timestamp: Date.now()
      }
      this.emit('integration:updated', eventData)
    } catch (error) {
      const errorData: IntegrationErrorData = {
        operation: 'updateConfig',
        error: error instanceof Error ? error.message : String(error),
        integrationKey,
        timestamp: Date.now()
      }
      this.emit('integration:error', errorData)
      throw error
    }
  }

  async removeIntegration (
    socialId: PersonId | undefined | null,
    workspaceUuid: WorkspaceUuid | null | undefined
  ): Promise<
    | {
      connectionRemoved: boolean
    }
    | undefined
    > {
    if (socialId == null) return

    try {
      const integrations = await this.client.listIntegrations({
        kind: this.integrationKind,
        socialId,
        workspaceUuid
      })

      for (const integration of integrations) {
        await this.client.deleteIntegration({
          socialId,
          kind: this.integrationKind,
          workspaceUuid: integration.workspaceUuid
        })

        const eventData: IntegrationEventData = {
          integration,
          timestamp: Date.now()
        }
        this.emit('integration:deleted', eventData)
      }

      // Remove connection if it was the last integration for this socialId
      const remainedIntegrations = await this.client.listIntegrations({
        kind: this.integrationKind,
        socialId
      })
      if (remainedIntegrations.length === 1 && isConnection(remainedIntegrations[0])) {
        await this.removeConnection(remainedIntegrations[0])
        return {
          connectionRemoved: true
        }
      }
      return {
        connectionRemoved: false
      }
    } catch (error) {
      const errorData: IntegrationErrorData = {
        operation: 'removeIntegration',
        error: error instanceof Error ? error.message : String(error),
        socialId,
        workspaceUuid,
        timestamp: Date.now()
      }
      this.emit('integration:error', errorData)
      throw error
    }
  }

  async removeConnection (connection: Integration): Promise<void> {
    try {
      const integrations = await this.client.listIntegrations({
        kind: connection.kind,
        socialId: connection.socialId
      })

      for (const integration of integrations) {
        await this.client.deleteIntegration({
          socialId: integration.socialId,
          kind: integration.kind,
          workspaceUuid: integration.workspaceUuid
        })

        const eventData: IntegrationEventData = {
          integration,
          timestamp: Date.now()
        }
        this.emit('integration:deleted', eventData)
      }
    } catch (error) {
      const errorData: IntegrationErrorData = {
        operation: 'removeConnection',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      }
      this.emit('integration:error', errorData)
      throw error
    }
  }

  async setSecret (data: IntegrationSecret): Promise<void> {
    const { secret, ...secretKey } = data
    const currentSecret = await this.client.getIntegrationSecret(secretKey)
    if (currentSecret != null) {
      await this.client.updateIntegrationSecret(data)
    } else {
      await this.client.addIntegrationSecret(data)
    }
  }
}
