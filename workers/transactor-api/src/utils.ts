//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { gunzip } from 'zlib'
import { promisify } from 'util'
import type { MeasureContext, MeasureLogger, ParamsType, Tx } from '@hcengineering/core'

export async function unpackModel (compressed: Buffer): Promise<Tx[]> {
  const ungzipAsync = promisify(gunzip)
  const buffer = await ungzipAsync(new Uint8Array(compressed))
  const decoder = new TextDecoder()
  const jsonString = decoder.decode(buffer)
  const model = JSON.parse(jsonString) as Tx[]
  return model
}

function createConsoleLogger (): MeasureLogger {
  return {
    info: (message: string, obj?: Record<string, any>) => {
      console.info(message, obj)
    },
    error: (message: string, obj?: Record<string, any>) => {
      console.error(message, obj)
    },
    warn: (message: string, obj?: Record<string, any>) => {
      console.warn(message, obj)
    },
    logOperation: (operation: string, time: number, params: ParamsType) => {
      console.info(operation, { time, ...params })
    },
    close: async () => {}
  }
}

export function createDummyMeasureContext (): MeasureContext {
  const ctx: MeasureContext = {
    id: '',
    contextData: {},
    newChild: (name, params, fullParams, logger) => {
      return ctx
    },
    with: <T>(name: any, params: any, op: any, fullParams: any) => {
      return Promise.resolve() as Promise<T>
    },
    withSync: (name, params, op, fullParams) => {
      return op(ctx)
    },
    withLog: <T>(name: any, params: any, op: any, fullParams: any) => {
      return Promise.resolve() as Promise<T>
    },
    logger: createConsoleLogger(),
    measure: (name, value, override) => {},
    error: (message, args) => {
      console.error(message, args)
    },
    info: (message, args) => {
      console.info(message, args)
    },
    warn: (message, args) => {
      console.warn(message, args)
    },
    end: () => {}
  }
  return ctx
}
