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

import { type IRequest } from 'itty-router'

// This is a copy of cors.ts from itty-router with following issues fixed:
// - https://github.com/kwhitley/itty-router/issues/242
// - https://github.com/kwhitley/itty-router/issues/249
export interface CorsOptions {
  credentials?: true
  origin?: boolean | string | string[] | RegExp | ((origin: string) => string | undefined)
  maxAge?: number
  allowMethods?: string | string[]
  allowHeaders?: any
  exposeHeaders?: string | string[]
}

export type Preflight = (request: IRequest) => Response | undefined
export type Corsify = (response: Response, request?: IRequest) => Response | undefined

export interface CorsPair {
  preflight: Preflight
  corsify: Corsify
}

// Create CORS function with default options.
export const cors = (options: CorsOptions = {}): CorsPair => {
  // Destructure and set defaults for options.
  const { origin = '*', credentials = false, allowMethods = '*', allowHeaders, exposeHeaders, maxAge } = options

  const getAccessControlOrigin = (request?: Request): string | null | undefined => {
    const requestOrigin = request?.headers.get('origin') // may be null if no request passed
    if (requestOrigin === undefined || requestOrigin === null) return requestOrigin

    if (origin === true) return requestOrigin
    if (origin instanceof RegExp) return origin.test(requestOrigin) ? requestOrigin : undefined
    if (Array.isArray(origin)) return origin.includes(requestOrigin) ? requestOrigin : undefined
    if (origin instanceof Function) return origin(requestOrigin) ?? undefined

    return origin === '*' && credentials ? requestOrigin : (origin as string)
  }

  const appendHeadersAndReturn = (response: Response, headers: Record<string, any>): Response => {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null && value !== '') {
        response.headers.append(key, value)
      }
    }
    return response
  }

  const preflight = (request: Request): Response | undefined => {
    if (request.method === 'OPTIONS') {
      const response = new Response(null, { status: 204 })

      const allowMethodsHeader = Array.isArray(allowMethods) ? allowMethods.join(',') : allowMethods
      const allowHeadersHeader = Array.isArray(allowHeaders) ? allowHeaders.join(',') : allowHeaders
      const exposeHeadersHeader = Array.isArray(exposeHeaders) ? exposeHeaders.join(',') : exposeHeaders

      return appendHeadersAndReturn(response, {
        'access-control-allow-origin': getAccessControlOrigin(request),
        'access-control-allow-methods': allowMethodsHeader,
        'access-control-expose-headers': exposeHeadersHeader,
        'access-control-allow-headers': allowHeadersHeader ?? request.headers.get('access-control-request-headers'),
        'access-control-max-age': maxAge,
        'access-control-allow-credentials': credentials
      })
    } // otherwise ignore
  }

  const corsify = (response: Response, request?: Request): Response | undefined => {
    // ignore if already has CORS headers
    if (response?.headers?.has('access-control-allow-origin') || response.status === 101) {
      return response
    }

    const responseCopy = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })

    return appendHeadersAndReturn(responseCopy, {
      'access-control-allow-origin': getAccessControlOrigin(request),
      'access-control-allow-credentials': credentials
    })
  }

  // Return corsify and preflight methods.
  return { corsify, preflight }
}
