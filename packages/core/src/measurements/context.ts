// Basic performance metrics suite.

import { generateId } from '../utils'
import { childMetrics, newMetrics, updateMeasure } from './metrics'
import {
  FullParamsType,
  MeasureContext,
  MeasureLogger,
  Metrics,
  ParamsType,
  type OperationLog,
  type OperationLogEntry
} from './types'

const errorPrinter = ({ message, stack, ...rest }: Error): object => ({
  message,
  stack,
  ...rest
})
function replacer (value: any): any {
  return value instanceof Error ? errorPrinter(value) : value
}

const consoleLogger = (logParams: Record<string, any>): MeasureLogger => ({
  info: (msg, args) => {
    console.info(
      msg,
      ...Object.entries({ ...(args ?? {}), ...(logParams ?? {}) }).map(
        (it) => `${it[0]}=${JSON.stringify(replacer(it[1]))}`
      )
    )
  },
  error: (msg, args) => {
    console.error(
      msg,
      ...Object.entries({ ...(args ?? {}), ...(logParams ?? {}) }).map(
        (it) => `${it[0]}=${JSON.stringify(replacer(it[1]))}`
      )
    )
  },
  warn: (msg, args) => {
    console.warn(msg, ...Object.entries(args ?? {}).map((it) => `${it[0]}=${JSON.stringify(replacer(it[1]))}`))
  },
  close: async () => {},
  logOperation: (operation, time, params) => {}
})

const noParamsLogger = consoleLogger({})

/**
 * @public
 */
export class MeasureMetricsContext implements MeasureContext {
  private readonly name: string
  private readonly params: ParamsType

  private readonly fullParams: FullParamsType | (() => FullParamsType) = {}
  logger: MeasureLogger
  metrics: Metrics

  st = Date.now()
  contextData: object = {}
  private done (value?: number, override?: boolean): void {
    updateMeasure(
      this.metrics,
      this.st,
      this.params,
      this.fullParams,
      (spend) => {
        this.logger.logOperation(this.name, spend, {
          ...this.params,
          ...(typeof this.fullParams === 'function' ? this.fullParams() : this.fullParams),
          ...this.fullParams,
          ...(this.logParams ?? {})
        })
      },
      value,
      override
    )
  }

  constructor (
    name: string,
    params: ParamsType,
    fullParams: FullParamsType | (() => FullParamsType) = {},
    metrics: Metrics = newMetrics(),
    logger?: MeasureLogger,
    readonly parent?: MeasureContext,
    readonly logParams?: ParamsType
  ) {
    this.name = name
    this.params = params
    this.fullParams = fullParams
    this.metrics = metrics
    this.metrics.namedParams = this.metrics.namedParams ?? {}
    for (const [k, v] of Object.entries(params)) {
      if (this.metrics.namedParams[k] !== v) {
        this.metrics.namedParams[k] = v
      } else {
        this.metrics.namedParams[k] = '*'
      }
    }

    this.logger = logger ?? (this.logParams != null ? consoleLogger(this.logParams ?? {}) : noParamsLogger)
  }

  measure (name: string, value: number, override?: boolean): void {
    const c = new MeasureMetricsContext('#' + name, {}, {}, childMetrics(this.metrics, ['#' + name]), this.logger, this)
    c.contextData = this.contextData
    c.done(value, override)
  }

  newChild (
    name: string,
    params: ParamsType,
    fullParams?: FullParamsType | (() => FullParamsType),
    logger?: MeasureLogger
  ): MeasureContext {
    const result = new MeasureMetricsContext(
      name,
      params,
      fullParams ?? {},
      childMetrics(this.metrics, [name]),
      logger ?? this.logger,
      this,
      this.logParams
    )
    result.contextData = this.contextData
    return result
  }

