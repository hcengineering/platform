// Basic performance metrics suite.

import { childMetrics, measure, newMetrics } from './metrics'
import { FullParamsType, MeasureContext, MeasureLogger, Metrics, ParamsType } from './types'

/**
 * @public
 */
export class MeasureMetricsContext implements MeasureContext {
  private readonly name: string
  private readonly params: ParamsType
  logger: MeasureLogger
  metrics: Metrics
  private readonly done: (value?: number) => void

  constructor (
    name: string,
    params: ParamsType,
    fullParams: FullParamsType = {},
    metrics: Metrics = newMetrics(),
    logger?: MeasureLogger
  ) {
    this.name = name
    this.params = params
    this.metrics = metrics
    this.done = measure(metrics, params, fullParams)

    this.logger = logger ?? {
      info: (msg, args) => {
        console.info(msg, ...args)
      },
      error: (msg, args) => {
        console.error(msg, ...args)
      }
    }
  }

  measure (name: string, value: number): void {
    const c = new MeasureMetricsContext('#' + name, {}, {}, childMetrics(this.metrics, ['#' + name]))
    c.done(value)
  }

  newChild (name: string, params: ParamsType, fullParams?: FullParamsType, logger?: MeasureLogger): MeasureContext {
    return new MeasureMetricsContext(name, params, fullParams ?? {}, childMetrics(this.metrics, [name]), logger)
  }

  async with<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType
  ): Promise<T> {
    const c = this.newChild(name, params, fullParams)
    try {
      let value = op(c)
      if (value instanceof Promise) {
        value = await value
      }
      c.end()
      return value
    } catch (err: any) {
      await c.error('Error during:' + name, err)
      throw err
    }
  }

  async error (message: string, ...args: any[]): Promise<void> {
    this.logger.error(message, args)
  }

  async info (message: string, ...args: any[]): Promise<void> {
    this.logger.info(message, args)
  }

  end (): void {
    this.done()
  }
}
