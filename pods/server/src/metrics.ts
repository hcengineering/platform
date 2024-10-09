import { type MeasureContext, MeasureMetricsContext, metricsToString, newMetrics } from '@hcengineering/core'
import { writeFile } from 'fs/promises'

const metricsFile = process.env.METRICS_FILE
// const logsRoot = process.env.LOGS_ROOT
const metricsConsole = (process.env.METRICS_CONSOLE ?? 'false') === 'true'

const METRICS_UPDATE_INTERVAL = !metricsConsole ? 1000 : 60000

/**
 * @public
 */
let metricsContext: MeasureContext | undefined

/**
 * @public
 */
export function getMetricsContext (factory?: () => MeasureMetricsContext): MeasureContext {
  if (metricsContext !== undefined) {
    return metricsContext
  }

  const metrics = newMetrics()
  if (factory !== undefined) {
    metricsContext = factory()
  } else {
    metricsContext = new MeasureMetricsContext('System', {}, {}, metrics)
  }

  if (metricsFile !== undefined || metricsConsole) {
    console.info('storing measurements into local file', metricsFile)
    let oldMetricsValue = ''

    const intTimer = setInterval(() => {
      const val = metricsToString(metrics, 'System', 140)
      if (val !== oldMetricsValue) {
        oldMetricsValue = val
        if (metricsFile !== undefined) {
          writeFile(metricsFile, val).catch((err) => {
            console.error(err)
          })
        }
        if (metricsConsole) {
          console.info('METRICS:', val)
        }
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
