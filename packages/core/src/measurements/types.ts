/**
 * @public
 */
export type ParamType = string | number | boolean | undefined

/**
 * @public
 */
export type ParamsType = Record<string, ParamType>

/**
 * @public
 */
export type FullParamsType = Record<string, any>

/**
 * @public
 */
export interface MetricsData {
  operations: number
  value: number
  topResult?: {
    value: number
    params: FullParamsType
  }[]
}

export interface OperationLogEntry {
  op: string
  params: ParamsType
  start: number
  end: number
}
export interface OperationLog {
  ops: OperationLogEntry[]
  start: number
  end: number
}

/**
 * @public
 */
export interface Metrics extends MetricsData {
  namedParams: ParamsType
  params: Record<string, Record<string, MetricsData>>
  measurements: Record<string, Metrics>

  opLog?: Record<string, OperationLog>
}

/**
 * @public
 */
export interface MeasureLogger {
  info: (message: string, obj?: Record<string, any>) => void
  error: (message: string, obj?: Record<string, any>) => void

  warn: (message: string, obj?: Record<string, any>) => void

  logOperation: (operation: string, time: number, params: ParamsType) => void

  childLogger?: (name: string, params: Record<string, any>) => MeasureLogger

  close: () => Promise<void>
}
/**
 * @public
 */
export interface MeasureContext<Q = any> {
  id?: string

  // Context data will be copied referenced for all child contexts.
  contextData: Q
  // Create a child metrics context
  newChild: (name: string, params: ParamsType, fullParams?: FullParamsType, logger?: MeasureLogger) => MeasureContext

  metrics?: Metrics

  with: <T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext<Q>) => T | Promise<T>,
    fullParams?: FullParamsType | (() => FullParamsType)
  ) => Promise<T>

  withSync: <T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext<Q>) => T,
    fullParams?: FullParamsType | (() => FullParamsType)
  ) => T

  withLog: <T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext<Q>) => T | Promise<T>,
    fullParams?: FullParamsType
  ) => Promise<T>

  logger: MeasureLogger

  parent?: MeasureContext

  measure: (name: string, value: number, override?: boolean) => void

  // Capture error
  error: (message: string, obj?: Record<string, any>) => void
  info: (message: string, obj?: Record<string, any>) => void
  warn: (message: string, obj?: Record<string, any>) => void

  // Mark current context as complete
  // If no value is passed, time difference will be used.
  end: (value?: number) => void
}
