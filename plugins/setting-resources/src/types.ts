/**
 * @public
 */
export interface Snapshot {
  added: Map<string, string>
  updated: Map<string, string>
  removed: string[]
}

/**
 * @public
 */
export interface SnapshotV6 {
  added: Record<string, string>
  updated: Record<string, string>
  removed: string[]
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
  domains: Record<string, DomainData>
  date: number
}

/**
 * @public
 */
export interface BackupInfo {
  workspace: string
  version: string
  snapshots: BackupSnapshot[]
  snapshotsIndex?: number
  lastTxId?: string
}
