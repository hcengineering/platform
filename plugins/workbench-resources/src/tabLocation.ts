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

import { getResource } from '@hcengineering/platform'
import { type Location } from '@hcengineering/ui'
import { type Application } from '@hcengineering/workbench'

export async function resolveTabLocation (
  loc: Location,
  app?: Pick<Application, 'locationResolver'>
): Promise<Location> {
  if (app?.locationResolver === undefined) return loc

  const resolver = await getResource(app.locationResolver)
  // Tab creation, sync and presenter refreshes only read metadata. Foreground
  // resolvers must not set the active view's access-denied state for these reads.
  return (await resolver(loc, { background: true }))?.loc ?? loc
}
