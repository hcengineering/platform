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

import { PersonId } from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/kvs-client'
import { type History } from './types'
import { IntegrationVersion } from '../types'

/**
 * Handles persistent storage for Gmail sync state
 */
export class SyncStateManager {
  constructor (
    private readonly keyValueClient: KeyValueClient,
    private readonly workspace: string,
    private readonly version: IntegrationVersion
  ) {}

  async getHistory (userId: PersonId): Promise<History | null> {
    const historyKey = this.getHistoryKey(userId)
    return await this.keyValueClient.getValue<History>(historyKey)
  }

  async clearHistory (userId: PersonId): Promise<void> {
    const historyKey = this.getHistoryKey(userId)
    await this.keyValueClient.deleteKey(historyKey)
  }

  async setHistoryId (userId: PersonId, historyId: string): Promise<void> {
    const historyKey = this.getHistoryKey(userId)
    const history: History = {
      historyId,
      userId,
      workspace: this.workspace
    }
    await this.keyValueClient.setValue(historyKey, history)
  }

  async getPageToken (userId: PersonId): Promise<string | null> {
    const pageTokenKey = this.getPageTokenKey(userId)
    return await this.keyValueClient.getValue<string>(pageTokenKey)
  }

  async setPageToken (userId: PersonId, pageToken: string): Promise<void> {
    const pageTokenKey = this.getPageTokenKey(userId)
    await this.keyValueClient.setValue(pageTokenKey, pageToken)
  }

  async getLastSyncDate (userId: PersonId): Promise<Date | null> {
    const lastSyncKey = this.getLastSyncKey(userId)
    const lastSync = await this.keyValueClient.getValue<Date>(lastSyncKey)
    return lastSync != null ? new Date(lastSync) : null
  }

  async setLastSyncDate (userId: PersonId, date: Date): Promise<void> {
    const lastSyncKey = this.getLastSyncKey(userId)
    await this.keyValueClient.setValue(lastSyncKey, date)
  }

  private getHistoryKey (userId: PersonId): string {
    if (this.version === IntegrationVersion.V2) {
      return `history-v2:${this.workspace}:${userId}`
    }
    return `history:${this.workspace}:${userId}`
  }

  private getPageTokenKey (userId: PersonId): string {
    if (this.version === IntegrationVersion.V2) {
      return `page-token-v2:${this.workspace}:${userId}`
    }
    return `page-token:${this.workspace}:${userId}`
  }

  private getLastSyncKey (userId: PersonId): string {
    if (this.version === IntegrationVersion.V2) {
      return `last-sync-date-v2:${this.workspace}:${userId}`
    }
    return `last-sync-date:${this.workspace}:${userId}`
  }
}
