/**
 * @public
 */
export type ParamType = string | number | boolean | undefined

/**
  * @public
  */
export interface MetricsData {
  operations: number
  time: number
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
  newChild: (name: string, params: Record<string, ParamType>) => MeasureContext

  with: <T>(name: string, params: Record<string, ParamType>, op: (ctx: MeasureContext) => T | Promise<T>) => Promise<T>

  logger: MeasureLogger

  // Capture error
  error: (err: Error | string | any) => Promise<void>

  // Mark current context as complete
  end: () => void
}
