//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { derived, get, writable } from 'svelte/store'
import { closePopup } from './popups'
import justClone from 'just-clone'
import { Location as PlatformLocation } from './types'

export function locationToUrl (location: PlatformLocation): string {
  let result = '/'
  if (location.path != null) {
    result += location.path.map((p) => encodeURIComponent(p)).join('/')
  }
  if (location.query != null) {
    const queryValue = Object.entries(location.query)
      .map((e) => {
        if (e[1] != null) {
          // Had value
          return e[0] + '=' + e[1]
        } else {
          return e[0]
        }
      })
      .join('&')
    if (queryValue.length > 0) {
      result += '?' + queryValue
    }
  }
  if (location.fragment != null && location.fragment.length > 0) {
    result += '#' + location.fragment
  }

  return result
}

export function parseLocation (location: Location | URL): PlatformLocation {
  return {
    path: parsePath(location.pathname),
    query: parseQuery(location.search),
    fragment: parseHash(location.hash)
  }
}

function parseQuery (query: string): Record<string, string | null> | undefined {
  query = query.trim()
  if (query.length === 0 || !query.startsWith('?')) {
    return
  }
  query = decodeURIComponent(query).substring(1)
  const vars = query.split('&')
  const result: Record<string, string | null> = {}
  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=')
    const key = pair[0]
    if (key.length > 0) {
      if (pair.length > 1) {
        const value = pair[1]
        result[key] = value
      } else {
        result[key] = null
      }
    }
  }
  return result
}

function parsePath (path: string): string[] {
  const split = path.split('/').map((ps) => decodeURIComponent(ps))
  if (split.length >= 1) {
    if (split[0] === '') {
      split.splice(0, 1)
    }
  }
  if (split.length >= 1) {
    if (split[split.length - 1] === '') {
      split.splice(split.length - 1, 1)
    }
  }
  return split
}

function parseHash (hash: string): string {
  if (hash.startsWith('#')) {
    return decodeURIComponent(hash.substring(1))
  }
  return decodeURIComponent(hash)
}

// ------------------------

export function getRawCurrentLocation (): PlatformLocation {
  return parseLocation(window.location)
}

export function getCurrentResolvedLocation (): PlatformLocation {
  return justClone(resolvedLocation)
}

declare global {
  interface Window {
    embeddedPlatform?: boolean
  }
}
export const embeddedPlatform = window.embeddedPlatform ?? false
const locationWritable = writable(getRawCurrentLocation())

console.log('embeddedPlatform', window.embeddedPlatform)

if (!embeddedPlatform) {
  window.addEventListener('popstate', () => {
    locationWritable.set(getRawCurrentLocation())
  })
} else {
  window.addEventListener('popstate', (state) => {
    if (state.state.location !== undefined) {
      locationWritable.set(state.state.location)
    }
  })
}

export const location = derived(locationWritable, (loc) => justClone(loc))

export const workspaceId = derived(location, (loc) => loc.path[1])

/**
 * @public
 */
export function getLocation (): PlatformLocation {
  return justClone(get(location))
}

export const resolvedLocationStore = writable(getRawCurrentLocation())
let resolvedLocation = getRawCurrentLocation()

export function setResolvedLocation (location: PlatformLocation): void {
  resolvedLocation = location
  resolvedLocationStore.set(justClone(location))
}

export function getCurrentLocation (): PlatformLocation {
  if (embeddedPlatform) {
    return justClone(get(locationWritable))
  }
  return getRawCurrentLocation()
}

/**
 * @public
 */
export let locationStorageKeyId = 'platform_last_loc'

export function setLocationStorageKey (storageKey: string): void {
  locationStorageKeyId = storageKey
}

export function navigate (location: PlatformLocation, store = true): boolean {
  closePopup()
  const cur = locationToUrl(getCurrentLocation())
  const url = locationToUrl(location)
  if (cur !== url) {
    if (store) {
      if (!embeddedPlatform) {
        history.pushState(null, '', url)
      } else {
        history.pushState({ location }, '')
      }
      localStorage.setItem(locationStorageKeyId, JSON.stringify(location))
      if (location.path[1] !== undefined) {
        localStorage.setItem(`${locationStorageKeyId}_${location.path[1]}`, JSON.stringify(location))
      }
    }
    locationWritable.set(location)
    return true
  }
  return false
}
