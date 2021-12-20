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

import core, { AttachedDoc, Class, Client, Collection, Doc, FindOptions, FindResult, Obj, Ref, TxOperations } from '@anticrm/core'
import type { IntlString } from '@anticrm/platform'
import { getResource } from '@anticrm/platform'
import { getAttributePresenterClass } from '@anticrm/presentation'
import type { Action, ActionTarget, BuildModelOptions } from '@anticrm/view'
import view, { AttributeModel, BuildModelKey } from '@anticrm/view'
import { ErrorPresenter } from '@anticrm/ui'

/**
 * @public
 */
export async function getObjectPresenter (client: Client, _class: Ref<Class<Obj>>, preserveKey: BuildModelKey): Promise<AttributeModel> {
  const clazz = client.getHierarchy().getClass(_class)
  const presenterMixin = client.getHierarchy().as(clazz, view.mixin.AttributePresenter)
  if (presenterMixin.presenter === undefined) {
    if (clazz.extends !== undefined) {
      return await getObjectPresenter(client, clazz.extends, preserveKey)
    } else {
      throw new Error('object presenter not found for ' + JSON.stringify(preserveKey))
    }
  }
  const presenter = await getResource(presenterMixin.presenter)
  const key = typeof preserveKey === 'string' ? preserveKey : ''
  const sortingKey = clazz.sortingKey ?
   (key.length > 0 ? key + '.' + clazz.sortingKey : clazz.sortingKey) 
   : key
  return {
    key,
    _class,
    label: clazz.label,
    presenter,
    sortingKey
  }
}

async function getAttributePresenter (client: Client, _class: Ref<Class<Obj>>, key: string, preserveKey: BuildModelKey): Promise<AttributeModel> {
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
    throw new Error('attribute presenter not found for ' + JSON.stringify(preserveKey))
  }
  const resultKey = typeof preserveKey === 'string' ? preserveKey : ''
  const sortingKey = attribute.type._class === core.class.ArrOf ? resultKey + '.length' : resultKey
  const presenter = await getResource(presenterMixin.presenter)
  return {
    key: resultKey,
    sortingKey,
    _class: attrClass,
    label: attribute.label,
    presenter
  }
}

async function getPresenter (client: Client, _class: Ref<Class<Obj>>, key: BuildModelKey, preserveKey: BuildModelKey, options?: FindOptions<Doc>): Promise<AttributeModel> {
  if (typeof key === 'object') {
    const { presenter, label, sortingKey } = key
    return {
      key: '',
      sortingKey: sortingKey ?? '',
      _class,
      label: label as IntlString,
      presenter: await getResource(presenter)
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
  console.log('building table model for', options)
  // eslint-disable-next-line array-callback-return
  const model = options.keys.map(async key => {
    try {
      return await getPresenter(options.client, options._class, key, key, options.options)
    } catch (err: any) {
      if ((options.ignoreMissing ?? false)) {
        return undefined
      }
      const stringKey = (typeof key === 'string') ? key : key.label
      console.error('Failed to find presenter for', key, err)
      const errorPresenter: AttributeModel = {
        key: '',
        sortingKey: '',
        presenter: ErrorPresenter,
        label: stringKey as IntlString,
        _class: core.class.TypeString,
        props: { error: err }
      }
      return errorPresenter
    }
  })
  console.log(model)
  return (await Promise.all(model)).filter(a => a !== undefined) as AttributeModel[]
}

function filterActions (client: Client, _class: Ref<Class<Obj>>, targets: ActionTarget[], derived: Ref<Class<Doc>> = core.class.Doc): Array<Ref<Action>> {
  const result: Array<Ref<Action>> = []
  const hierarchy = client.getHierarchy()
  for (const target of targets) {
    if (hierarchy.isDerived(_class, target.target) && client.getHierarchy().isDerived(target.target, derived)) {
      result.push(target.action)
    }
  }
  return result
}

/**
 * @public
 *
 * Find all action contributions applicable for specified _class.
 * If derivedFrom is specifie, only actions applicable to derivedFrom class will be used.
 * So if we have contribution for Doc, Space and we ask for SpaceWithStates and derivedFrom=Space,
 * we won't recieve Doc contribution but recieve Space ones.
 */
export async function getActions (client: Client, _class: Ref<Class<Obj>>, derived: Ref<Class<Doc>> = core.class.Doc): Promise<FindResult<Action>> {
  const targets = await client.findAll(view.class.ActionTarget, {})
  return await client.findAll(view.class.Action, { _id: { $in: filterActions(client, _class, targets, derived) } })
}

export async function deleteObject (client: Client & TxOperations, object: Doc): Promise<void> {
  const hierarchy = client.getHierarchy()
  const attributes = hierarchy.getAllAttributes(object._class)
  for (const [name, attribute] of attributes) {
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
      const collection = attribute.type as Collection<AttachedDoc>
      const allAttached = await client.findAll(collection.of, { attachedTo: object._id })
      for (const attached of allAttached) {
        deleteObject(client, attached).catch(err => console.log('failed to delete', name, err))
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
