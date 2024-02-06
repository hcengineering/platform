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

/**
 * @public
 */
export interface Metrics extends MetricsData {
  params: Record<string, Record<string, MetricsData>>
  measurements: Record<string, Metrics>
}

/**
 * @public
 */
export interface MeasureLogger {
  info: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
}
/**
 * @public
 */
export interface MeasureContext {
  // Create a child metrics context
  newChild: (name: string, params: ParamsType, fullParams?: FullParamsType, logger?: MeasureLogger) => MeasureContext

  with: <T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: FullParamsType
  ) => Promise<T>

  logger: MeasureLogger

  measure: (name: string, value: number) => void

  // Capture error
  error: (message: string, ...args: any[]) => Promise<void>
  info: (message: string, ...args: any[]) => Promise<void>

  // Mark current context as complete
  // If no value is passed, time difference will be used.
  end: (value?: number) => void
}
