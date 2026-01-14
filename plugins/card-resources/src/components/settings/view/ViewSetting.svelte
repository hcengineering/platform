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

  import core, { AnyAttribute, Association, AssociationQuery, Class, Doc, Ref, Type } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { getAttributePresenterClass, getClient, hasResource } from '@hcengineering/presentation'
  import { resizeObserver } from '@hcengineering/ui'
  import view, { BuildModelKey, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { buildConfigLookup, getKeyLabel, ViewletClassSettings } from '@hcengineering/view-resources'

  export let viewlet: Viewlet

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: citems = getConfig(viewlet, undefined)

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
        } else {
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
      const key = typeof res.value === 'string' ? res.value : res.value?.key
      if (key === undefined) return
      if (key === attribute.name) return
      if (key === value) return
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

  function isAttribute (val: Config): val is AttributeConfig {
    return val.type === 'attribute'
  }

  function isExist (result: Config[], newValue: Config): boolean {
    for (const res of result) {
      if (!isAttribute(res)) continue
      if (!isAttribute(newValue)) continue
      if (res._class !== newValue._class) continue
      if (typeof res.value === 'string') {
        if (res.value === newValue.value) return true
      }
    }
    return false
  }

  function getConfig (viewlet: Viewlet, preference: ViewletPreference | undefined): Config[] {
    const result = getBaseConfig(viewlet)

    if (viewlet.configOptions?.strict !== true) {
      const allAttributes = hierarchy.getAllAttributes(viewlet.attachTo)
      for (const [, attribute] of allAttributes) {
        processAttribute(attribute, result)
      }

      hierarchy.getDescendants(viewlet.attachTo).forEach((it) => {
        hierarchy.getOwnAttributes(it).forEach((attr) => {
          processAttribute(attr, result, true)
        })
      })

      const desc = hierarchy.getDescendants(viewlet.attachTo)
      for (const d of desc) {
        if (!hierarchy.isMixin(d)) continue
        hierarchy.getOwnAttributes(d).forEach((attr) => {
          processAttribute(attr, result, true)
        })
      }

      addAssociations(result, viewlet.attachTo, preference)
    }

    function addAssociations (
      result: Config[],
      _class: Ref<Class<Doc>>,
      preference: ViewletPreference | undefined,
      parents: AssociationQuery[] = []
    ): void {
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

      associationsB.forEach((a) => {
        processAssociation(a, 'b', result, preference, parents)
      })
      associationsA.forEach((a) => {
        processAssociation(a, 'a', result, preference, parents)
      })
    }

    function getParentsString (parents: AssociationQuery[]): string {
      return parents.map(([assocId, direction]) => `$associations.${assocId}_${direction === 1 ? 'a' : 'b'}`).join('.')
    }

    function processAssociation (
      association: Association,
      direction: 'a' | 'b',
      result: Config[],
      preference: ViewletPreference | undefined,
      parents: AssociationQuery[]
    ): void {
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

      if (preference === undefined) return
      const exists = preference.config.find((p) => {
        const key = typeof p === 'string' ? p : p.key
        return key === resultName
      })
      if (exists) {
        addAssociations(result, targetClass, preference, [...parents, [association._id, direction === 'a' ? 1 : -1]])
      }
    }

    return preference === undefined ? result : []
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#if citems !== undefined}
        <ViewletClassSettings
          {viewlet}
          items={citems}
          on:restoreDefaults={() => {
            // TODO UBERF-9639: restore defaults
          }}
          on:save={(event) => {
            dispatch('update', event.detail)
          }}
        />
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>
