import type { MeasureContext, Metrics } from '@hcengineering/core'
import { concatLink, MeasureMetricsContext, metricsToString, newMetrics, systemAccountEmail } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { writeFile } from 'fs/promises'
import os from 'os'

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
    logConsole?: boolean
    factory?: () => MeasureMetricsContext
    getUsers?: () => WorkspaceStatistics[]
  }
): MeasureContext {
  let metricsContext: MeasureMetricsContext
  if (ops?.factory !== undefined) {
    metricsContext = ops.factory()
  } else {
    metricsContext = new MeasureMetricsContext(serviceName, {}, {}, newMetrics())
  }

  const statsUrl = process.env.STATS_URL

  const metricsFile = ops?.logFile

  let errorToSend = 0

  if (metricsFile !== undefined || ops?.logConsole === true || statsUrl !== undefined) {
    if (metricsFile !== undefined) {
      console.info('storing measurements into local file', metricsFile)
    }
    let oldMetricsValue = ''
    const serviceId = encodeURIComponent(os.hostname() + '-' + serviceName)

    const handleError = (err: any): void => {
      errorToSend++
      if (errorToSend % 2 === 0) {
        if (err.code !== 'UND_ERR_SOCKET') {
          console.error(err)
        }
      }
    }

    const intTimer = setInterval(() => {
      try {
        if (metricsFile !== undefined || ops?.logConsole === true) {
          const val = metricsToString(metricsContext.metrics, serviceName, 140)
          if (val !== oldMetricsValue) {
            oldMetricsValue = val
            if (metricsFile !== undefined) {
              void writeFile(metricsFile, val).catch((err) => {
                console.error(err)
              })
            }
            if (ops?.logConsole === true) {
              console.info('METRICS:', val)
            }
          }
        }
        if (statsUrl !== undefined) {
          const token = generateToken(systemAccountEmail, { name: '' }, { service: 'true' })
          const data: ServiceStatistics = {
            serviceName,
            cpu: getCPUInfo(),
            memory: getMemoryInfo(),
            stats: metricsContext.metrics,
            workspaces: ops?.getUsers?.()
          }

          const statData = JSON.stringify(data)

          void fetch(
            concatLink(statsUrl, '/api/v1/statistics') + `/?token=${encodeURIComponent(token)}&name=${serviceId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: statData
            }
          ).catch(handleError)
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
