//
// Copyright © 2026 Intabia Fusion
// Copyright © 2026 TraceX SAS.
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

/* eslint-disable no-console */

import { performance } from 'perf_hooks'

export interface BenchOptions {
  // target wall-clock budget for the measured phase (ms)
  budgetMs?: number
  // hard cap on iterations
  maxIters?: number
  // minimum iterations regardless of budget
  minIters?: number
  // warmup iterations before measurement
  warmup?: number
}

export interface BenchResult {
  name: string
  iters: number
  totalMs: number
  opsPerSec: number
  meanUs: number
  p50Us: number
  p95Us: number
  p99Us: number
  maxUs: number
  heapDeltaMB: number
}

const ENABLED = process.env.BENCH === '1' || process.env.BENCH === 'true'

function pct (sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q))
  return sorted[idx]
}

export async function bench (
  name: string,
  fn: () => Promise<void> | void,
  opts: BenchOptions = {}
): Promise<BenchResult> {
  const budgetMs = opts.budgetMs ?? 1500
  const maxIters = opts.maxIters ?? 200_000
  const minIters = opts.minIters ?? 50
  const warmup = opts.warmup ?? Math.max(10, Math.floor(minIters / 5))

  // Warmup - JIT, caches, no record
  for (let i = 0; i < warmup; i++) {
    await fn()
  }

  if (global.gc != null) global.gc()
  const heapBefore = process.memoryUsage().heapUsed

  const samples: number[] = []
  const startWall = performance.now()
  let i = 0
  while (i < maxIters) {
    const t0 = performance.now()
    await fn()
    const dt = performance.now() - t0
    samples.push(dt)
    i++
    if (i >= minIters && performance.now() - startWall >= budgetMs) break
  }
  const totalMs = performance.now() - startWall
  const heapAfter = process.memoryUsage().heapUsed

  samples.sort((a, b) => a - b)
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length
  const result: BenchResult = {
    name,
    iters: samples.length,
    totalMs,
    opsPerSec: (samples.length / totalMs) * 1000,
    meanUs: mean * 1000,
    p50Us: pct(samples, 0.5) * 1000,
    p95Us: pct(samples, 0.95) * 1000,
    p99Us: pct(samples, 0.99) * 1000,
    maxUs: samples[samples.length - 1] * 1000,
    heapDeltaMB: (heapAfter - heapBefore) / (1024 * 1024)
  }

  printResult(result)
  return result
}

export function printResult (r: BenchResult): void {
  const fmt = (n: number, w = 10): string => n.toFixed(2).padStart(w, ' ')
  console.log(
    [
      `bench ${r.name.padEnd(50)}`,
      `iters=${String(r.iters).padStart(7)}`,
      `ops/s=${fmt(r.opsPerSec)}`,
      `mean=${fmt(r.meanUs)}us`,
      `p50=${fmt(r.p50Us)}us`,
      `p95=${fmt(r.p95Us)}us`,
      `p99=${fmt(r.p99Us)}us`,
      `max=${fmt(r.maxUs)}us`,
      `heapΔ=${fmt(r.heapDeltaMB, 7)}MB`
    ].join(' | ')
  )
}

/**
 * Gate jest describe block: only run when BENCH=1 env is set.
 * Keeps `jest` fast in regular runs.
 */
export const describeBench: jest.Describe = ENABLED ? describe : describe.skip
