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

import { getContext, onDestroy, tick } from 'svelte'
import { trackRenderResource, type RenderContext, type RenderResourceOptions } from '../render-context'

jest.mock('svelte', () => ({
  getContext: jest.fn(),
  setContext: jest.fn(),
  onDestroy: jest.fn(),
  tick: jest.fn(async () => {})
}))

describe('rendering loading flags', () => {
  const finish = jest.fn()
  const context: RenderContext = { registerResource: jest.fn(() => finish), fail: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getContext).mockReturnValue(context)
  })

  it('keeps loading pending until the DOM update finishes', async () => {
    const track = trackRenderResource()
    track(true)
    track(true)
    expect(context.registerResource).toHaveBeenCalledTimes(1)
    track(false)
    expect(finish).not.toHaveBeenCalled()
    await tick()
    expect(finish).toHaveBeenCalledTimes(1)
  })

  it('does not release a resource that starts loading again before the DOM update', async () => {
    const track = trackRenderResource()
    track(true)
    track(false)
    track(true)
    await tick()
    expect(finish).not.toHaveBeenCalled()
    track(false)
    await tick()
    expect(finish).toHaveBeenCalledTimes(1)
    track(true)
    expect(context.registerResource).toHaveBeenCalledTimes(2)
  })

  it('releases pending work on destruction without waiting for load or a DOM update', async () => {
    const track = trackRenderResource()
    track(true)
    track(false)
    const destroy = jest.mocked(onDestroy).mock.calls[0][0]
    destroy()
    expect(finish).toHaveBeenCalledTimes(1)
    await tick()
    expect(finish).toHaveBeenCalledTimes(1)
  })

  it('passes the deadline and the existing error handler to the lifecycle owner', () => {
    const options: RenderResourceOptions = { timeoutMs: 15000, onTimeout: jest.fn() }
    const track = trackRenderResource(options)
    track(true)
    expect(context.registerResource).toHaveBeenCalledWith(options)
  })

  it('leaves ordinary viewing unchanged without a rendering context', async () => {
    jest.mocked(getContext).mockReturnValue(undefined)
    const track = trackRenderResource()
    track(true)
    track(false)
    await tick()
    expect(context.registerResource).not.toHaveBeenCalled()
    expect(finish).not.toHaveBeenCalled()
  })
})
