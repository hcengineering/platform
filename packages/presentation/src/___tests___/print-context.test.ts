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

import { getContext } from 'svelte'
import { get } from 'svelte/store'
import { getPrintContext, providePrintContext } from '../print'

jest.mock('svelte/store', () => jest.requireActual('../__mocks__/svelte-store'))
jest.mock('svelte', () => ({
  getContext: jest.fn(),
  setContext: jest.fn((_key: unknown, context: unknown) => context)
}))

describe('print rendering context', () => {
  it('releases an expired resource and notifies its owner without failing the document', () => {
    jest.useFakeTimers()
    try {
      const context = providePrintContext()
      const onTimeout = jest.fn()
      const finish = context.registerResource({ timeoutMs: 15000, onTimeout })
      jest.advanceTimersByTime(15000)
      expect(onTimeout).toHaveBeenCalledTimes(1)
      expect(get(context.pendingResources)).toBe(0)
      expect(get(context.error)).toBeUndefined()
      finish()
      expect(onTimeout).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it('cancels a deadline when the resource finishes or is destroyed', () => {
    jest.useFakeTimers()
    try {
      const context = providePrintContext()
      const onTimeout = jest.fn()
      const finish = context.registerResource({ timeoutMs: 15000, onTimeout })
      finish()
      jest.advanceTimersByTime(15000)
      expect(onTimeout).not.toHaveBeenCalled()
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      jest.useRealTimers()
    }
  })

  it('preserves fatal rendering errors independently of pending work', () => {
    const context = providePrintContext()
    const finish = context.registerResource()
    expect(get(context.pendingResources)).toBe(1)
    const error = new Error('Editor initialization failed')
    context.fail(error)
    finish()
    expect(get(context.error)).toBe(error)
    expect(get(context.pendingResources)).toBe(0)
  })

  it('tracks a promise until its work finishes', async () => {
    const context = providePrintContext()
    let complete: ((value: string) => void) | undefined
    const pending = context.waitFor(
      new Promise<string>((resolve) => {
        complete = resolve
      })
    )
    expect(get(context.pendingResources)).toBe(1)
    complete?.('ready')
    await expect(pending).resolves.toBe('ready')
    expect(get(context.pendingResources)).toBe(0)
  })

  it('releases rejected work without treating an attachment failure as a document failure', async () => {
    const context = providePrintContext()
    const error = new Error('File unavailable')
    await expect(context.waitFor(Promise.reject(error))).rejects.toBe(error)
    expect(get(context.pendingResources)).toBe(0)
    expect(get(context.error)).toBeUndefined()
  })

  it('times out pending work and ignores its late completion', async () => {
    jest.useFakeTimers()
    try {
      const context = providePrintContext()
      let complete: (() => void) | undefined
      const pending = context.waitFor(
        new Promise<void>((resolve) => {
          complete = resolve
        }),
        15000
      )
      const failed = expect(pending).rejects.toThrow('Rendering timed out')
      await jest.advanceTimersByTimeAsync(15000)
      await failed
      expect(get(context.pendingResources)).toBe(0)
      complete?.()
      await Promise.resolve()
      expect(get(context.pendingResources)).toBe(0)
    } finally {
      jest.useRealTimers()
    }
  })

  it('isolates pending resources between print applications', () => {
    const first = providePrintContext()
    const finishFirst = first.registerResource()
    const second = providePrintContext()
    const finishSecond = second.registerResource()
    const finishAnother = first.registerResource()

    expect(get(first.pendingResources)).toBe(2)
    expect(get(second.pendingResources)).toBe(1)
    finishFirst()
    finishSecond()
    expect(get(first.pendingResources)).toBe(1)
    expect(get(second.pendingResources)).toBe(0)
    finishAnother()
    expect(get(first.pendingResources)).toBe(0)
  })

  it('allows completion and destruction to release the same resource', () => {
    const context = providePrintContext()
    const finish = context.registerResource()
    const finishAnother = context.registerResource()

    finish()
    finish()
    expect(get(context.pendingResources)).toBe(1)
    finishAnother()
    expect(get(context.pendingResources)).toBe(0)
  })

  it('leaves regular views outside the print context', () => {
    jest.mocked(getContext).mockReturnValue(undefined)
    expect(getPrintContext()).toBeUndefined()
    const context = providePrintContext()
    jest.mocked(getContext).mockReturnValue(context)
    expect(getPrintContext()).toBe(context)
  })
})
