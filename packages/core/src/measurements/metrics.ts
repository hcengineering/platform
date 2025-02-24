// Basic performance metrics suite.

import { MetricsData } from '.'
import { platformNow } from '../utils'
import { FullParamsType, Metrics, ParamsType } from './types'

/**
 * @public
 */
export const globals: Metrics = newMetrics()

/**
 * @public
 * @returns
 */
export function newMetrics (): Metrics {
  return {
    operations: 0,
    value: 0,
    measurements: {},
    params: {},
    namedParams: {}
  }
}

function getUpdatedTopResult (
  current: Metrics['topResult'],
  time: number,
  params: FullParamsType
): Metrics['topResult'] {
  if (time === 0) {
    return current
  }
  const result: Metrics['topResult'] = current ?? []

  const newValue = {
    value: time,
    params
  }

  if (result.length > 6) {
    if (result[0].value < newValue.value) {
      result[0] = newValue
      return result
    }
    if (result[result.length - 1].value > newValue.value) {
      result[result.length - 1] = newValue
      return result
    }

    // Shift the middle
    return [result[0], newValue, ...result.slice(1, 3), result[5]]
  } else {
    result.push(newValue)
    return result
  }
}

/**
 * Measure with tree expansion. Operation counter will be added only to leaf's.
 * @public
 */
export function measure (
  metrics: Metrics,
  params: ParamsType,
  fullParams: FullParamsType | (() => FullParamsType) = {},
  endOp?: (spend: number) => void
): () => void {
  const st = platformNow()
  return () => {
    updateMeasure(metrics, st, params, fullParams, endOp)
  }
}
export function updateMeasure (
  metrics: Metrics,
  st: number,
  params: ParamsType,
  fullParams: FullParamsType | (() => FullParamsType),
  endOp?: (spend: number) => void,
  value?: number,
  override?: boolean
): void {
  const ed = platformNow()

  const fParams = typeof fullParams === 'function' ? fullParams() : fullParams
  // Update params if required
  for (const [k, v] of Object.entries(params)) {
    let params = metrics.params[k]
    if (params === undefined) {
      params = {}
      metrics.params[k] = params
    }
    const vKey = `${v?.toString() ?? ''}`
    let param = params[vKey]
    if (param === undefined) {
      param = {
        operations: 0,
        value: 0
      }
      params[vKey] = param
    }
    if (override === true) {
      param.operations = value ?? ed - st
    } else {
      param.value += value ?? ed - st
      param.operations++
    }
    // Do not update top results for params.
    // param.topResult = getUpdatedTopResult(param.topResult, ed - st, fParams)
  }
  // Update leaf data
  if (override === true) {
    metrics.operations = value ?? ed - st
  } else {
    metrics.value += value ?? ed - st
    metrics.operations++
  }

  metrics.topResult = getUpdatedTopResult(metrics.topResult, ed - st, fParams)
  endOp?.(ed - st)
}

/**
 * @public
 */
export function childMetrics (root: Metrics, path: string[]): Metrics {
  const segments = path
  let oop = root
  for (const p of segments) {
    const v = oop.measurements[p] ?? { operations: 0, value: 0, measurements: {}, params: {} }
    oop.measurements[p] = v
    oop = v
  }
  return oop
}

/**
 * @public
 */
export function metricsAggregate (m: Metrics, limit: number = -1, roundMath: boolean = false): Metrics {
  let ms = aggregateMetrics(m.measurements, limit)

  // Use child overage, if there is no top level value specified.
  const me = Object.entries(ms)
  const sumVal: number =
    (me.length === 0 ? m.value : 0) +
    me
      .filter((it) => !it[0].startsWith('#'))
      .map((it) => it[1])
      .reduce((p, v) => {
        return p + v.value
      }, 0)

  if (limit !== -1) {
    // We need to keep only top limit items in ms
    if (Object.keys(ms).length > 0) {
      const newMs: typeof ms = {}
      let added = 0
      for (const [k, v] of Object.entries(ms)) {
        newMs[k] = v
        added++
        if (added >= limit) {
          break
        }
      }
      ms = newMs
    }
  }

  return {
    operations: m.operations,
    measurements: ms,
    params: m.params,
    value: sumVal,
    topResult: m.topResult,
    namedParams: m.namedParams,
    opLog: m.opLog
  }
}

function aggregateMetrics (m: Record<string, Metrics>, limit: number = -1): Record<string, Metrics> {
  const result: Record<string, Metrics> = {}
  for (const [k, v] of Object.entries(m).sort((a, b) => b[1].value - a[1].value)) {
    result[k] = metricsAggregate(v, limit)
  }
  return result
}

