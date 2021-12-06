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

import core, { Class, Client, Doc, FindOptions, FindResult, Obj, Ref, AttachedDoc, TxOperations, Collection } from '@anticrm/core'
import type { IntlString } from '@anticrm/platform'
import { getResource } from '@anticrm/platform'
import { getAttributePresenterClass } from '@anticrm/presentation'
import type { AnyComponent } from '@anticrm/ui'
import type { Action, ActionTarget, BuildModelOptions } from '@anticrm/view'
import view, { AttributeModel } from '@anticrm/view'

/**
 * @public
 */
export async function getObjectPresenter (client: Client, _class: Ref<Class<Obj>>, preserveKey: string): Promise<AttributeModel> {
  const clazz = client.getHierarchy().getClass(_class)
  const presenterMixin = client.getHierarchy().as(clazz, view.mixin.AttributePresenter)
  if (presenterMixin.presenter === undefined) {
    if (clazz.extends !== undefined) {
      return await getObjectPresenter(client, clazz.extends, preserveKey)
    } else {
      throw new Error('object presenter not found for ' + preserveKey)
    }
  }
  const presenter = await getResource(presenterMixin.presenter)
  return {
    key: preserveKey,
    _class,
    label: clazz.label,
    presenter
  }
}

async function getAttributePresenter (client: Client, _class: Ref<Class<Obj>>, key: string, preserveKey: string): Promise<AttributeModel> {
  const attribute = client.getHierarchy().getAttribute(_class, key)
  let attrClass = getAttributePresenterClass(attribute)
  const clazz = client.getHierarchy().getClass(attrClass)
  let presenterMixin = client.getHierarchy().as(clazz, view.mixin.AttributePresenter)
  let parent = clazz.extends
  while (presenterMixin.presenter === undefined && parent !== undefined) {
    const pclazz = client.getHierarchy().getClass(parent)
    attrClass = parent
    presenterMixin = client.getHierarchy().as(pclazz, view.mixin.AttributePresenter)
    parent = pclazz.extends
  }
  if (presenterMixin.presenter === undefined) {
    throw new Error('attribute presenter not found for ' + preserveKey)
  }
  const presenter = await getResource(presenterMixin.presenter)
  return {
    key: preserveKey,
    _class: attrClass,
    label: attribute.label,
    presenter
  }
}

async function getPresenter (client: Client, _class: Ref<Class<Obj>>, key: string, preserveKey: string, options?: FindOptions<Doc>): Promise<AttributeModel> {
  if (typeof key === 'object') {
    const { presenter, label } = key
    return {
      key: '',
      _class,
      label: label as IntlString,
      presenter: await getResource(presenter as AnyComponent)
    }
  }
  if (key.length === 0) {
    return await getObjectPresenter(client, _class, preserveKey)
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
        model.label = attribute.label
      } else {
        const attribute = client.getHierarchy().getAttribute(lookupClass, lookupKey)
        model.label = attribute.label
      }
      return model
    }
    return await getAttributePresenter(client, _class, key, preserveKey)
  }
}

export async function buildModel (options: BuildModelOptions): Promise<AttributeModel[]> {
  console.log('building table model for', options._class)
  // eslint-disable-next-line array-callback-return
  const model = options.keys.map(key => {
    try {
      const result = getPresenter(options.client, options._class, key, key, options.options)
      return result
    } catch (err: any) {
      if (!(options.ignoreMissing ?? false)) {
        throw err
      }
    }
  })
  console.log(model)
  return (await Promise.all(model)).filter(a => a !== undefined) as AttributeModel[]
}

function filterActions (client: Client, _class: Ref<Class<Obj>>, targets: ActionTarget[]): Array<Ref<Action>> {
  const result: Array<Ref<Action>> = []
  for (const target of targets) {
    if (client.getHierarchy().isDerived(_class, target.target)) {
      result.push(target.action)
    }
  }
  return result
}

export async function getActions (client: Client, _class: Ref<Class<Obj>>): Promise<FindResult<Action>> {
  const targets = await client.findAll(view.class.ActionTarget, {})
  return await client.findAll(view.class.Action, { _id: { $in: filterActions(client, _class, targets) } })
}

export async function deleteObject (client: Client & TxOperations, object: Doc) {
  const hierarchy = client.getHierarchy()
  const attributes = hierarchy.getAllAttributes(object._class)
  for (const [name, attribute] of attributes) {
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
      const collection = attribute.type as Collection<AttachedDoc>
      const allAttached = await client.findAll(collection.of, { attachedTo: object._id })
      for (const attached of allAttached) {
        deleteObject(client, attached)
      }
    }
  }
  if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
    const adoc = object as AttachedDoc
    client.removeCollection(object._class, object.space, adoc._id, adoc.attachedTo, adoc.attachedToClass, adoc.collection).catch(err => console.error(err))
  } else {
    client.removeDoc(object._class, object.space, object._id).catch(err => console.error(err))
  }
}
