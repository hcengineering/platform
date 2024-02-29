import { MeasureContext, MeasureLogger, ParamType, ParamsType } from '@hcengineering/core'
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
  private readonly parent?: Transaction | Span
  constructor (
    private readonly agent: Agent,
    name: string,
    params: Record<string, ParamType>,
    parent?: Transaction | Span,
    noTransaction?: boolean
  ) {
    this.parent = parent
    this.logger = {
      info: (msg, args) => {
        agent.logger.info({ message: msg, ...args })
      },
      error: (msg, args) => {
        agent.logger.error({ message: msg, ...args })
      },
      logOperation (operation, time, params) {},
      close: async () => {}
    }
    if (!(noTransaction ?? false)) {
      if (this.parent === undefined) {
        this.transaction = agent.startTransaction(name) ?? undefined
      } else {
        this.transaction = agent.startSpan(name, { childOf: this.parent }) ?? undefined
      }
      for (const [k, v] of Object.entries(params)) {
        this.transaction?.setLabel(k, v)
      }
    }
  }

  newChild (name: string, params: Record<string, ParamType>): MeasureContext {
    return new APMMeasureContext(this.agent, name, params, this.transaction)
  }

  measure (name: string, value: number): void {}

  async with<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType
  ): Promise<T> {
    const c = this.newChild(name, params)
    try {
      let value = op(c)
      if (value instanceof Promise) {
        value = await value
      }
      c.end()
      return value
    } catch (err: any) {
      await c.error(err)
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

  async error (message: string, ...args: any[]): Promise<void> {
    this.logger.error(message, args)

    await new Promise<void>((resolve) => {
      this.agent.captureError({ message, params: args }, () => {
        resolve()
      })
    })
  }

  async info (message: string, ...args: any[]): Promise<void> {
    this.logger.info(message, args)
  }

  end (): void {
    this.transaction?.end()
  }
}
