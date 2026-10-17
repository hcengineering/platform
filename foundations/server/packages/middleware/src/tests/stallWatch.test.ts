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

import { Analytics } from '@hcengineering/analytics'
import { PipelineStallError, _resetStallWatchForTests, watchStall } from '../stallWatch'

describe('watchStall', () => {
  let errors: string[]
  let errorObjects: Error[]
  let events: Array<{ event: string, params: Record<string, string> }>

  beforeEach(() => {
    jest.useFakeTimers()
    _resetStallWatchForTests()
    errors = []
    errorObjects = []
    events = []
    jest.spyOn(Analytics, 'handleError').mockImplementation((err: Error) => {
      errors.push(err.message)
      errorObjects.push(err)
    })
    jest.spyOn(Analytics, 'handleEvent').mockImplementation((event: string, params: Record<string, any> = {}) => {
      events.push({ event, params })
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('does not report fast operations and passes the value through', async () => {
    const result = watchStall('test', () => ({}), Promise.resolve(42))
    await expect(result).resolves.toBe(42)
    jest.advanceTimersByTime(5000)
    expect(errors).toHaveLength(0)
    expect(events).toHaveLength(0)
  })

  it('reports a stall after 1s and the resolution later', async () => {
    let resolve: (v: string) => void = () => {}
    const pending = new Promise<string>((r) => {
      resolve = r
    })
    const result = watchStall('space-security.init', () => ({ workspace: 'ws1' }), pending)

    jest.advanceTimersByTime(999)
    expect(errors).toHaveLength(0)
    jest.advanceTimersByTime(2)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toBe('pipeline-stall: space-security.init pending > 1000ms')
    expect(errorObjects[0]).toBeInstanceOf(PipelineStallError)
    expect((errorObjects[0] as PipelineStallError).attributes.workspace).toBe('ws1')

    jest.advanceTimersByTime(3000)
    resolve('done')
    await expect(result).resolves.toBe('done')
    expect(events).toHaveLength(1)
    expect(events[0].event).toBe('pipeline-stall-resolved')
    expect(events[0].params.label).toBe('space-security.init')
    expect(events[0].params.failed).toBe('false')
    expect(Number(events[0].params.elapsedMs)).toBeGreaterThanOrEqual(4000)
  })

  it('keeps rejections and does not report resolution for fast failures', async () => {
    await expect(watchStall('test', () => ({}), Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(events).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })

  it('rate limits reports per label and reports suppressed count later', async () => {
    const pendings: Array<Promise<void>> = []
    const resolvers: Array<() => void> = []
    for (let i = 0; i < 50; i++) {
      pendings.push(
        watchStall(
          'busy',
          () => ({ i }),
          new Promise<void>((r) => resolvers.push(r))
        )
      )
    }
    jest.advanceTimersByTime(1001)
    expect(errors).toHaveLength(20)

    // new window
    jest.advanceTimersByTime(10_000)
    const later = watchStall('busy', () => ({}), new Promise<void>((r) => resolvers.push(r)))
    jest.advanceTimersByTime(1001)
    expect(errors).toHaveLength(21)
    expect((errorObjects[20] as PipelineStallError).attributes.suppressedBefore).toBe('30')

    resolvers.forEach((r) => r())
    await Promise.all([...pendings, later])
  })

  it('swallows errors from the attributes callback', async () => {
    let resolve: () => void = () => {}
    const result = watchStall(
      'attrs',
      () => {
        throw new Error('bad attrs')
      },
      new Promise<void>((r) => {
        resolve = r
      })
    )
    jest.advanceTimersByTime(1001)
    expect(errors).toHaveLength(1)
    expect((errorObjects[0] as PipelineStallError).attributes.attrsError).toBe('bad attrs')
    resolve()
    await result
  })

  it('rate limits per workspace, so a noisy one does not hide others', async () => {
    const resolvers: Array<() => void> = []
    const run = async (workspace: string): Promise<void> =>
      await watchStall('busy', () => ({ workspace }), new Promise<void>((r) => resolvers.push(r)))
    const all: Array<Promise<void>> = []
    for (let i = 0; i < 30; i++) all.push(run('noisy'))
    all.push(run('quiet'))
    jest.advanceTimersByTime(1001)
    expect(errors).toHaveLength(21)
    expect(errorObjects.some((e) => (e as PipelineStallError).attributes.workspace === 'quiet')).toBe(true)
    resolvers.forEach((r) => r())
    await Promise.all(all)
  })

  it('reports failed=true when a reported stall ends in rejection', async () => {
    let reject: (e: Error) => void = () => {}
    const result = watchStall(
      'fail',
      () => ({}),
      new Promise<void>((_, rej) => {
        reject = rej
      })
    )
    jest.advanceTimersByTime(1001)
    expect(errors).toHaveLength(1)
    reject(new Error('late boom'))
    await expect(result).rejects.toThrow('late boom')
    expect(events).toHaveLength(1)
    expect(events[0].params.failed).toBe('true')
  })

  it('is a pass-through when PIPELINE_STALL_WATCH=false', async () => {
    process.env.PIPELINE_STALL_WATCH = 'false'
    try {
      let resolve: () => void = () => {}
      const result = watchStall(
        'off',
        () => ({}),
        new Promise<void>((r) => {
          resolve = r
        })
      )
      jest.advanceTimersByTime(5000)
      expect(errors).toHaveLength(0)
      resolve()
      await result
      expect(events).toHaveLength(0)
    } finally {
      delete process.env.PIPELINE_STALL_WATCH
    }
  })
})
