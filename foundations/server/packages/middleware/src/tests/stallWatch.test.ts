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
import { _resetStallWatchForTests, watchStall } from '../stallWatch'

describe('watchStall', () => {
  let errors: string[]
  let events: Array<{ event: string, params: Record<string, string> }>

  beforeEach(() => {
    jest.useFakeTimers()
    _resetStallWatchForTests()
    errors = []
    events = []
    jest.spyOn(Analytics, 'handleError').mockImplementation((err: Error) => {
      errors.push(err.message)
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
    expect(errors[0]).toContain('pipeline-stall: space-security.init pending > 1000ms')
    expect(errors[0]).toContain('"workspace":"ws1"')

    jest.advanceTimersByTime(3000)
    resolve('done')
    await expect(result).resolves.toBe('done')
    expect(events).toHaveLength(1)
    expect(events[0].event).toBe('pipeline-stall-resolved')
    expect(events[0].params.label).toBe('space-security.init')
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
    expect(errors[20]).toContain('"suppressedBefore":"30"')

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
    expect(errors[0]).toContain('attrsError')
    resolve()
    await result
  })
})
