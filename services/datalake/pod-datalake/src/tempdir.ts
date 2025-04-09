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

import { type MeasureContext, generateId } from '@hcengineering/core'
import { mkdtempSync, rmSync } from 'fs'
import { rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export class TemporaryDir {
  readonly path: string
  private readonly interval: NodeJS.Timeout
  private pendingCleanup: Set<string>
  private cleanupPromise: Promise<void> = Promise.resolve()

  constructor (
    private readonly ctx: MeasureContext,
    name: string,
    interval: number = 60 * 1000
  ) {
    this.path = mkdtempSync(join(tmpdir(), name))
    this.pendingCleanup = new Set()

    ctx.info('using temp dir', { path: this.path })

    this.interval = setInterval(() => {
      void this.cleanup()
    }, interval)
  }

  tmpFile (): string {
    return join(this.path, generateId())
  }

  rm (...files: string[]): void {
    const normalizedPath = join(this.path)
    for (const file of files) {
      const normalizedFile = join(file)

      if (normalizedFile.startsWith(normalizedPath)) {
        this.pendingCleanup.add(file)
      }
    }
  }

  private async cleanup (): Promise<void> {
    await this.cleanupPromise
    this.cleanupPromise = this.doCleanup()
    await this.cleanupPromise
  }

  private async doCleanup (): Promise<void> {
    const pendingCleanup = this.pendingCleanup
    this.pendingCleanup = new Set()

    await this.ctx.with('cleanup', {}, () => {
      const promises = Array.from(pendingCleanup).map(async (file) => {
        try {
          await rm(file, { force: true })
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err)
          this.ctx.warn('failed to cleanup temp file', { file, error })
        }
      })

      this.ctx.info('temp files cleanup', { files: promises.length })
      return Promise.all(promises)
    })
  }

  async close (): Promise<void> {
    clearInterval(this.interval)
    await this.cleanupPromise
    rmSync(this.path, { force: true, recursive: true })
  }
}
