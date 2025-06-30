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

import { IntegrationKind, WorkspaceUuid } from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/kvs-client'
import { type IntegrationStateClient } from './types'

export class BaseIntegrationStateClient<T> implements IntegrationStateClient<T> {
  constructor (
    protected readonly keyValueClient: KeyValueClient,
    protected readonly integrationKind: IntegrationKind
  ) {}

  async getState (workspace: WorkspaceUuid, integrationId: string): Promise<T | null> {
    try {
      return await this.keyValueClient.getValue<T>(this.getStateKey(workspace, integrationId))
    } catch (error: any) {
      this.handleError(new Error(`Failed to get integration state: ${error.message}`))
      throw error
    }
  }

  async setState (workspace: WorkspaceUuid, integrationId: string, value: T): Promise<void> {
    try {
      await this.keyValueClient.setValue(this.getStateKey(workspace, integrationId), value)
    } catch (error: any) {
      this.handleError(new Error(`Failed to set integration state: ${error.message}`))
      throw error
    }
  }

  async updateState (workspace: WorkspaceUuid, integrationId: string, value: Partial<T>): Promise<void> {
    try {
      const currentState = await this.getState(workspace, integrationId)
      const updatedState = currentState !== undefined ? { ...currentState, ...value } : value
      await this.keyValueClient.setValue(this.getStateKey(workspace, integrationId), updatedState)
    } catch (error: any) {
      this.handleError(new Error(`Failed to set integration state: ${error.message}`))
      throw error
    }
  }

  async clearState (workspace: WorkspaceUuid, integrationId: string): Promise<void> {
    try {
      await this.keyValueClient.deleteKey(this.getStateKey(workspace, integrationId))
    } catch (error: any) {
      this.handleError(new Error(`Failed to clear integration state: ${error.message}`))
      throw error
    }
  }

  protected handleError (error: Error): void {
    console.error(`Integration error [${this.integrationKind}]:`, error.message)
  }

  private getStateKey (workspace: WorkspaceUuid, integrationId: string): string {
    return `integration:${this.integrationKind}:state:${workspace}:${integrationId}`
  }
}

export function getIntegrationClient<T> (
  keyValueClient: KeyValueClient,
  integrationKind: IntegrationKind
): IntegrationStateClient<T> {
  return new BaseIntegrationStateClient<T>(keyValueClient, integrationKind)
}
