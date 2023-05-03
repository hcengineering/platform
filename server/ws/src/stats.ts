import { MeasureContext, metricsAggregate } from '@hcengineering/core'
import { SessionManager } from './types'
import os from 'os'

/**
 * @public
 */
export function getStatistics (ctx: MeasureContext, sessions: SessionManager): any {
  const data: Record<string, any> = {
    metrics: metricsAggregate((ctx as any).metrics),
    statistics: {
      activeSessions: {}
    }
  }
  for (const [k, v] of sessions.workspaces) {
    data.statistics.activeSessions[k] = v.sessions.length
  }

  data.statistics.memoryUsed = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100
  data.statistics.memoryTotal = Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100
  data.statistics.cpuUsage = Math.round(os.loadavg()[0] * 100) / 100
  data.statistics.freeMem = Math.round((os.freemem() / 1024 / 1024) * 100) / 100
  data.statistics.totalMem = Math.round((os.totalmem() / 1024 / 1024) * 100) / 100

  return data
}
