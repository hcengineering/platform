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

import { WorkspaceUuid } from '@hcengineering/core'

export type IntegrationStatus = 'active' | 'inactive' | 'connecting' | 'disconnecting' | 'error' | 'unknown'

export type ActionKind = 'connect' | 'disconnect' | 'reconnect' | 'update' | 'delete'

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

/**
 * Client for interacting with different integrations like Gmail, Github, Telegram, etc.
 * @public
 */
export interface IntegrationStateClient<T> {
  /**
   * Get the current integration state
   * @returns Promise that resolves to the current state, or null if no state exists
   * @throws {Error} If state retrieval fails
   */
  getState: (workspace: WorkspaceUuid, integrationId: string) => Promise<T | null>

  /**
   * Set the integration state
   * @param value - The state value to store
   * @returns Promise that resolves when the state is updated
   * @throws {ValidationError} If the state value is invalid
   */
  setState: (workspace: WorkspaceUuid, integrationId: string, value: T) => Promise<void>

  /**
   * Update the integration state
   * @param value - The state value to store
   * @returns Promise that resolves when the state is updated
   * @throws {ValidationError} If the state value is invalid
   */
  updateState: (workspace: WorkspaceUuid, integrationId: string, value: Partial<T>) => Promise<void>

  /**
   * Clear the stored integration state
   * @returns Promise that resolves when the state is cleared
   */
  clearState: (workspace: WorkspaceUuid, integrationId: string) => Promise<void>
}
