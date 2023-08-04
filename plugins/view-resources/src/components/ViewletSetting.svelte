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
  import { Loading } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'
  import view from '../plugin'
  import { buildConfigLookup, getKeyLabel } from '../utils'
  import ViewletClassSettings from './ViewletClassSettings.svelte'
  import DropdownLabelsIntl from '@hcengineering/ui/src/components/DropdownLabelsIntl.svelte'

  export let viewlet: Viewlet

  let preferences: ViewletPreference[] = []
  const preferenceQuery = createQuery()

  let selected = viewlet._id

  let viewlets: Viewlet[] = []

  $: client
    .findAll(view.class.Viewlet, {
      attachTo: {
        $in: client
          .getHierarchy()
          .getDescendants(viewlet.attachTo)
          .filter((it) => !client.getHierarchy().isMixin(it) || it === viewlet.attachTo)
      },
      variant: viewlet.variant ? viewlet.variant : { $exists: false },
      descriptor: viewlet.descriptor
    })
    .then((res) => {
      viewlets = res
    })

  $: if (viewlet && viewlets.length > 0) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: { $in: Array.from(viewlets.map((it) => it._id)) }
      },
      (res) => {
        preferences = res
        loading = false
      }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let loading = true

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
          result.push({
            type: 'attribute',
            value: param,
            enabled: true,
            label: getKeyLabel(client, viewlet.attachTo, param, lookup),
            _class: viewlet.attachTo,
            icon: clazz.icon
          } as AttributeConfig)
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
          result.push({
            type: 'attribute',
            value: param,
            label: param.label ?? getKeyLabel(client, viewlet.attachTo, param.key, lookup),
            enabled: true,
            _class: viewlet.attachTo,
            icon: clazz.icon
          } as AttributeConfig)
        }
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

  function processAttribute (attribute: AnyAttribute, result: Config[], useMixinProxy = false): void {
    if (attribute.hidden === true || attribute.label === undefined) return
    if (viewlet.configOptions?.hiddenKeys?.includes(attribute.name)) return
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) return
    const value = getValue(attribute.name, attribute.type)
    for (const res of result) {
      const key = typeof res.value === 'string' ? res.value : res.value?.key
      if (key === undefined) return
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

    return preference === undefined ? result : setStatus(result, preference)
  }

  async function save (viewletId: Ref<Viewlet>, items: (Config | AttributeConfig)[]): Promise<void> {
    const configValues = items.filter(
      (p) =>
        p.value !== undefined &&
        ((p.type === 'divider' && typeof p.value === 'object' && p.value.displayProps?.grow) ||
          (p.type === 'attribute' && (p as AttributeConfig).enabled))
    )
    const config = configValues.map((p) => p.value as string | BuildModelKey)
    const preference = preferences.find((p) => p.attachedTo === viewletId)
    if (preference !== undefined) {
      await client.update(preference, {
        config
      })
    } else {
      await client.createDoc(view.class.ViewletPreference, preferencePlugin.space.Preference, {
        attachedTo: viewletId,
        config
      })
    }
  }

  async function restoreDefault (viewletId: Ref<Viewlet>): Promise<void> {
    const preference = preferences.find((p) => p.attachedTo === viewletId)
    if (preference !== undefined) {
      await client.remove(preference)
    }
  }

  function setStatus (result: Config[], preference: ViewletPreference): Config[] {
    for (const key of result) {
      if (!isAttribute(key)) continue
      const index = preference.config.findIndex((p) => deepEqual(p, key.value))
      key.enabled = index !== -1
      key.order = index !== -1 ? index : undefined
    }
    if (viewlet.configOptions?.sortable) {
      result.sort((a, b) => {
        if (!isAttribute(a) || !isAttribute(b)) return 0
        if (a.order === undefined && b.order === undefined) return 0
        if (a.order === undefined) return 1
        if (b.order === undefined) return -1
        return a.order - b.order
      })
    }
    return result
  }
</script>

<div class="selectPopup">
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#if loading}
        <Loading />
      {:else}
        {#if viewlets.length > 1}
          <div class="p-1">
            <DropdownLabelsIntl
              kind={'ghost'}
              items={viewlets.map((it) => ({ id: it._id, label: hierarchy.getClass(it.attachTo).label }))}
              {selected}
              on:selected={(evt) => {
                selected = evt.detail
              }}
              width={'100%'}
            />
          </div>
        {/if}
        {@const selectedViewlet = viewlets.find((it) => it._id === selected)}
        {@const selectedPreferece = preferences.find((it) => it.attachedTo === selected)}
        {#if selectedViewlet}
          {@const citems = getConfig(selectedViewlet, selectedPreferece)}
          <ViewletClassSettings
            {viewlet}
            items={citems}
            on:restoreDefaults={() => {
              restoreDefault(selected)
            }}
            on:save={(evt) => {
              save(selected, evt.detail)
            }}
          />
        {/if}
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>
