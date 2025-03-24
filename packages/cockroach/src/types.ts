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

import { type ParameterOrJSON, type Row } from 'postgres'

export type SqlRow = Row & Iterable<Row>
export type SqlParams = ParameterOrJSON<any>[]

export interface Logger {
  info: (message: string, data?: Record<string, any>) => void
  warn: (message: string, data?: Record<string, any>) => void
  error: (message: string, data?: Record<string, any>) => void
}

export interface Options {
  withLogs?: boolean
}

export interface SqlClient {
  execute: <T = SqlRow>(query: string, params?: SqlParams) => Promise<T[]>
  cursor: <T = SqlRow>(query: string, params?: SqlParams, size?: number) => AsyncIterable<NonNullable<T[][number]>[]>
  close: () => void
}
