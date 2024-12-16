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

import { type Env } from './env'

export async function withMetrics<T> (name: string, fn: (ctx: MetricsContext) => Promise<T>): Promise<T> {
  const ctx = new MetricsContext()

  const start = performance.now()

  try {
    return await fn(ctx)
  } finally {
    const total = performance.now() - start
    const ops = ctx.metrics
    const message = `${name} total=${total} ` + ctx.toString()
    console.log({ message, total, ops })
  }
}

export interface MetricsData {
  op: string
  time: number
}

export class MetricsContext {
  metrics: Array<MetricsData> = []

  debug (...data: any[]): void {
    console.debug(...data)
  }

  log (...data: any[]): void {
    console.log(...data)
  }

  error (...data: any[]): void {
    console.error(...data)
  }

  async with<T>(op: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      return await fn()
    } finally {
      const time = performance.now() - start
      this.metrics.push({ op, time })
    }
  }

  withSync<T>(op: string, fn: () => T): T {
    const start = performance.now()
    try {
      return fn()
    } finally {
      const time = performance.now() - start
      this.metrics.push({ op, time })
    }
  }

  toString (): string {
    return this.metrics.map((p) => `${p.op}=${p.time}`).join(' ')
  }
}

export class LoggedDatalake {
  constructor (
    private readonly datalake: Env['DATALAKE'],
    private readonly ctx: MetricsContext
  ) {}

  async getBlob (workspace: string, name: string): Promise<ArrayBuffer> {
    return await this.ctx.with('datalake.getBlob', () => {
      return this.datalake.getBlob(workspace, name)
    })
  }

  async putBlob (workspace: string, name: string, data: ArrayBuffer | Blob | string, type: string): Promise<void> {
    await this.ctx.with('datalake.putBlob', () => {
      return this.datalake.putBlob(workspace, name, data, type)
    })
  }
}
