//
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

import type { MeasureContext } from '@hcengineering/core'
import { runWorkspaceHandshake, waitForWorkspaceWorker } from '../lifecycle'

const logs: Partial<MeasureContext> = { error: jest.fn(), warn: jest.fn() }
const ctx = logs as MeasureContext
beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})
afterEach(() => {
  jest.useRealTimers()
})

test('cancels a handshake that never settles and does not retry after cancellation', async () => {
  const controller = new AbortController()
  const handshake = jest.fn(async () => {
    await new Promise<void>(() => {})
  })
  const started = runWorkspaceHandshake(ctx, handshake, controller.signal)
  controller.abort()
  await expect(started).resolves.toBe(false)
  await jest.advanceTimersByTimeAsync(5000)
  expect(handshake).toHaveBeenCalledTimes(1)
})

test('cancels retry backoff and never starts a subsequent request', async () => {
  const controller = new AbortController()
  const handshake = jest.fn().mockRejectedValue(new Error('account unavailable'))
  const started = runWorkspaceHandshake(ctx, handshake, controller.signal)
  await jest.advanceTimersByTimeAsync(0)
  expect(logs.error).toHaveBeenCalledTimes(1)
  controller.abort()
  await expect(started).resolves.toBe(false)
  await jest.advanceTimersByTimeAsync(5000)
  expect(handshake).toHaveBeenCalledTimes(1)
})

test('retries startup failure and accepts recovery', async () => {
  const controller = new AbortController()
  const handshake = jest.fn().mockRejectedValueOnce(new Error('account unavailable')).mockResolvedValue(undefined)
  const started = runWorkspaceHandshake(ctx, handshake, controller.signal)
  await jest.advanceTimersByTimeAsync(1000)
  await expect(started).resolves.toBe(true)
  expect(handshake).toHaveBeenCalledTimes(2)
})

test('does not start a handshake after shutdown', async () => {
  const controller = new AbortController()
  controller.abort()
  const handshake = jest.fn()
  await expect(runWorkspaceHandshake(ctx, handshake, controller.signal)).resolves.toBe(false)
  expect(handshake).not.toHaveBeenCalled()
})

test('bounds worker drain and allows resource cleanup after timeout', async () => {
  const cleanup = jest.fn()
  const worker = new Promise<void>(() => {})
  const shutdown = waitForWorkspaceWorker(ctx, worker).then(cleanup)
  await jest.advanceTimersByTimeAsync(29999)
  expect(cleanup).not.toHaveBeenCalled()
  await jest.advanceTimersByTimeAsync(1)
  await shutdown
  expect(cleanup).toHaveBeenCalledTimes(1)
  expect(logs.warn).toHaveBeenCalledTimes(1)
  expect(jest.getTimerCount()).toBe(0)
})

test('normal worker completion clears the shutdown deadline', async () => {
  await waitForWorkspaceWorker(ctx, Promise.resolve())
  expect(logs.warn).not.toHaveBeenCalled()
  expect(jest.getTimerCount()).toBe(0)
})
