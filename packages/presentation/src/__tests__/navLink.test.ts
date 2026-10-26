//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { getMetadata, getResource, type Resource, setMetadata } from '@hcengineering/platform'
import uiPlugin, { type AnyComponent, type Location, parseLocation } from '@hcengineering/ui'
import { hasResource } from '../configuration'
import { handleNewTabClick } from '../navLink'
import presentation from '../plugin'

jest.mock('@hcengineering/platform', () => ({
  ...jest.requireActual<typeof import('@hcengineering/platform')>('@hcengineering/platform'),
  getMetadata: jest.fn(),
  getResource: jest.fn()
}))

jest.mock('@hcengineering/ui', () => ({
  __esModule: true,
  default: { metadata: { Routes: 'ui:metadata:Routes' } },
  parseLocation: jest.fn()
}))

jest.mock('../configuration', () => ({ hasResource: jest.fn() }))

function clickEvent (init: MouseEventInit = {}): MouseEvent {
  const event = new Event(init.button === 1 ? 'auxclick' : 'click', { bubbles: true, cancelable: true })
  const mouse = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...init }
  return Object.assign(event, mouse) as MouseEvent
}

describe('handleNewTabClick', () => {
  const href = 'https://huly.example/workbench/workspace/tracker?filter=all#issue'
  const loc: Location = {
    path: ['workbench', 'workspace', 'tracker'],
    query: { filter: 'all' },
    fragment: 'issue'
  }
  const resource = 'custom:function:OpenInNewTab' as Resource<(loc: Location) => Promise<void>>
  const openInNewTab = jest.fn<Promise<void>, [Location]>()

  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(getMetadata).mockImplementation(
      jest.requireActual<typeof import('@hcengineering/platform')>('@hcengineering/platform').getMetadata
    )
    setMetadata(presentation.metadata.FrontUrl, 'https://huly.example')
    setMetadata(presentation.metadata.OpenInNewTab, resource)
    setMetadata(uiPlugin.metadata.Routes, new Map([['workbench', 'workbench:component:WorkbenchApp' as AnyComponent]]))
    jest.mocked(parseLocation).mockReturnValue(loc)
    jest.mocked(hasResource).mockReturnValue(true)
    jest.mocked(getResource).mockResolvedValue(openInNewTab)
    openInNewTab.mockResolvedValue(undefined)
  })

  it.each<{ name: string, init: MouseEventInit }>([
    { name: 'Ctrl+click', init: { ctrlKey: true } },
    { name: 'Cmd+click', init: { metaKey: true } },
    { name: 'middle auxclick', init: { button: 1 } }
  ])('cancels $name synchronously and opens exactly one Huly tab', async ({ init }) => {
    const event = clickEvent(init)
    const preventDefault = jest.spyOn(event, 'preventDefault')
    const stopPropagation = jest.spyOn(event, 'stopPropagation')
    jest.mocked(getResource).mockImplementationOnce(() => {
      expect(preventDefault).toHaveBeenCalledTimes(1)
      expect(stopPropagation).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
      return Promise.resolve(openInNewTab)
    })

    const handled = handleNewTabClick(event, { href, disabled: false })

    expect(event.defaultPrevented).toBe(true)
    expect(openInNewTab).not.toHaveBeenCalled()
    await handled
    expect(getResource).toHaveBeenCalledTimes(1)
    expect(getResource).toHaveBeenCalledWith(resource)
    expect(hasResource).toHaveBeenCalledWith(resource)
    expect(parseLocation).toHaveBeenCalledWith(new URL(href))
    expect(openInNewTab).toHaveBeenCalledTimes(1)
    expect(openInNewTab).toHaveBeenCalledWith(loc)
  })

  it.each<{ name: string, init: MouseEventInit }>([
    { name: 'plain click', init: {} },
    { name: 'right click', init: { button: 2 } },
    { name: 'Ctrl+Shift+click', init: { ctrlKey: true, shiftKey: true } },
    { name: 'Cmd+Alt+click', init: { metaKey: true, altKey: true } },
    { name: 'Shift+middle click', init: { button: 1, shiftKey: true } },
    { name: 'Alt+middle click', init: { button: 1, altKey: true } }
  ])('leaves $name untouched', async ({ init }) => {
    const event = clickEvent(init)
    const stopPropagation = jest.spyOn(event, 'stopPropagation')

    await handleNewTabClick(event, { href, disabled: false })

    expect(event.defaultPrevented).toBe(false)
    expect(stopPropagation).not.toHaveBeenCalled()
    expect(getResource).not.toHaveBeenCalled()
    expect(openInNewTab).not.toHaveBeenCalled()
  })

  it.each(['https://external.example/workbench/workspace/tracker', 'invalid URL'])(
    'leaves external or malformed href %s to the browser',
    async (href) => {
      const event = clickEvent({ button: 1 })
      const stopPropagation = jest.spyOn(event, 'stopPropagation')

      await handleNewTabClick(event, { href, disabled: false })

      expect(event.defaultPrevented).toBe(false)
      expect(stopPropagation).not.toHaveBeenCalled()
      expect(getResource).not.toHaveBeenCalled()
      expect(openInNewTab).not.toHaveBeenCalled()
    }
  )

  it('leaves unregistered routes to the browser', async () => {
    jest.mocked(parseLocation).mockReturnValue({ path: ['unknown', 'workspace'] })
    const event = clickEvent({ button: 1 })

    await handleNewTabClick(event, { href, disabled: false })

    expect(event.defaultPrevented).toBe(false)
    expect(getResource).not.toHaveBeenCalled()
    expect(openInNewTab).not.toHaveBeenCalled()
  })

  it('leaves links to the browser when no tab resource is configured', async () => {
    jest.mocked(getMetadata).mockReturnValueOnce(undefined)
    const event = clickEvent({ button: 1 })

    await handleNewTabClick(event, { href, disabled: false })

    expect(event.defaultPrevented).toBe(false)
    expect(hasResource).not.toHaveBeenCalled()
    expect(getResource).not.toHaveBeenCalled()
    expect(openInNewTab).not.toHaveBeenCalled()
  })

  it.each([false, undefined])(
    'leaves links to the browser when the tab plugin is unavailable (%s)',
    async (enabled) => {
      jest.mocked(hasResource).mockReturnValue(enabled)
      const event = clickEvent({ button: 1 })

      await handleNewTabClick(event, { href, disabled: false })

      expect(event.defaultPrevented).toBe(false)
      expect(getResource).not.toHaveBeenCalled()
      expect(openInNewTab).not.toHaveBeenCalled()
    }
  )

  it('ignores disabled links and missing hrefs', async () => {
    for (const options of [{ href, disabled: true }, { href: undefined, disabled: false }]) {
      const event = clickEvent({ button: 1 })

      await handleNewTabClick(event, options)

      expect(event.defaultPrevented).toBe(false)
    }
    expect(getResource).not.toHaveBeenCalled()
    expect(openInNewTab).not.toHaveBeenCalled()
  })

  it('does not bypass a custom onClick on middle click', async () => {
    const event = clickEvent({ button: 1 })
    const onClick = jest.fn()
    const stopPropagation = jest.spyOn(event, 'stopPropagation')

    await handleNewTabClick(event, { href, disabled: false, onClick })

    expect(event.defaultPrevented).toBe(false)
    expect(stopPropagation).not.toHaveBeenCalled()
    expect(getResource).not.toHaveBeenCalled()
    expect(openInNewTab).not.toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not open again when a child handler already cancelled the event', async () => {
    const event = clickEvent({ ctrlKey: true })
    event.preventDefault()
    const preventDefault = jest.spyOn(event, 'preventDefault')
    const stopPropagation = jest.spyOn(event, 'stopPropagation')

    await handleNewTabClick(event, { href, disabled: false })

    expect(event.defaultPrevented).toBe(true)
    expect(preventDefault).not.toHaveBeenCalled()
    expect(stopPropagation).not.toHaveBeenCalled()
    expect(getResource).not.toHaveBeenCalled()
    expect(openInNewTab).not.toHaveBeenCalled()
  })

  it('keeps the browser default cancelled when opening the Huly tab fails', async () => {
    const error = new Error('Unable to create tab')
    openInNewTab.mockRejectedValueOnce(error)
    const event = clickEvent({ button: 1 })

    await expect(handleNewTabClick(event, { href, disabled: false })).rejects.toThrow(error)

    expect(event.defaultPrevented).toBe(true)
    expect(openInNewTab).toHaveBeenCalledTimes(1)
  })

  it('keeps the browser default cancelled when resource loading fails', async () => {
    const error = new Error('Unable to load tab resource')
    jest.mocked(getResource).mockRejectedValueOnce(error)
    const event = clickEvent({ button: 1 })

    await expect(handleNewTabClick(event, { href, disabled: false })).rejects.toThrow(error)

    expect(event.defaultPrevented).toBe(true)
    expect(openInNewTab).not.toHaveBeenCalled()
  })
})
