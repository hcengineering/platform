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

import core, { AttachedDoc, Class, Client, Doc, Hierarchy, Lookup, Obj, Ref, TxOperations } from '@anticrm/core'
import type { IntlString } from '@anticrm/platform'
import { getResource } from '@anticrm/platform'
import { getAttributePresenterClass, KeyedAttribute } from '@anticrm/presentation'
import { AnyComponent, ErrorPresenter, getPlatformColorForText } from '@anticrm/ui'
import type { BuildModelOptions } from '@anticrm/view'
import view, { AttributeModel, BuildModelKey } from '@anticrm/view'
import plugin from './plugin'

/**
 * Define some properties to be used to show component until data is properly loaded.
 */
export interface LoadingProps {
  length: number
}

/**
 * @public
 */
export async function getObjectPresenter (
  client: Client,
  _class: Ref<Class<Obj>>,
  preserveKey: BuildModelKey
): Promise<AttributeModel> {
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
  const key = preserveKey.sortingKey ?? preserveKey.key
  const sortingKey =
    clazz.sortingKey !== undefined ? (key.length > 0 ? key + '.' + clazz.sortingKey : clazz.sortingKey) : key
  return {
    key: preserveKey.key,
    _class,
    label: preserveKey.label ?? clazz.label,
    presenter,
    props: preserveKey.props,
    sortingKey
  }
}

/**
 * @public
 */
export async function getObjectPreview (client: Client, _class: Ref<Class<Obj>>): Promise<AnyComponent | undefined> {
  const clazz = client.getHierarchy().getClass(_class)
  const presenterMixin = client.getHierarchy().as(clazz, view.mixin.PreviewPresenter)
  if (presenterMixin.presenter === undefined) {
    if (clazz.extends !== undefined) {
      return await getObjectPreview(client, clazz.extends)
    }
  }
  return presenterMixin?.presenter
}

async function getAttributePresenter (
  client: Client,
  _class: Ref<Class<Obj>>,
  key: string,
  preserveKey: BuildModelKey
): Promise<AttributeModel> {
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
  const resultKey = preserveKey.sortingKey ?? preserveKey.key
  const sortingKey = attribute.type._class === core.class.ArrOf ? resultKey + '.length' : resultKey
  const presenter = await getResource(presenterMixin.presenter)

  return {
    key: preserveKey.key,
    sortingKey,
    _class: attrClass,
    label: preserveKey.label ?? attribute.label,
    presenter,
    props: {},
    icon: presenterMixin.icon,
    attribute
  }
}

async function getPresenter<T extends Doc> (
  client: Client,
  _class: Ref<Class<T>>,
  key: BuildModelKey,
  preserveKey: BuildModelKey,
  lookup?: Lookup<T>
): Promise<AttributeModel> {
  if (key.presenter !== undefined) {
    const { presenter, label, sortingKey } = key
    return {
      key: key.key ?? '',
      sortingKey: sortingKey ?? '',
      _class,
      label: label as IntlString,
      presenter: await getResource(presenter),
      props: key.props
    }
  }
  if (key.key.length === 0) {
    return await getObjectPresenter(client, _class, preserveKey)
  } else {
    if (key.key.startsWith('$lookup')) {
      if (lookup === undefined) {
        throw new Error(`lookup class does not provided for ${key.key}`)
      }
      return await getLookupPresenter(client, _class, key, preserveKey, lookup)
    }
    return await getAttributePresenter(client, _class, key.key, preserveKey)
  }
}

