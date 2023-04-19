// Basic performance metrics suite.

import { MetricsData } from '.'
import { Metrics, ParamType } from './types'

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
    time: 0,
    measurements: {},
    params: {}
  }
}

/**
 * Measure with tree expansion. Operation counter will be added only to leaf's.
 * @public
 */
export function measure (metrics: Metrics, params: Record<string, ParamType>): () => void {
  const st = Date.now()
  return () => {
    const ed = Date.now()
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
          time: 0
        }
        params[vKey] = param
      }
      param.time += ed - st
      param.operations++
    }
    // Update leaf data
    metrics.time += ed - st
    metrics.operations++
  }
}

/**
 * @public
 */
export function childMetrics (root: Metrics, path: string[]): Metrics {
  const segments = path
  let oop = root
  for (const p of segments) {
    const v = oop.measurements[p] ?? { operations: 0, time: 0, measurements: {}, params: {} }
    oop.measurements[p] = v
    oop = v
  }
  return oop
}

/**
 * @public
 */
export function metricsAggregate (m: Metrics): Metrics {
  const ms = aggregateMetrics(m.measurements)

  // Use child overage, if there is no top level value specified.
  const keysLen = Object.keys(ms).length
  const childAverage = m.time === 0 && keysLen > 0
  const sumVal: Metrics | undefined = childAverage
    ? Object.values(ms).reduce(
      (p, v) => {
        p.operations += v.operations
        p.time += v.time
        return p
      },
      {
        operations: 0,
        time: 0,
        measurements: ms,
        params: {}
      }
    )
    : undefined
  if (sumVal !== undefined) {
    return {
      ...sumVal,
      measurements: ms,
      params: m.params
    }
  }
  return {
    ...m,
    measurements: ms
  }
}

function aggregateMetrics (m: Record<string, Metrics>): Record<string, Metrics> {
  const result: Record<string, Metrics> = {}
  for (const [k, v] of Object.entries(m).sort((a, b) => b[1].time - a[1].time)) {
    result[k] = metricsAggregate(v)
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
        vv.time / (vv.operations > 0 ? vv.operations : 1)
      } total: ${vv.time} ops: ${vv.operations}`.trim()
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
    m.time / (m.operations > 0 ? m.operations : 1)
  } total: ${m.time} ops: ${m.operations}`.trim()
  r += printMetricsParams(m.params, offset + 4, length)
  r += printMetricsChildren(m.measurements, offset + 4, length)
  return r
}

/**
 * @public
 */
export function metricsToString (metrics: Metrics, name = 'System', length: number): string {
  return toString(name, metricsAggregate(metrics), 0, length)
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
      vv.time / (vv.operations > 0 ? vv.operations : 1),
      vv.time,
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
    [offset, name, m.time / (m.operations > 0 ? m.operations : 1), m.time, m.operations]
  ]
  r.push(...printMetricsParamsRows(m.params, offset + 1))
  r.push(...printMetricsChildrenRows(m.measurements, offset + 1))
  return r
}

/**
 * @public
 */
export function metricsToRows (metrics: Metrics, name = 'System'): (number | string)[][] {
  return toStringRows(name, metricsAggregate(metrics), 0)
}
