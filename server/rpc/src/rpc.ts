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

import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Packr } from 'msgpackr'

const packr = new Packr({ structuredClone: true, bundleStrings: true })

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
  chunk?: {
    index: number
    final: boolean
  }
}

/**
 * @public
 * @param object -
 * @returns
 */
export function protoSerialize (object: object, binary: boolean): any {
  if (!binary) {
    return JSON.stringify(object, replacer)
  }
  return new Uint8Array(packr.pack(object))
}

/**
 * @public
 * @param data -
 * @returns
 */
export function protoDeserialize (data: any, binary: boolean): any {
  if (!binary) {
    return JSON.parse(data, receiver)
  }
  return packr.unpack(new Uint8Array(replacer('', data)))
}

/**
 * @public
 * @param object -
 * @returns
 */
export function serialize (object: Request<any> | Response<any>, binary: boolean): any {
  if ((object as any).result !== undefined) {
    ;(object as any).result = replacer('result', (object as any).result)
  }
  return protoSerialize(object, binary)
}

/**
 * @public
 * @param response -
 * @returns
 */
export function readResponse<D> (response: any, binary: boolean): Response<D> {
  const data = protoDeserialize(response, binary)
  if (data.result !== undefined) {
    data.result = receiver('result', data.result)
  }
  return data
}

function replacer (key: string, value: any): any {
  if (Array.isArray(value) && (value as any).total !== undefined) {
    return {
      dataType: 'TotalArray',
      total: (value as any).total,
      value: [...value]
    }
  } else {
    return value ?? null
  }
}

function receiver (key: string, value: any): any {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'TotalArray') {
      return Object.assign(value.value, { total: value.total })
    }
  }
  return value
}

/**
 * @public
 * @param request -
 * @returns
 */
export function readRequest<P extends any[]> (request: any, binary: boolean): Request<P> {
  const result: Request<P> = protoDeserialize(request, binary)
  if (typeof result.method !== 'string') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }
  return result
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

// class DeferredPromise {
//   promise: Promise<any>
//   resolve!: <T>(value: T) => void
//   reject!: (reason?: any) => void
//   constructor () {
//     // eslint-disable-next-line promise/param-names
//     this.promise = new Promise((resolve, reject) => {
//       this.resolve = resolve
//       this.reject = reject
//     })
//   }
// }

// /**
//  * Process requests and handle responses.
//  * Also allow to handle non identified results passed from other side.
//  *
//  * Hold operations in progress and allow to retry them if required.
//  */
// export abstract class RequestProcessor {
//   private reqIndex: number = 0
//   private readonly requests = new Map<ReqId, DeferredPromise>()

//   protected abstract send (request: Request<any>): void
//   protected abstract notify (response: Response<any>): void

//   protected process (response: Response<any>): void {
//     if (response.id !== undefined) {
//       const req = this.requests.get(response.id)
//       if (req !== undefined) {
//         if (response.error !== undefined) {
//           req.reject(new PlatformError(response.error))
//           return
//         } else {
//           req.resolve(response.result)
//           return
//         }
//       }
//     }
//     this.notify(response)
//   }

//   /**
//    * Reject all waited pending operations.
//    *
//    * This method is intended to be executed by protocol listening parts to
//    * cancal any pending requests to control UI is not hang.
//    *
//    * @param reason - Why request was rejected.
//    */
//   protected reject (status: Status): void {
//     // We need to reply requests in case they are missed.
//     for (const op of this.requests.entries()) {
//       op[1].reject(new PlatformError(status))
//     }
//     this.requests.clear()
//   }

//   protected async request (method: string, ...params: any[]): Promise<any> {
//     const id = ++this.reqIndex
//     const promise = new DeferredPromise()
//     this.requests.set(id, promise)

//     // Send request
//     this.send({ id, method, params })

//     // Waiting to be complete.
//     return await promise.promise
//   }
// }
