//
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
//

import { Doc, Timestamp } from '@hcengineering/core'
import { Execution, parseContext } from '@hcengineering/process'
import { TriggerControl } from '@hcengineering/server-core'
import { getAttributeValue } from './utils'

// #region ArrayReduce

export function FirstValue (value: Doc[]): Doc {
  if (!Array.isArray(value)) return value
  return value[0]
}

export function LastValue (value: Doc[]): Doc {
  if (!Array.isArray(value)) return value
  return value[value.length - 1]
}

export function Random (value: Doc[]): Doc {
  if (!Array.isArray(value)) return value
  return value[Math.floor(Math.random() * value.length)]
}

// #endregion

// #region String

export function UpperCase (value: string): string {
  if (typeof value !== 'string') return value
  return value.toUpperCase()
}

export function LowerCase (value: string): string {
  if (typeof value !== 'string') return value
  return value.toLowerCase()
}

export function Trim (value: string): string {
  if (typeof value !== 'string') return value
  return value.trim()
}

export async function Prepend (
  value: string,
  props: Record<string, string>,
  control: TriggerControl,
  execution: Execution
): Promise<string> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    if (context.type === 'attribute') {
      const addition = await getAttributeValue(control, execution, context)
      if (typeof addition !== 'string') return value
      return addition + value
    }
  } else if (typeof value === 'string') {
    return props.value + value
  }
  return value
}

export async function Append (
  value: string,
  props: Record<string, string>,
  control: TriggerControl,
  execution: Execution
): Promise<string> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    if (context.type === 'attribute') {
      const addition = await getAttributeValue(control, execution, context)
      if (typeof addition !== 'string') return value
      return value + addition
    }
  } else if (typeof value === 'string') {
    return value + props.value
  }
  return value
}

export function Replace (value: string, props: Record<string, string>): string {
  if (typeof value !== 'string') return value
  return value.replace(props.search, props.replacement)
}

export function ReplaceAll (value: string, props: Record<string, string>): string {
  if (typeof value !== 'string') return value
  return value.replaceAll(props.search, props.replacement)
}

export function Split (value: string, props: Record<string, string>): string {
  if (typeof value !== 'string') return value
  return value.split(props.separator)[0]
}

export function Cut (value: string, props: Record<string, number>): string {
  if (typeof value !== 'string') return value
  const start = props.start ?? 1
  const end = props.end ?? value.length + 1
  return value.slice(start - 1, end)
}

// #endregion

// #region Dates

export function FirstWorkingDayAfter (val: Timestamp): Timestamp {
  if (typeof val !== 'number') return val
  const value = new Date(val)
  const day = value.getUTCDay()
  if (day === 6 || day === 0) {
    const date = value.getDate() + (day === 6 ? 2 : 1)
    const res = value.setDate(date)
    return res
  }
  return val
}

// #endregion

// #region Numbers

export async function Add (
  value: number,
  props: Record<string, any>,
  control: TriggerControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.offset)
  if (context !== undefined) {
    if (context.type === 'attribute') {
      const offset = await getAttributeValue(control, execution, context)
      return value + offset
    }
  } else if (typeof value === 'number') {
    return value + props.offset
  }
  return value
}

export async function Subtract (
  value: number,
  props: Record<string, any>,
  control: TriggerControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.offset)
  if (context !== undefined) {
    if (context.type === 'attribute') {
      const offset = await getAttributeValue(control, execution, context)
      return value - offset
    }
  } else if (typeof value === 'number') {
    return value - props.offset
  }
  return value
}

export function Offset (val: Timestamp, props: Record<string, any>): Timestamp {
  if (typeof val !== 'number') return val
  const value = new Date(val)
  const offset = props.offset * (props.direction === 'after' ? 1 : -1)
  switch (props.offsetType) {
    case 'days':
      return value.setDate(value.getDate() + offset)
    case 'weeks':
      return value.setDate(value.getDate() + 7 * offset)
    case 'months':
      return value.setMonth(value.getMonth() + offset)
  }
  return val
}

// #endregion
