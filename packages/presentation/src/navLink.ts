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

import { getMetadata, getResource } from '@hcengineering/platform'
import uiPlugin, { type Location, parseLocation } from '@hcengineering/ui'
import { hasResource } from './configuration'
import { isNewTabClick } from './linkClick'
import presentation from './plugin'

export function getInternalLocation (link: string): Location | undefined {
  try {
    const url = new URL(link)
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    if (url.origin === frontUrl) {
      const loc = parseLocation(url)
      const routes = getMetadata(uiPlugin.metadata.Routes)
      const app = routes?.get(loc.path[0])

      if (app !== undefined) {
        return loc
      }
    }
  } catch {}
  return undefined
}

export async function handleNewTabClick (
  e: MouseEvent,
  options: { href: string | undefined, disabled: boolean, onClick?: (event: MouseEvent) => void }
): Promise<void> {
  // A child/editor handler or a custom onClick owns navigation in these cases.
  if (e.defaultPrevented || options.disabled || options.onClick !== undefined || options.href === undefined) return
  if (!isNewTabClick(e)) return
  const resource = getMetadata(presentation.metadata.OpenInNewTab)
  if (resource === undefined || hasResource(resource) !== true) return
  const loc = getInternalLocation(options.href)
  if (loc === undefined) return
  // Plugin configuration is not a session capability. Policy belongs to the tab provider.
  const canOpen = getMetadata(presentation.metadata.CanOpenInNewTab)
  if (canOpen?.(loc) !== true) return

  // Cancel synchronously, before resource loading can yield to the browser.
  e.preventDefault()
  e.stopPropagation()
  const openInNewTab = await getResource(resource)
  // The original shell must still own this operation after resource loading.
  if (
    getMetadata(presentation.metadata.OpenInNewTab) !== resource ||
    getMetadata(presentation.metadata.CanOpenInNewTab) !== canOpen ||
    !canOpen(loc)
  ) {
    return
  }
  await openInNewTab(loc)
}
