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

import type { IntlString } from '@anticrm/platform'
import { getResource } from '@anticrm/platform'
import type { Ref, Class, Obj, FindOptions, Doc, Client } from '@anticrm/core'
import type { AnySvelteComponent } from '@anticrm/ui'

import view from '@anticrm/view'

export interface AttributeModel {
  key: string
  label: IntlString
  presenter: AnySvelteComponent
}

async function getObjectPresenter(client: Client, _class: Ref<Class<Obj>>, preserveKey: string): Promise<AttributeModel> { 
  const clazz = client.getHierarchy().getClass(_class) 
  const presenterMixin = client.getHierarchy().as(clazz, view.mixin.AttributePresenter)
  if (presenterMixin.presenter === undefined) {
    if (clazz.extends !== undefined) {
      return getObjectPresenter(client, clazz.extends, preserveKey)
    } else {
      throw new Error('object presenter not found for ' + preserveKey)
    }
  }
  const presenter = await getResource(presenterMixin.presenter)
  return {
    key: preserveKey,
    label: clazz.label,
    presenter
  } as AttributeModel
}

async function getAttributePresenter(client: Client, _class: Ref<Class<Obj>>, key: string, preserveKey: string) {
  const attribute = client.getHierarchy().getAttribute(_class, key)
  const clazz = client.getHierarchy().getClass(attribute.type._class) 
  const presenterMixin = client.getHierarchy().as(clazz, view.mixin.AttributePresenter)
  if (presenterMixin.presenter === undefined) {
    throw new Error('attribute presenter not found for ' + preserveKey)
  }
  const presenter = await getResource(presenterMixin.presenter)
  return {
    key: preserveKey,
    label: attribute.label,
    presenter
  } as AttributeModel
}

async function getPresenter(client: Client, _class: Ref<Class<Obj>>, key: string, preserveKey: string, options?: FindOptions<Doc>): Promise<AttributeModel> {
  if (key.length === 0) {
    return getObjectPresenter(client, _class, preserveKey)
  } else {
    const split = key.split('.')
    if (split[0] === '$lookup') {
      const lookupClass = (options?.lookup as any)[split[1]] as Ref<Class<Obj>>
      if (lookupClass === undefined) {
        throw new Error('lookup class does not provided for ' + split[1])
      }
      const lookupKey = split[2] ?? ''
      const model = await getPresenter(client, lookupClass, lookupKey, preserveKey)
      if (lookupKey === '') {
        const attribute = client.getHierarchy().getAttribute(_class, split[1])
        model.label = attribute.label as IntlString
      } else {
        const attribute = client.getHierarchy().getAttribute(lookupClass, lookupKey)
        model.label = attribute.label as IntlString
      }
      return model
    }
    return getAttributePresenter(client, _class, key, preserveKey)
  }
}

export async function buildModel(client: Client, _class: Ref<Class<Obj>>, keys: string[], options?: FindOptions<Doc>): Promise<AttributeModel[]> {
  console.log('building table model for', _class)
  const model = keys.map(key => getPresenter(client, _class, key, key, options))
  console.log(model)
  return await Promise.all(model)
}