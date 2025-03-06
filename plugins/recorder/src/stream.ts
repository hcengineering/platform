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

export interface ChunkReadResult {
  done: boolean
  value: Blob | undefined
}

export class ChunkReader {
  private readonly chunks: Blob[] = []
  private done: boolean = false
  private awaitingResolve: ((val: ChunkReadResult | PromiseLike<ChunkReadResult>) => void) | null = null

  public read (): Promise<ChunkReadResult> {
    if (this.done && this.chunks.length === 0) {
      return Promise.resolve({ done: true, value: undefined })
    }
    if (this.chunks.length === 0) {
      return new Promise((resolve) => {
        this.awaitingResolve = resolve
      })
    }
    return Promise.resolve({ done: false, value: this.chunks.shift() })
  }

  public push (blob: Blob): void {
    this.chunks.push(blob)
    console.log(this.awaitingResolve)
    if (this.awaitingResolve !== null) {
      this.awaitingResolve(this.read())
      this.awaitingResolve = null
    }
  }

  public close (): void {
    this.done = true
    if (this.awaitingResolve !== null) {
      this.awaitingResolve(this.read())
      this.awaitingResolve = null
    }
  }
}
