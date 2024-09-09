import { MeasureContext, MeasureLogger, ParamType, ParamsType, type FullParamsType } from '@hcengineering/core'
import apm, { Agent, Span, Transaction } from 'elastic-apm-node'

/**
 * @public
 */
export function createAPMAgent (apmUrl: string): Agent {
  const agent: Agent = apm.start({
    // Override the service name from package.json
    // Allowed characters: a-z, A-Z, 0-9, -, _, and space
    serviceName: 'transactor',

    // Use if APM Server requires a secret token
    secretToken: '',

    // Set the custom APM Server URL (default: http://localhost:8200)
    serverUrl: apmUrl,
    logLevel: 'trace'
  })
  return agent
}

/**
 * @public
 */
export class APMMeasureContext implements MeasureContext {
  logger: MeasureLogger
  private readonly transaction?: Transaction | Span
  private readonly parentTx?: Transaction | Span
  contextData = {}
  constructor (
    private readonly agent: Agent,
    name: string,
    params: Record<string, ParamType>,
    parentTx?: Transaction | Span,
    noTransaction?: boolean,
    readonly parent?: MeasureContext
  ) {
    this.parentTx = parentTx
    this.logger = {
      info: (msg, args) => {
        agent.logger.info({ message: msg, ...args })
      },
      error: (msg, args) => {
        agent.logger.error({ message: msg, ...args })
      },
      warn: (msg, args) => {
        agent.logger.warn({ message: msg, ...args })
      },
      logOperation (operation, time, params) {},
      close: async () => {}
    }
    if (!(noTransaction ?? false)) {
      if (this.parentTx === undefined) {
        this.transaction = agent.startTransaction(name) ?? undefined
      } else {
        this.transaction = agent.startSpan(name, { childOf: this.parentTx }) ?? undefined
      }
      for (const [k, v] of Object.entries(params)) {
        this.transaction?.setLabel(k, v)
      }
    }
  }

  newChild (name: string, params: Record<string, ParamType>): MeasureContext {
    return new APMMeasureContext(this.agent, name, params, this.transaction, undefined, this)
  }

  measure (name: string, value: number): void {}

  async with<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: FullParamsType | (() => FullParamsType)
  ): Promise<T> {
    const c = this.newChild(name, params)
    try {
      let value = op(c)
      if (value instanceof Promise) {
        value = await value
      }
      return value
    } catch (err: any) {
      c.error(err)
      throw err
    } finally {
      c.end()
    }
  }

  withSync<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T,
    fullParams?: FullParamsType | (() => FullParamsType)
  ): T {
    const c = this.newChild(name, params)
    try {
      return op(c)
    } catch (err: any) {
      c.error(err)
      throw err
    } finally {
      c.end()
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

  error (message: string, ...args: any[]): void {
    this.logger.error(message, args)
    this.agent.captureError({ message, params: args })
  }

  info (message: string, ...args: any[]): void {
    this.logger.info(message, args)
  }

  warn (message: string, ...args: any[]): void {
    this.logger.warn(message, args)
  }

  end (): void {
    this.transaction?.end()
  }
}
