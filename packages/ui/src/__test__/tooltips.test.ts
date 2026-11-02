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

import { type IntlString } from '@hcengineering/platform'
import { get } from 'svelte/store'
import { closeTooltip, tooltip, tooltipstore } from '../tooltips'

// svelte/store is shipped as an ES module only, provide a minimal synchronous replacement
jest.mock('svelte/store', () => {
  type Subscriber = (value: any) => void
  interface Store {
    subscribe: (run: Subscriber) => () => void
  }
  const get = (store: Store): any => {
    let value: any
    store.subscribe((v) => (value = v))()
    return value
  }
  const writable = (initial: any): Store & { set: Subscriber, update: (fn: (v: any) => any) => void } => {
    let value = initial
    const subscribers = new Set<Subscriber>()
    const set = (v: any): void => {
      value = v
      subscribers.forEach((s) => {
        s(value)
      })
    }
    return {
      set,
      update: (fn) => {
        set(fn(value))
      },
      subscribe: (run) => {
        subscribers.add(run)
        run(value)
        return () => subscribers.delete(run)
      }
    }
  }
  const derived = (source: Store, fn: (v: any) => any): Store => ({
    subscribe: (run) =>
      source.subscribe((v) => {
        run(fn(v))
      })
  })
  return { get, writable, derived }
})

const label = 'JPEG' as IntlString

function hover (node: HTMLElement): void {
  node.dispatchEvent(new MouseEvent('mousemove'))
  jest.runOnlyPendingTimers()
}

describe('tooltip action', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    closeTooltip()
  })

  afterEach(() => {
    closeTooltip()
    jest.useRealTimers()
  })

  it('shows the tooltip label on hover', () => {
    const node = document.createElement('span')
    tooltip(node, { label })
    hover(node)
    expect(get(tooltipstore).label).toBe(label)
    expect(get(tooltipstore).element).toBe(node)
  })

  it('shows a tooltip that becomes available after mount', () => {
    const node = document.createElement('span')
    const action = tooltip(node, undefined)
    hover(node)
    expect(get(tooltipstore).label).toBeUndefined()

    action.update({ label })
    hover(node)
    expect(get(tooltipstore).label).toBe(label)
  })

  it('does not show a stale label after the tooltip is removed', () => {
    const node = document.createElement('span')
    const action = tooltip(node, { label })
    action.update(undefined)
    expect(() => {
      hover(node)
    }).not.toThrow()
    expect(get(tooltipstore).label).toBeUndefined()
  })

  it('closes the shown tooltip when it is removed', () => {
    const node = document.createElement('span')
    const action = tooltip(node, { label })
    hover(node)
    expect(get(tooltipstore).label).toBe(label)

    action.update(undefined)
    expect(get(tooltipstore).label).toBeUndefined()
  })
})
