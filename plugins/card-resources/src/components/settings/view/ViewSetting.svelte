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

  import core, { AnyAttribute, Class, Doc, Ref, Type } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
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
    const { attrClass, category } = getAttributePresenterClass(hierarchy, attribute)
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

      const ancestors = new Set(hierarchy.getAncestors(viewlet.attachTo))
      const parent = hierarchy.getParentClass(viewlet.attachTo)
      const parentMixins = hierarchy
        .getDescendants(parent)
        .map((p) => hierarchy.getClass(p))
        .filter((p) => hierarchy.isMixin(p._id) && p.extends && ancestors.has(p.extends))

      parentMixins.forEach((it) => {
        hierarchy.getOwnAttributes(it._id).forEach((attr) => {
          processAttribute(attr, result, true)
        })
      })
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
            // TODO
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
