import { MeasureMetricsContext, metricsToString, newMetrics } from '@hcengineering/core'
import { writeFile } from 'fs/promises'

const metricsFile = process.env.METRICS_FILE
const metricsConsole = (process.env.METRICS_CONSOLE ?? 'false') === 'true'

const METRICS_UPDATE_INTERVAL = 30000

const metrics = newMetrics()
export const metricsContext = new MeasureMetricsContext('System', {}, metrics)

if (metricsFile !== undefined || metricsConsole) {
  console.info('storing measurements into local file', metricsFile)
  let oldMetricsValue = ''

  const intTimer = setInterval(() => {
    const val = metricsToString(metrics)
    if (val !== oldMetricsValue) {
      oldMetricsValue = val
      if (metricsFile !== undefined) {
        writeFile(metricsFile, val).catch((err) => console.error(err))
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
