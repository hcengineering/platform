//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

export interface Logger {
  log: (message: string, data?: Record<string, any>) => void
  warn: (message: string, data?: Record<string, any>) => void
  error: (message: string, data?: Record<string, any>) => void
  debug: (message: string, data?: Record<string, any>) => void
}

export class ConsoleLogger implements Logger {
  log (message: string, data?: Record<string, any>): void {
    console.log({ message, ...data })
  }

  warn (message: string, data?: Record<string, any>): void {
    console.warn({ message, ...data })
  }

  error (message: string, data?: Record<string, any>): void {
    console.error({ message, ...data })
  }

  debug (message: string, data?: Record<string, any>): void {
    console.debug({ message, ...data })
  }
}

export async function withMetrics<T> (
  name: string,
  fn: (ctx: MetricsContext) => Promise<T>,
  logger?: Logger
): Promise<T> {
  logger ??= new ConsoleLogger()
  const ctx = new MetricsContext(logger)

  const start = performance.now()

  try {
    return await fn(ctx)
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err))
    throw err
  } finally {
    const total = performance.now() - start
    const ops = ctx.metrics
    const message = `${name} total=${total} ` + ctx.toString()
    logger.log(message, { total, ops })
  }
}

interface MetricsData {
  op: string
  time: number
  error?: string
  children?: MetricsData[]
}

export class MetricsContext {
  readonly metrics: Array<MetricsData> = []

  constructor (private readonly logger: Logger) {}

  debug (message: string, data?: Record<string, any>): void {
    this.logger.debug(message, data)
  }

  log (message: string, data?: Record<string, any>): void {
    this.logger.log(message, data)
  }

  warn (message: string, data?: Record<string, any>): void {
    this.logger.warn(message, data)
  }

  error (message: string, data?: Record<string, any>): void {
    this.logger.error(message, data)
  }

  async with<T>(op: string, fn: (ctx: MetricsContext) => Promise<T>): Promise<T> {
    const ctx = new MetricsContext(this.logger)
    const start = performance.now()

    let error: string | undefined

    try {
      return await fn(ctx)
    } catch (err: any) {
      error = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      const time = performance.now() - start
      const children = ctx.metrics
      this.metrics.push(error !== undefined ? { op, time, error, children } : { op, time, children })
    }
  }

  toString (): string {
    return this.metrics.map((p) => `${p.op}=${p.time}`).join(' ')
  }
}
