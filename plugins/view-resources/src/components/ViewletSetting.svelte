<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { AnyAttribute, ArrOf, Class, Doc, Ref, Type } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import preferencePlugin from '@hcengineering/preference'
  import { createQuery, getAttributePresenterClass, getClient, hasResource } from '@hcengineering/presentation'
  import { Loading, ToggleWithLabel } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'
  import view from '../plugin'
  import { buildConfigLookup, getKeyLabel } from '../utils'

  export let viewlet: Viewlet

  let preference: ViewletPreference | undefined
  const preferenceQuery = createQuery()

  $: if (viewlet) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        attributes = getConfig(viewlet, preference)
        classes = groupByClasses(attributes)
        loading = false
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let attributes: AttributeConfig[] = []
  let loading = true

  interface AttributeConfig {
    enabled: boolean
    label: IntlString
    value: string | BuildModelKey
    _class: Ref<Class<Doc>>
    icon: Asset | undefined
  }

  function getObjectConfig (_class: Ref<Class<Doc>>, param: string): AttributeConfig {
    const clazz = hierarchy.getClass(_class)
    return {
      value: param,
      label: clazz.label,
      enabled: true,
      icon: clazz.icon,
      _class
    }
  }

  function getBaseConfig (viewlet: Viewlet): AttributeConfig[] {
    const lookup = buildConfigLookup(hierarchy, viewlet.attachTo, viewlet.config, viewlet.options?.lookup)
    const result: AttributeConfig[] = []
    const clazz = hierarchy.getClass(viewlet.attachTo)
    for (const param of viewlet.config) {
      if (typeof param === 'string') {
        if (viewlet.configOptions?.hiddenKeys?.includes(param)) continue
        if (param.length === 0) {
          result.push(getObjectConfig(viewlet.attachTo, param))
        } else {
          result.push({
            value: param,
            enabled: true,
            label: getKeyLabel(client, viewlet.attachTo, param, lookup),
            _class: viewlet.attachTo,
            icon: clazz.icon
          })
        }
      } else {
        if (viewlet.configOptions?.hiddenKeys?.includes(param.key)) continue
        result.push({
          value: param,
          label: param.label ?? getKeyLabel(client, viewlet.attachTo, param.key, lookup),
          enabled: true,
          _class: viewlet.attachTo,
          icon: clazz.icon
        })
      }
    }
    return result
  }

  function getValue (name: string, type: Type<any>): string {
    if (hierarchy.isDerived(type._class, core.class.RefTo)) {
      return '$lookup.' + name
    }
    if (hierarchy.isDerived(type._class, core.class.ArrOf)) {
      return getValue(name, (type as ArrOf<any>).of)
    }
    return name
  }

  function processAttribute (attribute: AnyAttribute, result: AttributeConfig[], useMixinProxy = false): void {
    if (attribute.hidden === true || attribute.label === undefined) return
    if (viewlet.configOptions?.hiddenKeys?.includes(attribute.name)) return
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) return
    const value = getValue(attribute.name, attribute.type)
    for (const res of result) {
      const key = typeof res.value === 'string' ? res.value : res.value.key
      if (key === attribute.name) return
      if (key === value) return
    }
    const { attrClass, category } = getAttributePresenterClass(hierarchy, attribute)
    const mixin =
      category === 'object'
        ? view.mixin.ObjectPresenter
        : category === 'collection'
          ? view.mixin.CollectionPresenter
          : view.mixin.AttributePresenter
    const presenter = hierarchy.classHierarchyMixin(attrClass, mixin, (m) => hasResource(m.presenter))?.presenter
    if (presenter === undefined) return
    const clazz = hierarchy.getClass(attribute.attributeOf)
    const extraProps = viewlet.configOptions?.extraProps
    if (useMixinProxy) {
      const newValue = {
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
      const newValue = {
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

  function isExist (result: AttributeConfig[], newValue: AttributeConfig): boolean {
    for (const res of result) {
      if (res._class !== newValue._class) continue
      if (typeof res.value === 'string') {
        if (res.value === newValue.value) return true
      }
    }
    return false
  }

  function getConfig (viewlet: Viewlet, preference: ViewletPreference | undefined): AttributeConfig[] {
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

    return preference === undefined ? result : setStatus(result, preference)
  }

  async function save (): Promise<void> {
    const config = Array.from(classes.values())
      .flat()
      .filter((p) => p.enabled)
      .map((p) => p.value)
    if (preference !== undefined) {
      await client.update(preference, {
        config
      })
    } else {
      await client.createDoc(view.class.ViewletPreference, preferencePlugin.space.Preference, {
        attachedTo: viewlet._id,
        config
      })
    }
  }

  // function restoreDefault (): void {
  //   attributes = getConfig(viewlet, undefined)
  //   classes = groupByClasses(attributes)
  // }

  function setStatus (result: AttributeConfig[], preference: ViewletPreference): AttributeConfig[] {
    for (const key of result) {
      key.enabled = preference.config.findIndex((p) => deepEqual(p, key.value)) !== -1
    }
    return result
  }

  function groupByClasses (attributes: AttributeConfig[]): Map<Ref<Class<Doc>>, AttributeConfig[]> {
    const res = new Map()
    for (const attribute of attributes) {
      const arr = res.get(attribute._class) ?? []
      arr.push(attribute)
      res.set(attribute._class, arr)
    }
    return res
  }

  let classes: Map<Ref<Class<Doc>>, AttributeConfig[]> = new Map()
</script>

<div class="selectPopup p-2">
  <div class="scroll">
    {#if loading}
      <Loading />
    {:else}
      {#each Array.from(classes.keys()) as _class, i}
        {@const items = classes.get(_class) ?? []}
        {#if i !== 0}
          <div class="menu-separator" />
        {/if}
        {#each items as item}
          <div class="item">
            <ToggleWithLabel
              on={item.enabled}
              label={item.label}
              on:change={(e) => {
                item.enabled = e.detail
                save()
              }}
            />
          </div>
        {/each}
      {/each}
    {/if}
  </div>
</div>

<style lang="scss">
  .item {
    padding: 0.5rem;
    border-radius: 0.25rem;
    &:hover {
      background-color: var(--theme-button-hovered);
    }
  }
</style>