function toLen (val: string, sep: string, len: number): string {
  while (val.length < len) {
    val += sep
  }
  return val
}

function printMetricsChildren (params: Record<string, Metrics>, offset: number, length: number): string {
  let r = ''
  if (Object.keys(params).length > 0) {
    r += '\n' + toLen('', ' ', offset)
    r += Object.entries(params)
      .map(([k, vv]) => toString(k, vv, offset, length))
      .join('\n' + toLen('', ' ', offset))
  }
  return r
}

function printMetricsParams (
  params: Record<string, Record<string, MetricsData>>,
  offset: number,
  length: number
): string {
  let r = ''
  const joinP = (key: string, data: Record<string, MetricsData>): string[] => {
    return Object.entries(data).map(([k, vv]) =>
      `${toLen('', ' ', offset)}${toLen(key + '=' + k, '-', length - offset)}: avg ${
        vv.value / (vv.operations > 0 ? vv.operations : 1)
      } total: ${vv.value} ops: ${vv.operations}`.trim()
    )
  }
  const joinParams = Object.entries(params).reduce<string[]>((p, c) => [...p, ...joinP(c[0], c[1])], [])
  if (Object.keys(joinParams).length > 0) {
    r += '\n' + toLen('', ' ', offset)
    r += joinParams.join('\n' + toLen('', ' ', offset))
  }
  return r
}

function toString (name: string, m: Metrics, offset: number, length: number): string {
  let r = `${toLen('', ' ', offset)}${toLen(name, '-', length - offset)}: avg ${
    m.value / (m.operations > 0 ? m.operations : 1)
  } total: ${m.value} ops: ${m.operations}`.trim()
  r += printMetricsParams(m.params, offset + 4, length)
  r += printMetricsChildren(m.measurements, offset + 4, length)
  return r
}

function toJson (m: Metrics): any {
  const obj: any = {
    $total: m.value,
    $ops: m.operations
  }
  if (m.operations > 1) {
    obj.avg = Math.round((m.value / (m.operations > 0 ? m.operations : 1)) * 100) / 100
  }
  if (Object.keys(m.params).length > 0) {
    obj.params = m.params
  }
  for (const [k, v] of Object.entries(m.measurements ?? {})) {
    obj[
      `${k} ${v.value} ${v.operations} ${
        v.operations > 1 ? Math.round((v.value / (v.operations > 0 ? m.operations : 1)) * 100) / 100 : ''
      }`
    ] = toJson(v)
  }

  return obj
}

/**
 * @public
 */
export function metricsToString (metrics: Metrics, name = 'System', length: number): string {
  return toString(name, metricsAggregate(metrics, 50, true), 0, length)
}

export function metricsToJson (metrics: Metrics): any {
  return toJson(metricsAggregate(metrics))
}

function printMetricsParamsRows (
  params: Record<string, Record<string, MetricsData>>,
  offset: number
): (string | number)[][] {
  const r: (string | number)[][] = []
  function joinP (key: string, data: Record<string, MetricsData>): (string | number)[][] {
    return Object.entries(data).map(([k, vv]) => [
      offset,
      `${key}=${k}`,
      Math.round((vv.value / (vv.operations > 0 ? vv.operations : 1)) * 100) / 100,
      Math.round(vv.value * 100) / 100,
      vv.operations
    ])
  }
  for (const [k, v] of Object.entries(params)) {
    r.push(...joinP(k, v))
  }
  return r
}

function printMetricsChildrenRows (params: Record<string, Metrics>, offset: number): (string | number)[][] {
  const r: (string | number)[][] = []
  if (Object.keys(params).length > 0) {
    Object.entries(params).forEach(([k, vv]) => r.push(...toStringRows(k, vv, offset)))
  }
  return r
}

function toStringRows (name: string, m: Metrics, offset: number): (number | string)[][] {
  const r: (number | string)[][] = [
    [
      offset,
      name,
      Math.round((m.value / (m.operations > 0 ? m.operations : 1)) * 100) / 100,
      Math.round(m.value * 100) / 100,
      m.operations
    ]
  ]
  r.push(...printMetricsParamsRows(m.params, offset + 1))
  r.push(...printMetricsChildrenRows(m.measurements, offset + 1))
  return r
}

/**
 * @public
 */
export function metricsToRows (metrics: Metrics, name = 'System'): (number | string)[][] {
  return toStringRows(name, metricsAggregate(metrics, 50, true), 0)
}
