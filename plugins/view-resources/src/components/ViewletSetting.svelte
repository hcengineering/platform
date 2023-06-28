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
  import { Button, Loading, ToggleWithLabel } from '@hcengineering/ui'
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
        items = getConfig(viewlet, preference)
        loading = false
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let items: (Config | AttributeConfig)[] = []
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

  async function save (): Promise<void> {
    const config = items
      .filter(
        (p) =>
          p.value !== undefined && (p.type === 'divider' || (p.type === 'attribute' && (p as AttributeConfig).enabled))
      )
      .map((p) => p.value as string | BuildModelKey)
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

  async function restoreDefault (): Promise<void> {
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

  function dragEnd () {
    selected = undefined
    save()
  }

  function dragOver (e: DragEvent, i: number) {
    e.preventDefault()
    e.stopPropagation()
    const s = selected as number
    if (dragswap(e, i, s)) {
      ;[items[i], items[s]] = [items[s], items[i]]
      selected = i
    }
  }

  const elements: HTMLElement[] = []

  function dragswap (ev: MouseEvent, i: number, s: number): boolean {
    if (i < s) {
      return ev.offsetY < elements[i].offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > elements[i].offsetHeight / 2
    }
    return false
  }

  function change (item: Config, value: boolean): void {
    if (isAttribute(item)) {
      item.enabled = value
      save()
    }
  }

  let selected: number | undefined
</script>

<div class="selectPopup">
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#if loading}
        <Loading />
      {:else}
        <div class="flex-row-reverse mb-2 mr-2">
          <Button
            on:click={restoreDefault}
            label={view.string.RestoreDefaults}
            size={'x-small'}
            kind={'link'}
            noFocus
          />
        </div>
        {#each items as item, i}
          {#if isAttribute(item)}
            <div
              class="menu-item flex-row-center"
              bind:this={elements[i]}
              draggable={viewlet.configOptions?.sortable && item.enabled}
              on:dragstart={(ev) => {
                if (ev.dataTransfer) {
                  ev.dataTransfer.effectAllowed = 'move'
                  ev.dataTransfer.dropEffect = 'move'
                }
                // ev.preventDefault()
                ev.stopPropagation()
                selected = i
              }}
              on:dragover|preventDefault={(e) => dragOver(e, i)}
              on:dragend={dragEnd}
            >
              <ToggleWithLabel
                on={item.enabled}
                label={item.label}
                on:change={(e) => {
                  change(item, e.detail)
                }}
              />
            </div>
          {:else}
            <div class="antiDivider" />
          {/if}
        {/each}
      {/if}
    </div>
  </div>
  <div class="menu-space" />
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
