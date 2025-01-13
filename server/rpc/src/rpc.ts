//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { Account } from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Packr } from 'msgpackr'

/**
 * @public
 */
export type ReqId = string | number

/**
 * @public
 */
export interface Request<P extends any[]> {
  id?: ReqId
  method: string
  params: P

  time?: number // Server time to perform operation
}

/**
 * @public
 */
export interface HelloRequest extends Request<any[]> {
  binary?: boolean
  compression?: boolean
}
/**
 * @public
 */
export interface HelloResponse extends Response<any> {
  binary: boolean
  reconnect?: boolean
  serverVersion: string
  lastTx?: string
  lastHash?: string // Last model hash
  account: Account
  useCompression?: boolean
}

function replacer (key: string, value: any): any {
  if (Array.isArray(value) && ((value as any).total !== undefined || (value as any).lookupMap !== undefined)) {
    return {
      dataType: 'TotalArray',
      total: (value as any).total,
      lookupMap: (value as any).lookupMap,
      value: [...value]
    }
  } else {
    return value ?? null
  }
}

function receiver (key: string, value: any): any {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'TotalArray') {
      return Object.assign(value.value, { total: value.total, lookupMap: value.lookupMap })
    }
  }
  return value
}

/**
 * Response object define a server response on transaction request.
 * Also used to inform other clients about operations being performed by server.
 *
 * @public
 */
export interface Response<R> {
  result?: R
  id?: ReqId
  error?: Status
  terminate?: boolean
  chunk?: {
    index: number
    final: boolean
  }
  time?: number // Server time to perform operation
  bfst?: number // Server time to perform operation
  queue?: number
}

export class RPCHandler {
  packr = new Packr({ structuredClone: true, bundleStrings: true, copyBuffers: false })
  protoSerialize (object: object, binary: boolean): any {
    if (!binary) {
      return JSON.stringify(object, replacer)
    }
    return new Uint8Array(this.packr.pack(object))
  }

  protoDeserialize (data: any, binary: boolean): any {
    if (!binary) {
      let _data = data
      if (_data instanceof ArrayBuffer) {
        const decoder = new TextDecoder()
        _data = decoder.decode(_data)
      }
      try {
        return JSON.parse(_data.toString(), receiver)
      } catch (err: any) {
        if (((err.message as string) ?? '').includes('Unexpected token')) {
          return this.packr.unpack(new Uint8Array(data))
        }
      }
    }
    return this.packr.unpack(new Uint8Array(data))
  }

  /**
   * @public
   * @param object -
   * @returns
   */
  serialize (object: Request<any> | Response<any>, binary: boolean): any {
    if ((object as any).result !== undefined) {
      ;(object as any).result = replacer('result', (object as any).result)
    }
    return this.protoSerialize(object, binary)
  }

  /**
   * @public
   * @param response -
   * @returns
   */
  readResponse<D>(response: any, binary: boolean): Response<D> {
    const data = this.protoDeserialize(response, binary)
    if (data.result !== undefined) {
      data.result = receiver('result', data.result)
    }
    return data
  }

  /**
   * @public
   * @param request -
   * @returns
   */
  readRequest<P extends any[]>(request: any, binary: boolean): Request<P> {
    const result: Request<P> = this.protoDeserialize(request, binary)
    if (typeof result.method !== 'string') {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
    }
    return result
  }
}

/**
 * @public
 * @param status -
 * @param id -
 * @returns
 */
export function fromStatus (status: Status, id?: ReqId): Response<any> {
  return { id, error: status }
}
