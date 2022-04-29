//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Class, Client, Obj, Ref, Space } from '@anticrm/core'
import type { Asset } from '@anticrm/platform'
import { getResource } from '@anticrm/platform'
import { NavigatorModel } from '@anticrm/workbench'
import view from '@anticrm/view'

export function classIcon (client: Client, _class: Ref<Class<Obj>>): Asset | undefined {
  return client.getHierarchy().getClass(_class).icon
}
export function getSpecialSpaceClass (model: NavigatorModel): Array<Ref<Class<Space>>> {
  const spaceResult = model.spaces.map((x) => x.spaceClass)
  const result = (model.specials ?? []).map((it) => it.spaceClass).filter((it) => it !== undefined)
  return spaceResult.concat(result as Array<Ref<Class<Space>>>)
}

export async function getSpaceName (client: Client, space: Space): Promise<string> {
  const hierarchy = client.getHierarchy()
  const clazz = hierarchy.getClass(space._class)
  const nameMixin = hierarchy.as(clazz, view.mixin.SpaceName)

  if (nameMixin?.getName !== undefined) {
    const getSpaceName = await getResource(nameMixin.getName)
    const name = await getSpaceName(client, space)

    return name
  }

  return space.name
}
