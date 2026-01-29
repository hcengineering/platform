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

import core, { type Class, type Client, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import type { BuildModelKey, Viewlet } from '@hcengineering/view'
import viewPlugin from '@hcengineering/view'

/**
 * Loads the actual viewlet configuration, including user preferences
 */
export async function loadViewletConfig (
  client: Client,
  hierarchy: Hierarchy,
  cardClass: Ref<Class<Doc>>,
  propsViewlet?: Viewlet,
  propsConfig?: Array<string | BuildModelKey>
): Promise<{ viewlet: Viewlet | undefined, config: Array<string | BuildModelKey> | undefined }> {
  if (propsConfig !== undefined && propsConfig.length > 0) {
    return { viewlet: propsViewlet, config: propsConfig }
  }

  let viewlet: Viewlet | undefined = propsViewlet
  if (viewlet === undefined) {
    const allClasses = [cardClass]
    let currentClass = hierarchy.getClass(cardClass)
    while (currentClass?.extends !== undefined) {
      allClasses.push(currentClass.extends)
      currentClass = hierarchy.getClass(currentClass.extends)
    }
    const viewlets = await client.findAll(viewPlugin.class.Viewlet, {
      attachTo: { $in: allClasses },
      descriptor: viewPlugin.viewlet.Table
    })
    viewlet =
      viewlets.find((v) => v.attachTo === cardClass) ??
      viewlets.find((v) => allClasses.includes(v.attachTo)) ??
      viewlets[0]
  }

  let actualConfig: Array<string | BuildModelKey> | undefined
  if (viewlet !== undefined) {
    const preferences = await client.findAll(viewPlugin.class.ViewletPreference, {
      space: core.space.Workspace,
      attachedTo: viewlet._id
    })
    actualConfig = preferences.length > 0 && preferences[0].config.length > 0 ? preferences[0].config : viewlet.config
  }

  return { viewlet, config: actualConfig }
}
