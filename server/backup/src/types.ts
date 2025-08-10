//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Doc, Domain, Ref, type BackupStatus, type WorkspaceUuid } from '@hcengineering/core'
export * from './storage'

/**
 * Blob data from s3 storage
 * @public
 */
export interface BlobData extends Doc {
  name: string
  size: number
  type: string
  provider?: string // If node defined, will be default one
  base64Data: string // base64 encoded data
}

export type BackupDocId = Ref<Doc> | string

/**
 * @public
 */
export interface Snapshot {
  added: Map<BackupDocId, string>
  updated: Map<BackupDocId, string>
  removed: BackupDocId[]
}

/**
 * @public
 */
export interface SnapshotV6 {
  added: Record<BackupDocId, string>
  updated: Record<BackupDocId, string>
  removed: BackupDocId[]
}

/**
 * @public
 */
export interface DomainData {
  snapshot?: string // 0.6 json snapshot
  snapshots?: string[]
  storage?: string[]

  // Some statistics
  added: number
  updated: number
  removed: number
}

/**
 * @public
 */
export interface BackupSnapshot {
  // _id => hash of added items.
  domains: Record<Domain, DomainData>
  date: number

  compacting?: boolean
  stIndex: number // Snapshot index
}

/**
 * @public
 */
export interface BackupInfo {
  workspace: WorkspaceUuid
  version: string
  snapshots: BackupSnapshot[]
  snapshotsIndex?: number
  lastTxId?: string

  // A hash of current domain transactions, so we could skip all other checks if same.
  domainHashes: Record<Domain, string>

  migrations: Record<string, boolean | string>
  dataSize?: number
  blobsSize?: number
  backupSize?: number
}

export interface BackupResult extends Omit<BackupStatus, 'backups' | 'lastBackup'> {
  result: boolean
}
