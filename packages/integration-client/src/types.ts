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

import { Integration, IntegrationKey, IntegrationSecret } from '@hcengineering/account-client'
import { IntegrationKind, PersonId, WorkspaceUuid } from '@hcengineering/core'

export type IntegrationStatus = 'active' | 'inactive' | 'connecting' | 'disconnecting' | 'error' | 'unknown'

export type ActionKind = 'connect' | 'disconnect' | 'reconnect' | 'update' | 'delete'

export interface IntegrationClient {
  /**
   * Get integrations
   */
  getIntegrations: () => Promise<Integration[]>

  /**
   * Get the connection details for a specific integration
   */
  getConnection: (integration: Integration) => Promise<Integration | null>

  /**
   * Integrate a social ID with a workspace
   */
  integrate: (connection: Integration, workspace: WorkspaceUuid, data?: Record<string, any>) => Promise<Integration>

  /**
   * Create a connection for a social ID (without workspace integration)
   */
  connect: (socialId: PersonId, data?: Record<string, any>) => Promise<Integration>

  /**
   * Update configuration for an existing integration
   */
  updateConfig: (
    integrationKey: IntegrationKey,
    config: Record<string, any>,
    refresh?: () => Promise<void>
  ) => Promise<void>

  /**
   * Remove integration for a social ID and workspace
   */
  removeIntegration: (
    socialId: PersonId | undefined | null,
    workspaceUuid: WorkspaceUuid | null | undefined
  ) => Promise<
  | {
    connectionRemoved: boolean
  }
  | undefined
  >

  /**
   * Remove connection and all associated integrations
   */
  removeConnection: (connection: Integration) => Promise<void>

  /**
   * Set or update integration secret
   */
  setSecret: (data: IntegrationSecret) => Promise<void>
}

export interface IntegrationEventData {
  integration: Integration
  timestamp: number
}

export interface IntegrationUpdatedData extends IntegrationEventData {
  oldConfig?: Record<string, any>
  newConfig: Record<string, any>
}

export interface IntegrationErrorData {
  operation: string
  error: string
  integrationKey?: IntegrationKey
  socialId?: PersonId
  workspaceUuid?: WorkspaceUuid | null
  timestamp: number
}

export interface IntegrationData {
  _id: string | undefined
  connectionId: string | undefined
  config: Record<string, any>
}

export interface ActionRequest {
  /**
   * The type of action to perform
   */
  type: ActionKind

  /**
   * The ID of the integration to act upon
   */
  integrationId: string

  /**
   * Additional data required for the action, if any
   */
  data?: Record<string, any>
}

export interface ActionResponse {
  /**
   * Whether the action was successful
   */
  success: boolean

  /**
   * Action result data, if any
   */
  data?: Record<string, any>

  /**
   * Error message if the action failed
   */
  error?: string

  /**
   * Updated integration status after the action
   */
  status?: IntegrationStatus
}

export interface IntegrationInfo {
  /**
   * Unique identifier for the integration
   */
  id: string

  /**
   * Integration kind (gmail, slack, github, etc.)
   */
  kind: string

  /**
   * Current status of the integration
   */
  status: IntegrationStatus

  /**
   * Last sync timestamp
   */
  lastSync?: Date

  /**
   * Error information if status is 'error'
   */
  error?: {
    message: string
    code?: string
    timestamp: Date
  }
}

/**
 * Integration-specific configuration
 */
export type IntegrationConfig = Record<string, any>

export interface ServiceClient {
  /**
   * Connect to an integration service
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @param config - Optional configuration
   * @returns Promise that resolves to connection result
   * @throws {ConnectionError} If connection fails
   */
  connect: (workspace: WorkspaceUuid, integrationId: string, config?: IntegrationConfig) => Promise<ActionResponse>

  /**
   * Disconnect from an integration service
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @param force - Whether to force disconnect even if cleanup fails
   * @returns Promise that resolves when disconnected
   * @throws {DisconnectionError} If disconnection fails
   */
  disconnect: (workspace: WorkspaceUuid, integrationId: string, force?: boolean) => Promise<ActionResponse>

  /**
   * Reconnect to an integration service (disconnect + connect)
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @param credentials - Updated authentication credentials
   * @returns Promise that resolves to reconnection result
   */
  reconnect: (workspace: WorkspaceUuid, integrationId: string) => Promise<ActionResponse>

  /**
   * Update integration configuration
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @param config - Configuration updates
   * @returns Promise that resolves when configuration is updated
   * @throws {ConfigurationError} If configuration is invalid
   */
  configure: (
    workspace: WorkspaceUuid,
    integrationId: string,
    config: Partial<IntegrationConfig>
  ) => Promise<ActionResponse>

  /**
   * Test integration connection
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @returns Promise that resolves to test result
   */
  test: (workspace: WorkspaceUuid, integrationId: string) => Promise<ActionResponse>

  /**
   * Get integration information and status
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @returns Promise that resolves to integration info
   */
  getInfo: (workspace: WorkspaceUuid, integrationId: string) => Promise<IntegrationInfo | null>

  /**
   * Delete an integration permanently
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @param cleanup - Whether to cleanup associated data
   * @returns Promise that resolves when integration is deleted
   */
  delete: (workspace: WorkspaceUuid, integrationId: string, cleanup?: boolean) => Promise<ActionResponse>

  /**
   * Enable or disable an integration
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @param enabled - Whether to enable or disable
   * @returns Promise that resolves when status is updated
   */
  setEnabled: (workspace: WorkspaceUuid, integrationId: string, enabled: boolean) => Promise<ActionResponse>

  /**
   * Execute a custom action on the integration
   * @param workspace - The workspace UUID
   * @param integrationId - The integration identifier
   * @param action - Custom action to execute
   * @returns Promise that resolves to action result
   */
  executeAction: (workspace: WorkspaceUuid, integrationId: string, action: ActionRequest) => Promise<ActionResponse>

  getIntegrationKind: () => IntegrationKind
}

/**
 * Integration-specific error types
 */
export class IntegrationError extends Error {
  constructor (
    message: string,
    public code: string,
    public integrationId: string,
    public workspace: WorkspaceUuid
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}

export class ConnectionError extends IntegrationError {
  constructor (message: string, integrationId: string, workspace: WorkspaceUuid) {
    super(message, 'CONNECTION_ERROR', integrationId, workspace)
    this.name = 'ConnectionError'
  }
}

export class ConfigurationError extends IntegrationError {
  constructor (message: string, integrationId: string, workspace: WorkspaceUuid) {
    super(message, 'CONFIGURATION_ERROR', integrationId, workspace)
    this.name = 'ConfigurationError'
  }
}

export class DisconnectionError extends IntegrationError {
  constructor (message: string, integrationId: string, workspace: WorkspaceUuid) {
    super(message, 'DISCONNECTION_ERROR', integrationId, workspace)
    this.name = 'DisconnectionError'
  }
}
