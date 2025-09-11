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

import contact, { Employee, Person } from '@hcengineering/contact'
import { Doc, Ref, Timestamp } from '@hcengineering/core'
import { Execution, parseContext } from '@hcengineering/process'
import { ProcessControl } from '@hcengineering/server-process'
import { getContextValue } from './utils'

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

export function All (value: Doc[]): Doc[] {
  return value
}

// #endregion

// #region Array

export async function Insert (
  value: Doc[],
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<Doc[]> {
  if (!Array.isArray(value)) return value
  if (props.value == null) return value
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    Array.isArray(val) ? value.push(...val) : value.push(val)
  } else {
    value.push(props.value)
  }
  return value
}

export async function Remove (
  value: Doc[],
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<Doc[]> {
  if (!Array.isArray(value)) return value
  if (props.value == null) return value
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    return value.filter((item) => item !== val)
  } else {
    return value.filter((item) => item !== props.value)
  }
}

export function RemoveFirst (value: Doc[], props: Record<string, any>): Doc[] {
  if (!Array.isArray(value)) return value
  return value.slice(1)
}

export function RemoveLast (value: Doc[], props: Record<string, any>): Doc[] {
  if (!Array.isArray(value)) return value
  return value.slice(0, -1)
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
  control: ProcessControl,
  execution: Execution
): Promise<string> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (typeof val !== 'string') return value
    return val + value
  } else if (typeof value === 'string') {
    return props.value + value
  }
  return value
}

export async function Append (
  value: string,
  props: Record<string, string>,
  control: ProcessControl,
  execution: Execution
): Promise<string> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (typeof val !== 'string') return value
    return value + val
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

// #region Numbers

export async function Add (
  value: number,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (typeof val !== 'number') return value
    return value + val
  } else if (typeof value === 'number' && typeof props.value === 'number') {
    return value + props.value
  }
  return value
}

export async function Subtract (
  value: number,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (typeof val !== 'number') return value
    return value - val
  } else if (typeof value === 'number' && typeof props.value === 'number') {
    return value - props.value
  }
  return value
}

export async function Multiply (
  value: number,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (typeof val !== 'number') return value
    return value * val
  } else if (typeof value === 'number' && typeof props.value === 'number') {
    return value * props.value
  }
  return value
}

export async function Divide (
  value: number,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (val === 0 || typeof val !== 'number') {
      return value // Avoid division by zero
    }
    return value / val
  } else if (typeof value === 'number' && typeof props.value === 'number') {
    if (props.value === 0) {
      return value // Avoid division by zero
    }
    return value / props.value
  }
  return value
}

export async function Modulo (
  value: number,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (val === 0 || typeof val !== 'number') {
      return value // Avoid division by zero
    }
    return value % val
  } else if (typeof value === 'number' && typeof props.value === 'number') {
    if (props.value === 0) {
      return value // Avoid division by zero
    }
    return value % props.value
  }
  return value
}

export async function Power (
  value: number,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.value)
  if (context !== undefined) {
    const val = await getContextValue(props.value, control, execution)
    if (typeof val !== 'number') return value
    return Math.pow(value, val)
  } else if (typeof value === 'number' && typeof props.value === 'number') {
    return Math.pow(value, props.value)
  }
  return value
}

export function Round (value: number): number {
  if (typeof value === 'number') {
    return Math.round(value)
  }
  return value
}

export function Absolute (value: number): number {
  if (typeof value === 'number') {
    return Math.abs(value)
  }
  return value
}

export function Ceil (value: number): number {
  if (typeof value === 'number') {
    return Math.ceil(value)
  }
  return value
}

export function Floor (value: number): number {
  if (typeof value === 'number') {
    return Math.floor(value)
  }
  return value
}

// #endregion

// #region Func

export async function RoleContext (
  value: null,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
): Promise<Ref<Employee>[]> {
  const targetRole = props.target
  if (targetRole === undefined) return []
  const users = await control.client.findAll(contact.class.UserRole, { role: targetRole })
  return users.map((it) => it.user)
}

export async function CurrentUser (
  value: null,
  props: Record<string, any>,
  control: ProcessControl
): Promise<Ref<Person> | undefined> {
  const socialId = await control.client.findOne(contact.class.SocialIdentity, { _id: control.client.user as any })
  return socialId?.attachedTo
}

export async function CurrentDate (): Promise<Timestamp> {
  return Date.now()
}

// #endregion
