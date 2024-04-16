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
    this.done = measure(metrics, params, fullParams, (spend) => {
      this.logger.logOperation(this.name, spend, { ...params, ...fullParams })
    })

    const errorPrinter = ({ message, stack, ...rest }: Error): object => ({
      message,
      stack,
      ...rest
    })
    function replacer (value: any): any {
      return value instanceof Error ? errorPrinter(value) : value
    }

    this.logger = logger ?? {
      info: (msg, args) => {
        console.info(msg, ...Object.entries(args ?? {}).map((it) => `${it[0]}=${JSON.stringify(replacer(it[1]))}`))
      },
      error: (msg, args) => {
        console.error(msg, ...Object.entries(args ?? {}).map((it) => `${it[0]}=${JSON.stringify(replacer(it[1]))}`))
      },
      close: async () => {},
      logOperation: (operation, time, params) => {}
    }
  }

  measure (name: string, value: number): void {
    const c = new MeasureMetricsContext('#' + name, {}, {}, childMetrics(this.metrics, ['#' + name]), this.logger)
    c.done(value)
  }

  newChild (name: string, params: ParamsType, fullParams?: FullParamsType, logger?: MeasureLogger): MeasureContext {
    return new MeasureMetricsContext(
      name,
      params,
      fullParams ?? {},
      childMetrics(this.metrics, [name]),
      logger ?? this.logger
    )
  }

  async with<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType
  ): Promise<T> {
    const c = this.newChild(name, params, fullParams, this.logger)
    try {
      let value = op(c)
      if (value instanceof Promise) {
        value = await value
      }
      c.end()
      return value
    } catch (err: any) {
      await c.error('Error during:' + name, { err })
      throw err
    }
  }

  async withLog<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType
  ): Promise<T> {
    const st = Date.now()
    const r = await this.with(name, params, op, fullParams)
    this.logger.logOperation(name, Date.now() - st, { ...params, ...fullParams })
    return r
  }

  async error (message: string, args?: Record<string, any>): Promise<void> {
    this.logger.error(message, { ...this.params, ...args })
  }

  async info (message: string, args?: Record<string, any>): Promise<void> {
    this.logger.info(message, { ...this.params, ...args })
  }

  end (): void {
    this.done()
  }
}
