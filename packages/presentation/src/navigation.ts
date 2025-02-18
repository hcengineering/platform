//
// Copyright © 2025 Anticrm Platform Contributors.
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
import presentation from './plugin'
import { type Location, parseLocation } from '@hcengineering/ui'
import workbench, { type Application } from '@hcengineering/workbench'
import { type Class, type Doc, type Ref } from '@hcengineering/core'
import view from '@hcengineering/view'
import { getClient } from '.'

export async function getTargetObjectFromUrl (
  urlOrLocation: string | Location
): Promise<{ _id: Ref<Doc>, _class: Ref<Class<Doc>> } | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let location: Location
  if (typeof urlOrLocation === 'string') {
    const url = new URL(urlOrLocation)

    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    if (url.origin !== frontUrl) return

    location = parseLocation(url)
  } else {
    location = urlOrLocation
  }

  const appAlias = (location.path[2] ?? '').trim()
  if (!(appAlias.length > 0)) return

  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []
  const apps: Application[] = client
    .getModel()
    .findAllSync<Application>(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } })

  const app = apps.find((p) => p.alias === appAlias)

  if (app?.locationResolver === undefined) return
  const locationResolverFn = await getResource(app.locationResolver)
  const resolvedLocation = await locationResolverFn(location)

  const locationParts = decodeURIComponent(resolvedLocation?.loc?.fragment ?? '').split('|')
  const id = locationParts[1] as Ref<Doc>
  const objectclass = locationParts[2] as Ref<Class<Doc>>
  if (id === undefined || objectclass === undefined) return

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
  const linkProvider = linkProviders.find(({ _id }) => hierarchy.isDerived(objectclass, _id))
  const _id: Ref<Doc> | undefined =
    linkProvider !== undefined ? (await (await getResource(linkProvider.decode))(id)) ?? id : id

  return {
    _id,
    _class: objectclass
  }
}
