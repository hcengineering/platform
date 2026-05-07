<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import core, {
    AnyAttribute,
    Association,
    AssociationQuery,
    Class,
    Client,
    Doc,
    Ref,
    TxOperations,
    Type
  } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel, IntlString, translate } from '@hcengineering/platform'
  import { getAttributePresenterClass, getClient, hasResource } from '@hcengineering/presentation'
  import { Loading, resizeObserver } from '@hcengineering/ui'
  import view, { BuildModelKey, Viewlet } from '@hcengineering/view'
  import {
    buildConfigLookup,
    canResolveAttribute,
    getKeyLabel,
    ViewletClassSettings
  } from '@hcengineering/view-resources'

  export let viewlet: Viewlet

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: citems = getConfig(viewlet)

  interface Config {
    value: string | BuildModelKey | undefined
    type: 'divider' | 'attribute'
  }

  interface AttributeConfig extends Config {
    type: 'attribute'
    enabled: boolean
    label: IntlString
    _class: Ref<Class<Doc>>
    icon: Asset | undefined
    order?: number
  }

  function getObjectConfig (_class: Ref<Class<Doc>>, param: string): AttributeConfig {
    const clazz = hierarchy.getClass(_class)
    return {
      type: 'attribute',
      value: param,
      label: clazz.label,
      enabled: true,
      icon: clazz.icon,
      _class
    }
  }

  function getAssociationLabel (client: TxOperations, param: string): IntlString {
    return getKeyLabel(client, viewlet.attachTo, param, undefined)
  }

  function getBaseConfig (viewlet: Viewlet): Config[] {
    const lookup = buildConfigLookup(hierarchy, viewlet.attachTo, viewlet.config, viewlet.options?.lookup)
    const result: Config[] = []
    const clazz = hierarchy.getClass(viewlet.attachTo)
    let wasOptional = false
    for (const param of viewlet.config) {
      if (typeof param === 'string') {
        if (viewlet.configOptions?.hiddenKeys?.includes(param)) continue
        if (param.length === 0) {
          result.push(getObjectConfig(viewlet.attachTo, param))
        } else if (param.startsWith('$associations.')) {
          const assocConfig: AttributeConfig = {
            type: 'attribute',
            value: param,
            enabled: true,
            label: getAssociationLabel(client, param),
            _class: viewlet.attachTo,
            icon: clazz.icon
          }
          result.push(assocConfig)
        } else {
          if (!canResolveAttribute(hierarchy, viewlet.attachTo, param, lookup)) continue
          const attrCfg: AttributeConfig = {
            type: 'attribute',
            value: param,
            enabled: true,
            label: getKeyLabel(client, viewlet.attachTo, param, lookup),
            _class: viewlet.attachTo,
            icon: clazz.icon
          }
          result.push(attrCfg)
        }
      } else {
        if (viewlet.configOptions?.hiddenKeys?.includes(param.key)) continue
        if (param.displayProps?.grow === true) {
          result.push({
            type: 'divider',
            value: param
          })
        } else {
          if (param.displayProps?.optional === true && !wasOptional) {
            wasOptional = true
            result.push({
              type: 'divider',
              value: ''
            })
          }
          if (!canResolveAttribute(hierarchy, viewlet.attachTo, param.key, lookup)) continue
          const attrCfg: AttributeConfig = {
            type: 'attribute',
            value: param,
            label: param.label ?? getKeyLabel(client, viewlet.attachTo, param.key, lookup),
            enabled: true,
            _class: viewlet.attachTo,
            icon: clazz.icon
          }
          result.push(attrCfg)
        }
      }
    }
    return result
  }

  function getValue (name: string, type: Type<any>, attrClass: Ref<Class<Doc>>): string {
    const presenter = hierarchy.classHierarchyMixin(attrClass, view.mixin.AttributePresenter)?.presenter
    if (presenter !== undefined) {
      return name
    }
    if (hierarchy.isDerived(type._class, core.class.RefTo)) {
      return '$lookup.' + name
    }
    return name
  }

  function processAttribute (attribute: AnyAttribute, result: Config[], useMixinProxy = false): void {
    if (attribute.hidden === true || attribute.label === undefined) return
    if (viewlet.configOptions?.hiddenKeys?.includes(attribute.name)) return
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) return
    const { attrClass, category } = getAttributePresenterClass(hierarchy, attribute.type)
    const value = getValue(attribute.name, attribute.type, attrClass)
    for (const res of result) {
      const key = getKey(res.value)
      if (key === undefined) continue
      if (key === attribute.name || key === value) return
      if (key === '' && isAttribute(res) && res.label === attribute.label) return
    }
    const mixin =
      category === 'object'
        ? view.mixin.ObjectPresenter
        : category === 'collection'
          ? view.mixin.CollectionPresenter
          : view.mixin.AttributePresenter
    const presenter = hierarchy.classHierarchyMixin(
      attrClass,
      mixin,
      (m) => hasResource(m.presenter) ?? false
    )?.presenter
    if (presenter === undefined) return
    const clazz = hierarchy.getClass(attribute.attributeOf)
    const extraProps = viewlet.configOptions?.extraProps
    if (useMixinProxy) {
      const newValue: AttributeConfig = {
        type: 'attribute',
        value: attribute.attributeOf + '.' + attribute.name,
        label: attribute.label,
        enabled: false,
        _class: attribute.attributeOf,
        icon: clazz.icon
      }
      if (!isExist(result, newValue)) {
        result.push(newValue)
      }
    } else {
      const newValue: AttributeConfig = {
        type: 'attribute',
        value: extraProps ? { ...extraProps, key: value } : value,
        label: attribute.label,
        enabled: false,
        _class: attribute.attributeOf,
        icon: clazz.icon
      }
      if (!isExist(result, newValue)) {
        result.push(newValue)
      }
    }
  }

  function getKey (value: string | BuildModelKey | undefined): string | undefined {
    return typeof value === 'string' ? value : value?.key
  }

  function isAttribute (val: Config): val is AttributeConfig {
    return val.type === 'attribute'
  }

  function isExist (result: Config[], newValue: Config): boolean {
    if (!isAttribute(newValue)) return false
    const newValueKey = getKey(newValue.value)
    if (newValueKey === undefined) return false

    for (const res of result) {
      if (!isAttribute(res)) {
        continue
      }
      if (getKey(res.value) === newValueKey) {
        return true
      }
      if (newValueKey === '' && res.label === newValue.label) {
        return true
      }
    }
    return false
  }

  async function getConfig (viewlet: Viewlet): Promise<Config[]> {
    const result = getBaseConfig(viewlet)
    if (viewlet.configOptions?.strict !== true) {
      const allAttributes = hierarchy.getAllAttributes(viewlet.attachTo)
      for (const [, attribute] of allAttributes) {
        processAttribute(attribute, result)
      }

      const desc = hierarchy.getDescendants(viewlet.attachTo)
      for (const d of desc) {
        if (!hierarchy.isMixin(d)) continue
        hierarchy.getOwnAttributes(d).forEach((attr) => {
          processAttribute(attr, result, true)
        })
      }

      await addAssociations(result, viewlet.attachTo)
    }

    async function addAssociations (
      result: Config[],
      _class: Ref<Class<Doc>>,
      parents: AssociationQuery[] = []
    ): Promise<void> {
      const ancestors = new Set(hierarchy.getAncestors(_class))
      const parent = hierarchy.getParentClass(_class)
      const parentMixins = hierarchy
        .getDescendants(parent)
        .map((p) => hierarchy.getClass(p))
        .filter((p) => hierarchy.isMixin(p._id) && p.extends && ancestors.has(p.extends))

      parentMixins.forEach((it) => {
        hierarchy.getOwnAttributes(it._id).forEach((attr) => {
          processAttribute(attr, result, true)
        })
      })

      const allClasses = [...ancestors, ...parentMixins.map((it) => it._id)]

      const associationsB = client.getModel().findAllSync(core.class.Association, { classA: { $in: allClasses } })
      const associationsA = client.getModel().findAllSync(core.class.Association, { classB: { $in: allClasses } })

      for (const a of associationsB) {
        await processAssociation(a, 'b', result, parents)
      }
      for (const a of associationsA) {
        await processAssociation(a, 'a', result, parents)
      }
    }

    function getParentsString (parents: AssociationQuery[]): string {
      return parents.map(([assocId, direction]) => `$associations.${assocId}_${direction === 1 ? 'a' : 'b'}`).join('.')
    }

    async function processAssociation (
      association: Association,
      direction: 'a' | 'b',
      result: Config[],
      parents: AssociationQuery[]
    ): Promise<void> {
      const associationName = `$associations.${association._id}_${direction}`
      const resultName = parents.length > 0 ? `${getParentsString(parents)}.${associationName}` : associationName

      const name = direction === 'a' ? association.nameA : association.nameB
      const targetClass = direction === 'a' ? association.classA : association.classB

      if (name.trim().length === 0) return
      const model = client.getModel()

      const resultLabels = parents
        .map((r) => {
          const assoc = model.findObject(r[0])
          if (assoc === undefined) return ''
          return r[1] === 1 ? assoc.nameA : assoc.nameB
        })
        .filter((it) => it.length > 0)
      resultLabels.push(name)
      const fullLabel = resultLabels.join(' › ')

      const clazz = hierarchy.getClass(targetClass)
      const newValue: AttributeConfig = {
        type: 'attribute',
        value: resultName,
        label: getEmbeddedLabel(fullLabel),
        enabled: false,
        _class: targetClass,
        icon: clazz.icon
      }

      if (!isExist(result, newValue)) {
        result.push(newValue)
      }

      const exists = result.find((p) => {
        const key = typeof p.value === 'string' ? p.value : p.value?.key
        return key === resultName
      })
      if ((exists as AttributeConfig)?.enabled) {
        await addAssociations(result, targetClass, [...parents, [association._id, direction === 'a' ? 1 : -1]])
        await addAssociationAttributes(result, targetClass, resultName, fullLabel)
      }
    }

    async function addAssociationAttributes (
      result: Config[],
      targetClass: Ref<Class<Doc>>,
      associationKey: string,
      associationLabel: string
    ): Promise<void> {
      const allAttributes = hierarchy.getAllAttributes(targetClass)
      for (const [, attribute] of allAttributes) {
        if (attribute.hidden || attribute.label === undefined) continue
        if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) continue
        const { attrClass, category } = getAttributePresenterClass(hierarchy, attribute.type)
        const mixin =
          category === 'object'
            ? view.mixin.ObjectPresenter
            : category === 'collection'
              ? view.mixin.CollectionPresenter
              : view.mixin.AttributePresenter
        const presenter = hierarchy.classHierarchyMixin(
          attrClass,
          mixin,
          (m) => hasResource(m.presenter) ?? false
        )?.presenter
        if (presenter === undefined) continue

        const fieldKey = `${associationKey}.${attribute.name}`
        const fieldLabel = getAssociationLabel(client, fieldKey)
        const translatedLabel = await translate(fieldLabel, {})
        const clazz = hierarchy.getClass(targetClass)
        const newValue: AttributeConfig = {
          type: 'attribute',
          value: fieldKey,
          label: getEmbeddedLabel(associationLabel + ' > ' + translatedLabel),
          enabled: false,
          _class: targetClass,
          icon: clazz.icon
        }
        if (!isExist(result, newValue)) {
          result.push(newValue)
        }
      }
    }

    return result
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#await citems}
        <Loading />
      {:then items}
        {#if items !== undefined}
          <ViewletClassSettings
            {viewlet}
            {items}
            on:restoreDefaults={() => {
              // TODO UBERF-9639: restore defaults
            }}
            on:save={(event) => {
              viewlet.config = event.detail
              viewlet = viewlet
              dispatch('update', event.detail)
            }}
          />
        {/if}
      {/await}
    </div>
  </div>
  <div class="menu-space" />
</div>
