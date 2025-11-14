import type { MeasureContext, Metrics } from '@hcengineering/core'
import { concatLink, MeasureMetricsContext, newMetrics, systemAccountUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import os from 'os'

export interface MemoryStatistics {
  memoryUsed: number
  memoryTotal: number

  memoryArrayBuffers: number
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
  userId: string
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

export function getMemoryInfo (): MemoryStatistics {
  const memU = process.memoryUsage()
  return {
    memoryUsed: Math.round((memU.heapUsed / 1024 / 1024) * 100) / 100,
    memoryRSS: Math.round((memU.rss / 1024 / 1024) * 100) / 100,
    memoryTotal: Math.round((memU.heapTotal / 1024 / 1024) * 100) / 100,
    memoryArrayBuffers: Math.round((memU.arrayBuffers / 1024 / 1024) * 100) / 100,
    freeMem: Math.round((os.freemem() / 1024 / 1024) * 100) / 100,
    totalMem: Math.round((os.totalmem() / 1024 / 1024) * 100) / 100
  }
}

export function getCPUInfo (): CPUStatistics {
  return {
    usage: Math.round(os.loadavg()[0] * 100) / 100,
    cores: os.cpus().length
  }
}

const METRICS_UPDATE_INTERVAL = 5000
/**
 * @public
 */
export function initStatisticsContext (
  serviceName: string,
  ops?: {
    logFile?: string
    factory?: () => MeasureContext
    getStats?: () => WorkspaceStatistics[]
    statsUrl?: string
    serviceName?: () => string
  }
): MeasureContext {
  let metricsContext: MeasureContext
  if (ops?.factory !== undefined) {
    metricsContext = ops.factory()
  } else {
    metricsContext = new MeasureMetricsContext(serviceName, {}, {}, newMetrics())
  }

  const statsUrl = ops?.statsUrl ?? process.env.STATS_URL

  let errorToSend = 0

  if (statsUrl !== undefined) {
    metricsContext.info('using stats url', { statsUrl, service: serviceName ?? '' })
    const serviceId = encodeURIComponent(os.hostname() + '-' + serviceName)

    let prev: Promise<void> | Promise<any> | undefined
    const handleError = (err: any): void => {
      errorToSend++
      if (errorToSend % 2 === 0) {
        if (err.code !== 'UND_ERR_SOCKET') {
          console.error(err)
        }
      }
      prev = undefined
    }

    const intTimer = setInterval(() => {
      try {
        if (prev !== undefined) {
          // In case of high load, skip
          return
        }
        if (statsUrl !== undefined) {
          const token = generateToken(systemAccountUuid, undefined, { service: serviceName })
          const data: ServiceStatistics = {
            serviceName: ops?.serviceName?.() ?? serviceName,
            cpu: getCPUInfo(),
            memory: getMemoryInfo(),
            stats: metricsContext.metrics,
            workspaces: ops?.getStats?.()
          }

          const statData = JSON.stringify(data)

          void metricsContext.with(
            'sendStatistics',
            {},
            async (ctx) => {
              prev = fetch(concatLink(statsUrl, '/api/v1/statistics') + `/?name=${serviceId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  authorization: `Bearer ${token}`
                },
                body: statData
              })
                .finally(() => {
                  prev = undefined
                })
                .catch(handleError)
            },
            undefined,
            { span: 'disable' }
          )
        }
      } catch (err: any) {
        handleError(err)
      }
    }, METRICS_UPDATE_INTERVAL)

    const closeTimer = (): void => {
      clearInterval(intTimer)
    }
    process.on('SIGINT', closeTimer)
    process.on('SIGTERM', closeTimer)
  }

  return metricsContext
}
