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
import { type RetryOptions, DEFAULT_RETRY_OPTIONS, withRetry } from './retry'

/**
 * Method decorator for adding retry functionality to class methods
 *
 * @param options - Retry configuration options
 * @param operationName - Name of the operation for logging (defaults to method name)
 * @returns Method decorator
 */
export function Retryable (options: Partial<RetryOptions> = DEFAULT_RETRY_OPTIONS): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: any[]) => any

    descriptor.value = async function (...args: any[]) {
      const methodName = propertyKey.toString()
      return await withRetry(() => originalMethod.apply(this, args), options, methodName)
    }

    return descriptor
  }
}