  with<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType | (() => FullParamsType)
  ): Promise<T> {
    const c = this.newChild(name, params, fullParams, this.logger)
    let needFinally = true
    try {
      const value = op(c)
      if (value != null && value instanceof Promise) {
        needFinally = false
        void value.finally(() => {
          c.end()
        })
        return value
      } else {
        return Promise.resolve(value)
      }
    } finally {
      if (needFinally) {
        c.end()
      }
    }
  }

  withSync<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T,
    fullParams?: ParamsType | (() => FullParamsType)
  ): T {
    const c = this.newChild(name, params, fullParams, this.logger)
    try {
      return op(c)
    } finally {
      c.end()
    }
  }

  withLog<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType
  ): Promise<T> {
    const st = Date.now()
    const r = this.with(name, params, op, fullParams)
    void r.finally(() => {
      this.logger.logOperation(name, Date.now() - st, { ...params, ...fullParams })
    })
    return r
  }

  error (message: string, args?: Record<string, any>): void {
    this.logger.error(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  info (message: string, args?: Record<string, any>): void {
    this.logger.info(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  warn (message: string, args?: Record<string, any>): void {
    this.logger.warn(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  end (): void {
    this.done()
  }
}

/**
 * Allow to use decorator for context enabled functions
 */
export function withContext (name: string, params: ParamsType = {}): any {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
    const originalMethod = descriptor.value
    descriptor.value = function (...args: any[]): Promise<any> {
      const ctx = args[0] as MeasureContext
      return ctx.with(name, params, (ctx) => originalMethod.apply(this, [ctx, ...args.slice(1)]) as Promise<any>)
    }
    return descriptor
  }
}

let operationProfiling = false

export function setOperationLogProfiling (value: boolean): void {
  operationProfiling = value
}

export function registerOperationLog (ctx: MeasureContext): { opLogMetrics?: Metrics, op?: OperationLog } {
  if (!operationProfiling) {
    return {}
  }
  const op: OperationLog = { start: Date.now(), ops: [], end: -1 }
  let opLogMetrics: Metrics | undefined
  ctx.id = generateId()
  if (ctx.metrics !== undefined) {
    if (ctx.metrics.opLog === undefined) {
      ctx.metrics.opLog = {}
    }
    ctx.metrics.opLog[ctx.id] = op
    opLogMetrics = ctx.metrics
  }
  return { opLogMetrics, op }
}

export function updateOperationLog (opLogMetrics: Metrics | undefined, op: OperationLog | undefined): void {
  if (!operationProfiling) {
    return
  }
  if (op !== undefined) {
    op.end = Date.now()
  }
  // We should keep only longest one entry
  if (opLogMetrics?.opLog !== undefined) {
    const entries = Object.entries(opLogMetrics.opLog)

    const incomplete = entries.filter((it) => it[1].end === -1)
    const complete = entries.filter((it) => it[1].end !== -1)
    complete.sort((a, b) => a[1].start - b[1].start)
    if (complete.length > 30) {
      complete.splice(0, complete.length - 30)
    }

    opLogMetrics.opLog = Object.fromEntries(incomplete.concat(complete))
  }
}

export function addOperation<T> (
  ctx: MeasureContext,
  name: string,
  params: ParamsType,
  op: (ctx: MeasureContext) => Promise<T>,
  fullParams?: FullParamsType
): Promise<T> {
  if (!operationProfiling) {
    return op(ctx)
  }
  let opEntry: OperationLogEntry | undefined

  let p: MeasureContext | undefined = ctx
  let opLogMetrics: Metrics | undefined
  let id: string | undefined

  while (p !== undefined) {
    if (p.metrics?.opLog !== undefined) {
      opLogMetrics = p.metrics
    }
    if (id === undefined && p.id !== undefined) {
      id = p.id
    }
    p = p.parent
  }
  const opLog = id !== undefined ? opLogMetrics?.opLog?.[id] : undefined

  if (opLog !== undefined) {
    opEntry = {
      op: name,
      start: Date.now(),
      params: {},
      end: -1
    }
  }
  const result = op(ctx)
  if (opEntry !== undefined && opLog !== undefined) {
    void result.finally(() => {
      if (opEntry !== undefined && opLog !== undefined) {
        opEntry.end = Date.now()
        opEntry.params = { ...params, ...(typeof fullParams === 'function' ? fullParams() : fullParams) }
        opLog.ops.push(opEntry)
      }
    })
  }
  return result
}