export async function buildModel (options: BuildModelOptions): Promise<AttributeModel[]> {
  console.log('building table model for', options)
  // eslint-disable-next-line array-callback-return
  const model = options.keys
    .map((key) => (typeof key === 'string' ? { key: key } : key))
    .map(async (key) => {
      try {
        return await getPresenter(options.client, options._class, key, key, options.options?.lookup)
      } catch (err: any) {
        if (options.ignoreMissing ?? false) {
          return undefined
        }
        const stringKey = key.label ?? key.key
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
  return (await Promise.all(model)).filter((a) => a !== undefined) as AttributeModel[]
}

export async function deleteObject (client: TxOperations, object: Doc): Promise<void> {
  if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
    const adoc = object as AttachedDoc
    await client
      .removeCollection(object._class, object.space, adoc._id, adoc.attachedTo, adoc.attachedToClass, adoc.collection)
      .catch((err) => console.error(err))
  } else {
    await client.removeDoc(object._class, object.space, object._id).catch((err) => console.error(err))
  }
}

export function getMixinStyle (id: Ref<Class<Doc>>, selected: boolean): string {
  const color = getPlatformColorForText(id as string)
  return `
    color: ${selected ? '#fff' : 'var(--theme-caption-color)'};
    background: ${color + (selected ? 'ff' : '33')};
    border: 1px solid ${color + (selected ? '0f' : '66')};
  `
}

async function getLookupPresenter<T extends Doc> (
  client: Client,
  _class: Ref<Class<T>>,
  key: BuildModelKey,
  preserveKey: BuildModelKey,
  lookup: Lookup<T>
): Promise<AttributeModel> {
  const lookupClass = getLookupClass(key.key, lookup, _class)
  const lookupProperty = getLookupProperty(key.key)
  const lookupKey = { ...key, key: lookupProperty[0] }
  const model = await getPresenter(client, lookupClass[0], lookupKey, preserveKey)
  model.label = getLookupLabel(client, lookupClass[1], lookupClass[0], lookupKey, lookupProperty[1])
  return model
}

function getLookupLabel<T extends Doc> (
  client: Client,
  _class: Ref<Class<T>>,
  lookupClass: Ref<Class<Doc>>,
  key: BuildModelKey,
  attrib: string
): IntlString {
  if (key.label !== undefined) return key.label
  if (key.key === '') {
    try {
      const attribute = client.getHierarchy().getAttribute(_class, attrib)
      return attribute.label
    } catch {}
    const clazz = client.getHierarchy().getClass(lookupClass)
    return clazz.label
  } else {
    const attribute = client.getHierarchy().getAttribute(lookupClass, key.key)
    return attribute.label
  }
}

function getLookupClass<T extends Doc> (
  key: string,
  lookup: Lookup<T>,
  parent: Ref<Class<T>>
): [Ref<Class<Doc>>, Ref<Class<Doc>>] {
  const _class = getLookup(key, lookup, parent)
  if (_class === undefined) {
    throw new Error('lookup class does not provided for ' + key)
  }
  return _class
}

function getLookupProperty (key: string): [string, string] {
  const parts = key.split('$lookup')
  const lastPart = parts[parts.length - 1]
  const split = lastPart.split('.').filter((p) => p.length > 0)
  const prev = split.shift() ?? ''
  const result = split.join('.')
  return [result, prev]
}

function getLookup (
  key: string,
  lookup: Lookup<any>,
  parent: Ref<Class<Doc>>
): [Ref<Class<Doc>>, Ref<Class<Doc>>] | undefined {
  const parts = key.split('$lookup.').filter((p) => p.length > 0)
  const currentKey = parts[0].split('.').filter((p) => p.length > 0)[0]
  const current = (lookup as any)[currentKey]
  const nestedKey = parts.slice(1).join('$lookup.')
  if (nestedKey.length > 0) {
    if (!Array.isArray(current)) {
      return
    }
    return getLookup(nestedKey, current[1], current[0])
  }
  if (Array.isArray(current)) {
    return [current[0], parent]
  }
  if (current === undefined && lookup._id !== undefined) {
    const reverse = (lookup._id as any)[currentKey]
    return reverse !== undefined ? [reverse, parent] : undefined
  }
  return current !== undefined ? [current, parent] : undefined
}

export function getBooleanLabel (value: boolean | undefined): IntlString {
  if (value === true) return plugin.string.LabelYes
  if (value === false) return plugin.string.LabelNo
  return plugin.string.LabelNA
}
export function getCollectionCounter (hierarchy: Hierarchy, object: Doc, key: KeyedAttribute): number {
  if (hierarchy.isMixin(key.attr.attributeOf)) {
    return (hierarchy.as(object, key.attr.attributeOf) as any)[key.key]
  }
  return (object as any)[key.key] ?? 0
}
