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

import { createProxy, handleProxyCall, createProxyHandler } from '../proxy'
import type { RequestHandler } from '../api/client'

describe('Core Proxy Tests', () => {
  // Define a test service interface
  interface CalculatorService {
    add: (a: number, b: number) => Promise<number>
    subtract: (a: number, b: number) => Promise<number>
    multiply: (a: number, b: number) => Promise<number>
    divide: (a: number, b: number) => Promise<number>
    getName: () => Promise<string>
  }

  // Implementation of the service
  const calculatorImpl: CalculatorService = {
    add: async (a: number, b: number) => a + b,
    subtract: async (a: number, b: number) => a - b,
    multiply: async (a: number, b: number) => a * b,
    divide: async (a: number, b: number) => {
      if (b === 0) {
        throw new Error('Division by zero')
      }
      return a / b
    },
    getName: async () => 'Calculator'
  }

  // Mock RequestHandler for testing
  class MockRequestHandler implements RequestHandler {
    constructor (
      private readonly impl: any,
      private readonly interfaceName?: string
    ) {}

    async request (method: string, params: any[]): Promise<any> {
      return await handleProxyCall(this.impl, method, params, this.interfaceName)
    }
  }

  it('should create proxy and call methods', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')
    const calculator = createProxy<CalculatorService>(handler, 'CalculatorService')

    const result = await calculator.add(5, 3)
    expect(result).toBe(8)
  })

  it('should handle subtract operation', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')
    const calculator = createProxy<CalculatorService>(handler, 'CalculatorService')

    const result = await calculator.subtract(10, 4)
    expect(result).toBe(6)
  })

  it('should handle multiply operation', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')
    const calculator = createProxy<CalculatorService>(handler, 'CalculatorService')

    const result = await calculator.multiply(7, 6)
    expect(result).toBe(42)
  })

  it('should handle divide operation', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')
    const calculator = createProxy<CalculatorService>(handler, 'CalculatorService')

    const result = await calculator.divide(20, 4)
    expect(result).toBe(5)
  })

  it('should handle errors in proxy calls', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')
    const calculator = createProxy<CalculatorService>(handler, 'CalculatorService')

    await expect(calculator.divide(10, 0)).rejects.toThrow('Division by zero')
  })

  it('should handle methods without parameters', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')
    const calculator = createProxy<CalculatorService>(handler, 'CalculatorService')

    const result = await calculator.getName()
    expect(result).toBe('Calculator')
  })

  it('should work without interface name prefix', async () => {
    const handler = new MockRequestHandler(calculatorImpl)
    const calculator = createProxy<CalculatorService>(handler)

    const result = await calculator.add(2, 3)
    expect(result).toBe(5)
  })

  it('should handle multiple concurrent calls', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')
    const calculator = createProxy<CalculatorService>(handler, 'CalculatorService')

    const results = await Promise.all([
      calculator.add(1, 2),
      calculator.subtract(10, 5),
      calculator.multiply(3, 4),
      calculator.divide(20, 5)
    ])

    expect(results).toEqual([3, 5, 12, 4])
  })

  it('should throw error for non-existent methods', async () => {
    const handler = new MockRequestHandler(calculatorImpl, 'CalculatorService')

    await expect(handler.request('CalculatorService.nonExistent', [])).rejects.toThrow(
      "Method 'nonExistent' not found in service implementation"
    )
  })

  it('createProxyHandler should create a working handler', async () => {
    const handler = createProxyHandler(calculatorImpl as any, 'CalculatorService')

    const result = await handler('CalculatorService.add', [5, 7])
    expect(result).toBe(12)
  })

  it('createProxyHandler should handle empty params', async () => {
    const handler = createProxyHandler(calculatorImpl as any, 'CalculatorService')

    const result = await handler('CalculatorService.getName', undefined)
    expect(result).toBe('Calculator')
  })

  it('should strip interface name prefix in handleProxyCall', async () => {
    const result = await handleProxyCall(calculatorImpl as any, 'CalculatorService.add', [10, 20], 'CalculatorService')
    expect(result).toBe(30)
  })

  it('should work with direct method names in handleProxyCall', async () => {
    const result = await handleProxyCall(calculatorImpl as any, 'add', [15, 25])
    expect(result).toBe(40)
  })

  it('should support cast method on RequestHandler objects', async () => {
    // Create a mock ContainerReference-like object
    class MockContainerReference implements RequestHandler {
      constructor (
        private readonly impl: any,
        private readonly interfaceName?: string
      ) {}

      async request (method: string, params: any[]): Promise<any> {
        return await handleProxyCall(this.impl, method, params, this.interfaceName)
      }

      cast<T extends object>(interfaceName?: string): T {
        return createProxy<T>(this, interfaceName)
      }
    }

    const containerRef = new MockContainerReference(calculatorImpl, 'CalculatorService')
    const calculator = containerRef.cast<CalculatorService>('CalculatorService')

    const result = await calculator.add(100, 200)
    expect(result).toBe(300)

    const name = await calculator.getName()
    expect(name).toBe('Calculator')
  })
})
