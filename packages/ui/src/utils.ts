//
// Copyright © 2020 Anticrm Platform Contributors.
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

// import type { Metadata } from '@anticrm/platform'
import type { AnyComponent /*, Location */ } from './types'

// import { Readable, derived, writable } from 'svelte/store'
// import { onDestroy, getContext, setContext } from 'svelte'

// function windowLocation (): Location {
//   return parseLocation(window.location)
// }

// const locationWritable = writable(windowLocation())
// window.addEventListener('popstate', () => {
//   locationWritable.set(windowLocation())
// })

// const location: Readable<Location> = derived(locationWritable, (loc) => loc)

// function subscribeLocation (listener: (location: Location) => void, destroyFactory: (op: () => void) => void): void {
//   const unsubscribe = location.subscribe((location) => {
//     listener(location)
//   })
//   destroyFactory(unsubscribe)
// }

// function navigate (newUrl: string): void {
//   const curUrl = locationToUrl(windowLocation())
//   if (curUrl === newUrl) {
//     return
//   }
//   history.pushState(null, '', newUrl)
//   locationWritable.set(windowLocation())
// }

// function navigateJoin (
//   path: string[] | undefined,
//   query: Record<string, string> | undefined,
//   fragment: string | undefined
// ): void {
//   const newLocation = windowLocation()
//   if (path != null) {
//     newLocation.path = path
//   }
//   if (query != null) {
//     // For query we do replace
//     const currentQuery = newLocation.query || {}
//     for (const kv of Object.entries(query)) {
//       currentQuery[kv[0]] = kv[1]
//     }
//   }
//   if (fragment) {
//     newLocation.fragment = fragment
//   }
//   navigate(locationToUrl(newLocation))
// }

// const CONTEXT_ROUTE_VALUE = 'routes.context'

// export function newRouter<T> (
//   pattern: string,
//   matcher: (match: T) => void,
//   defaults: T | undefined = undefined
// ): ApplicationRouter<T> {
//   const r: Router<any> = getContext(CONTEXT_ROUTE_VALUE)
//   const navigateOp = (loc: Location): void => {
//     navigate(locationToUrl(loc))
//   }
//   const result = r ? r.newRouter<T>(pattern, defaults) : new Router<T>(pattern, r, defaults, navigateOp)
//   result.subscribe(matcher)
//   if (!r) {
//     // No parent, we need to subscribe for location changes.
//     subscribeLocation((loc) => {
//       result.update(loc)
//     }, onDestroy)
//   }
//   if (r) {
//     // We need to remove child router from parent, if component is destroyed
//     onDestroy(() => r.clearChildRouter())
//   }
//   setContext(CONTEXT_ROUTE_VALUE, result)
//   return result
// }

// R O U T E R  M E T A D A T A  K E Y S

// export function applicationShortcutKey (shortcut: string): Metadata<AnyComponent> {
//   return ('shortcut:ui.' + shortcut) as Metadata<AnyComponent>
// }
