import type { Metrics, PersonId } from '@hcengineering/core'

// Copy from server/core/stats.ts for UI usage.
export interface MemoryStatistics {
  memoryUsed: number
  memoryTotal: number
  memoryRSS: number
  freeMem: number
  totalMem: number
}
export interface CPUStatistics {
  usage: number
  cores: number
}

/**
 * @public
 */
export interface StatisticsElement {
  find: number
  tx: number
}

export interface UserStatistics {
  userId: PersonId // TODO: FIXME - test if it's PersonId or PersonUuid
  sessionId: string
  data: any
  mins5: StatisticsElement
  total: StatisticsElement
  current: StatisticsElement
}

export interface WorkspaceStatistics {
  sessions: UserStatistics[]
  workspaceName: string
  wsId: string
  sessionsTotal: number
  clientsTotal: number

  service?: string
}
export interface ServiceStatistics {
  serviceName: string // A service category
  memory: MemoryStatistics
  cpu: CPUStatistics
  stats?: Metrics
  workspaces?: WorkspaceStatistics[]
}

export interface OverviewStatistics {
  memory: MemoryStatistics
  cpu: CPUStatistics
  data: Record<string, Omit<ServiceStatistics, 'stats' | 'workspaces'>>
  usersTotal: number
  connectionsTotal: number
  admin: boolean
  workspaces: WorkspaceStatistics[]
}
