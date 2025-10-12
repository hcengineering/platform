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
import { type AnyComponent } from '@hcengineering/ui'
import { viewPlugin as view } from '@hcengineering/view-resources'
import plugin from './plugin'

export interface Mode {
  id: string
  label: IntlString
  query: QuerySelector<any> | string
  parse?: (value: any) => any
  withoutEditor?: boolean
  editor?: AnyComponent
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

const Between: Mode = {
  id: 'between',
  label: view.string.Between,
  query: { $gte: '$val[0]' as any, $lte: '$val[1]' as any },
  parse: (value: any): any => {
    return [value.$gte, value.$lte]
  },
  editor: plugin.criteriaEditor.RangeCriteria
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
  query: { $size: '$val' as any },
  editor: plugin.criteriaEditor.ArraySizeCriteria
}

const ArraySizeGt: Mode = {
  id: 'sizeGt',
  label: getEmbeddedLabel('>'),
  query: { $size: { $gt: '$val' as any } },
  editor: plugin.criteriaEditor.ArraySizeCriteria
}

const ArraySizeGte: Mode = {
  id: 'sizeGte',
  label: getEmbeddedLabel('≥'),
  query: { $size: { $gte: '$val' as any } },
  editor: plugin.criteriaEditor.ArraySizeCriteria
}

const ArraySizeLt: Mode = {
  id: 'sizeLt',
  label: getEmbeddedLabel('<'),
  query: { $size: { $lt: '$val' as any } },
  editor: plugin.criteriaEditor.ArraySizeCriteria
}

const ArraySizeLte: Mode = {
  id: 'sizeLte',
  label: getEmbeddedLabel('≤'),
  query: { $size: { $lte: '$val' as any } },
  editor: plugin.criteriaEditor.ArraySizeCriteria
}

export const Modes = {
  Exists,
  Equal,
  NotEqual,
  StringContains,
  GT,
  LT,
  Between,
  ArrayAll,
  ArrayAny,
  ArrayNotIncludes,
  ArraySizeEquals,
  ArraySizeGt,
  ArraySizeGte,
  ArraySizeLt,
  ArraySizeLte
} as const

export type ModeId = keyof typeof Modes

function hasSameKeys (target: any, value: any): boolean {
  if (typeof target === 'object' && target !== null && typeof value === 'object' && value !== null) {
    const keys1 = Object.keys(target)
    const keys2 = Object.keys(value)

    if (keys1.length !== keys2.length) return false
    for (const k of keys1) {
      if (!keys2.includes(k)) return false
    }

    for (const k of keys1) {
      if (!hasSameKeys(target[k], value[k])) return false
    }
    return true
  } else {
    return typeof target !== 'object' && typeof value !== 'object'
  }
}

function isModeMatch (mode: Mode, value: any): boolean {
  if (typeof mode.query !== 'object') return typeof value !== 'object' || Array.isArray(value)
  if (typeof mode.query === 'object' && (typeof value !== 'object' || Array.isArray(value))) return false
  return hasSameKeys(mode.query, value)
}

function getValue (_value: any): any {
  let value = _value
  while (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1) {
    value = value[Object.keys(value)[0]]
  }
  return value
}

export function parseValue (modes: Mode[], value: any): [any, Mode] {
  if (value == null) {
    return [value, modes[0]]
  }
  for (const mode of modes) {
    if (isModeMatch(mode, value)) {
      if (mode.parse != null) {
        return [mode.parse(getValue(value)), mode]
      }

      return [getValue(value), mode]
    }
  }
  return [value, modes[0]]
}

export function buildResult (mode: Mode, value: any): any {
  if (typeof mode.query !== 'object') return value
  const res = JSON.parse(JSON.stringify(mode.query))
  fillResult(mode, res, value)
  return res
}

function fillResult (mode: Mode, obj: any, value: any): void {
  if (typeof obj !== 'object') return
  for (const key in obj) {
    const v: any = obj[key]
    if (typeof v === 'object') {
      fillResult(mode, v, value)
    } else {
      if (typeof value === 'string' && typeof v === 'string') {
        obj[key] = v.replace('$val', value)
      } else if (typeof v === 'string' && v === '$val') {
        obj[key] = value
      } else if (typeof v === 'string' && v.startsWith('$val[')) {
        const index = parseInt(v.slice(5, -1))
        if (Array.isArray(value) && !isNaN(index) && index >= 0 && index < value.length) {
          obj[key] = value[index]
        } else {
          obj[key] = undefined
        }
      } else {
        obj[key] = mode.withoutEditor === true ? v : (value ?? v)
      }
    }
  }
}
