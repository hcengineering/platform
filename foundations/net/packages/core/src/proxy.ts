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

import type { RequestHandler } from './api/client'

/**
 * Interface for service implementations
 */
export type ServiceImplementation = Record<string, (...args: any[]) => Promise<any> | any>

/**
 * Creates a proxy object that implements any TypeScript interface T.
 * All method calls on the proxy are transformed into request handler calls.
 *
 * @template T - The interface to implement
 * @param handler - The request handler to use for making requests
 * @param interfaceName - Optional name of the interface for better error messages and request identification
 * @returns A proxy object that implements the interface T
 *
 * @example
 * ```typescript
 * interface MyService {
 *   sayHello(name: string): Promise<string>
 *   calculate(a: number, b: number): Promise<number>
 * }
 *
 * const containerRef = await client.get('my-service', {})
 * const service = createProxy<MyService>(containerRef, 'MyService')
 *
 * // This will call containerRef.request('MyService.sayHello', ['Alice'])
 * const greeting = await service.sayHello('Alice')
 * ```
 */
export function createProxy<T extends object> (handler: RequestHandler, interfaceName?: string): T {
  return new Proxy(
    {},
    {
      get (_target, prop, _receiver) {
        // Ignore symbol properties
        if (typeof prop === 'symbol') {
          return undefined
        }

        // Return a function that will make the RPC call
        return (...args: any[]) => {
          const methodName = interfaceName !== undefined ? `${interfaceName}.${prop}` : prop
          return handler.request(methodName, args)
        }
      }
    }
  ) as T
}

/**
 * Handles proxy calls by routing them to the registered service implementation.
 *
 * @template T - The service interface type
 * @param implementation - The actual implementation of the service interface
 * @param method - The method name received from the client (e.g., 'MyService.sayHello' or 'sayHello')
 * @param params - Array of arguments passed from the client
 * @param interfaceName - Optional interface name prefix to strip from method names
 * @returns Promise that resolves to the result of the method call
 * @throws Error if the method is not found in the implementation
 *
 * @example
 * ```typescript
 * interface MyService {
 *   sayHello(name: string): Promise<string>
 * }
 *
 * const myServiceImpl: MyService = {
 *   async sayHello(name: string): Promise<string> {
 *     return `Hello, ${name}!`
 *   }
 * }
 *
 * // In your container's request handler:
 * async request(operation: string, data?: any) {
 *   return await handleProxyCall(myServiceImpl, operation, data ?? [], 'MyService')
 * }
 * ```
 */
export async function handleProxyCall<T extends ServiceImplementation> (
  implementation: T,
  method: string,
  params: any[],
  interfaceName?: string
): Promise<any> {
  // Strip interface name prefix if present
  let methodName = method
  if (interfaceName !== undefined && method.startsWith(`${interfaceName}.`)) {
    methodName = method.substring(interfaceName.length + 1)
  }

  // Get the method from the implementation
  const fn = implementation[methodName]

  if (fn === undefined || typeof fn !== 'function') {
    throw new Error(`Method '${methodName}' not found in service implementation`)
  }

  // Call the method with the provided parameters
  const result = await fn.apply(implementation, params)
  return result
}

/**
 * Creates a request handler wrapper for a service implementation.
 * This is a convenience function that wraps handleProxyCall.
 *
 * @template T - The service interface type
 * @param implementation - The actual implementation of the service interface
 * @param interfaceName - Optional interface name prefix to strip from method names
 * @returns A request handler function
 *
 * @example
 * ```typescript
 * const myServiceImpl: MyService = {
 *   async sayHello(name: string): Promise<string> {
 *     return `Hello, ${name}!`
 *   }
 * }
 *
 * // In your container factory:
 * const container: Container = {
 *   request: createProxyHandler(myServiceImpl, 'MyService'),
 *   terminate: async () => {},
 *   ping: async () => {}
 * }
 * ```
 */
export function createProxyHandler<T extends ServiceImplementation> (
  implementation: T,
  interfaceName?: string
): (operation: string, data?: any) => Promise<any> {
  return async (operation: string, data?: any) => {
    return await handleProxyCall(implementation, operation, data ?? [], interfaceName)
  }
}
