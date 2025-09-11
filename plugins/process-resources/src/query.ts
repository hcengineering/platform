// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

import { type QuerySelector } from '@hcengineering/core'
import { getEmbeddedLabel, type IntlString } from '@hcengineering/platform'
import view from '@hcengineering/view-resources/src/plugin'

export interface Mode {
  id: string
  label: IntlString
  query: QuerySelector<any> | string
  parse?: (value: any) => any
  withoutEditor?: boolean
}

const Equal: Mode = {
  id: 'equals',
  label: getEmbeddedLabel('='),
  query: '$val'
}

const NotEqual: Mode = {
  id: 'notEquals',
  label: getEmbeddedLabel('≠'),
  query: { $ne: '$val' }
}

const GT: Mode = {
  id: 'greaterThan',
  label: getEmbeddedLabel('>'),
  query: { $gt: '$val' as any }
}

const LT: Mode = {
  id: 'lessThan',
  label: getEmbeddedLabel('<'),
  query: { $lt: '$val' as any }
}

const Exists: Mode = {
  id: 'exists',
  label: view.string.ValueIsSet,
  query: { $exists: true },
  withoutEditor: true
}

const StringContains: Mode = {
  id: 'contains',
  label: view.string.Contains,
  query: { $like: '%$val%' },
  parse: (value: any): any => {
    if (typeof value !== 'string') return value
    return value.startsWith('%') && value.endsWith('%') ? value.slice(1, -1) : value
  }
}

const ArrayAll: Mode = {
  id: 'arrayAll',
  label: view.string.FilterArrayAll,
  query: { $all: '$val' }
}

const ArrayAny: Mode = {
  id: 'arrayAny',
  label: view.string.FilterArrayAny,
  query: { $in: '$val' as any }
}

const ArrayNotIncludes: Mode = {
  id: 'arrayNotIncludes',
  label: view.string.NotContains,
  query: { $nin: '$val' as any }
}

const ArraySizeEquals: Mode = {
  id: 'sizeEquals',
  label: getEmbeddedLabel('='),
  query: { $size: '$val' as any }
}

const ArraySizeGt: Mode = {
  id: 'sizeGt',
  label: getEmbeddedLabel('>'),
  query: { $size: { $gt: '$val' as any } }
}

const ArraySizeGte: Mode = {
  id: 'sizeGte',
  label: getEmbeddedLabel('≥'),
  query: { $size: { $gte: '$val' as any } }
}

const ArraySizeLt: Mode = {
  id: 'sizeLt',
  label: getEmbeddedLabel('<'),
  query: { $size: { $lt: '$val' as any } }
}

const ArraySizeLte: Mode = {
  id: 'sizeLte',
  label: getEmbeddedLabel('≤'),
  query: { $size: { $lte: '$val' as any } }
}

export const Modes: Record<string, Mode> = {
  Exists,
  Equal,
  NotEqual,
  StringContains,
  GT,
  LT,
  ArrayAll,
  ArrayAny,
  ArrayNotIncludes,
  ArraySizeEquals,
  ArraySizeGt,
  ArraySizeGte,
  ArraySizeLt,
  ArraySizeLte
} as const

export function parseValue (modes: Mode[], value: any): [any, Mode] {
  if (value == null) {
    return [value, modes[0]]
  }
  for (const mode of modes) {
    if (typeof mode.query === 'string' && typeof value !== 'object') {
      return [value, mode]
    }
    let obj1: any = mode.query
    let obj2: any = value
    while (typeof obj1 === 'object' && typeof obj2 === 'object' && Object.keys(obj1)[0] === Object.keys(obj2)[0]) {
      const key1 = Object.keys(obj1)[0]
      const key2 = Object.keys(obj2)[0]
      if (
        ['string', 'boolean'].includes(typeof obj1[key1]) &&
        (typeof obj2[key2] !== 'object' || Array.isArray(obj2[key2]))
      ) {
        if (mode.parse !== undefined) {
          return [mode.parse(obj2[key2]), mode]
        }
        return [mode.withoutEditor === true ? undefined : obj2[key2], mode]
      }
      obj1 = obj1[key1]
      obj2 = obj2[key2]
    }
  }
  return [value, modes[0]]
}

export function buildResult (mode: Mode, value: any): any {
  let q = mode.query
  if (typeof q !== 'object') return value
  const result: any = {}
  let res = result
  while (true) {
    if (typeof q === 'object') {
      const key = Object.keys(q)[0]
      const v: any = (q as any)[key]
      if (typeof v !== 'object') {
        if (typeof value === 'string' && typeof v === 'string') {
          res[key] = v.replace('$val', value)
        } else {
          res[key] = mode.withoutEditor === true ? v : value ?? v
        }
        return result
      }
      q = v
      res[key] = {}
      res = res[key]
    } else {
      break
    }
  }
  return result
}
