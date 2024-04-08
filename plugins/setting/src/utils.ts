//
// Copyright © 2024 Hardcore Engineering Inc.
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

import core, { Class, ClassifierKind, Data, Doc, Ref, SpaceType, TxOperations } from '@hcengineering/core'
import { getEmbeddedLabel } from '@hcengineering/platform'

export async function createSpaceType (
  client: TxOperations,
  data: Omit<Data<SpaceType>, 'targetClass'>,
  _id: Ref<SpaceType>
): Promise<Ref<SpaceType>> {
  const descriptorObj = client.getModel().findObject(data.descriptor)
  if (descriptorObj === undefined) {
    throw new Error('Descriptor is not found in the model')
  }

  const baseClassClazz = client.getHierarchy().getClass(descriptorObj.baseClass)
  // NOTE: it is important for this id to be consistent when re-creating the same
  // space type with the same id as it will happen during every migration if type is created by the system
  const spaceTypeMixinId = `${_id}:type:mixin` as Ref<Class<Doc>>
  await client.createDoc(
    core.class.Mixin,
    core.space.Model,
    {
      extends: descriptorObj.baseClass,
      kind: ClassifierKind.MIXIN,
      label: getEmbeddedLabel(data.name),
      icon: baseClassClazz.icon
    },
    spaceTypeMixinId
  )

  return await client.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      shortDescription: data.shortDescription,
      descriptor: data.descriptor,
      roles: data.roles,
      name: data.name,
      targetClass: spaceTypeMixinId
    },
    _id
  )
}
