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
  import presentation, { Card, createQuery, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import {
    Button,
    getEventPositionElement,
    getPlatformColorForText,
    Loading,
    SelectPopup,
    showPopup,
    ToggleButton
  } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
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
        loading = false
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
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
        result.push({
          value: param,
          label: param.label as IntlString,
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
    if (viewlet.hiddenKeys?.includes(attribute.name)) return
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) return
    const value = getValue(attribute.name, attribute.type)
    if (result.findIndex((p) => p.value === attribute.name) !== -1) return
    if (result.findIndex((p) => p.value === value) !== -1) return
    const { attrClass, category } = getAttributePresenterClass(hierarchy, attribute)
    const typeClass = hierarchy.getClass(attrClass)
    const mixin =
      category === 'object'
        ? view.mixin.ObjectPresenter
        : category === 'collection'
          ? view.mixin.CollectionPresenter
          : view.mixin.AttributePresenter
    let presenter = hierarchy.as(typeClass, mixin).presenter
    let parent = typeClass.extends
    while (presenter === undefined && parent !== undefined) {
      const pclazz = hierarchy.getClass(parent)
      presenter = hierarchy.as(pclazz, mixin).presenter
      parent = pclazz.extends
    }
    if (presenter === undefined) return
    const clazz = hierarchy.getClass(attribute.attributeOf)

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
        value,
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

    return preference === undefined ? result : setStatus(result, preference)
  }

  async function save (): Promise<void> {
    const config = attributes.filter((p) => p.enabled).map((p) => p.value)
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

  function restoreDefault (): void {
    attributes = getConfig(viewlet, undefined)
  }

  function setStatus (result: AttributeConfig[], preference: ViewletPreference): AttributeConfig[] {
    for (const key of result) {
      key.enabled = preference.config.findIndex((p) => deepEqual(p, key.value)) !== -1
    }
    result.sort((a, b) => {
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1
      }
      return (
        preference.config.findIndex((p) => deepEqual(p, a.value)) -
        preference.config.findIndex((p) => deepEqual(p, b.value))
      )
    })
    return result
  }

  const elements: HTMLElement[] = []
  let selected: number | undefined

  function dragswap (ev: MouseEvent, i: number): boolean {
    const s = selected as number
    if (i < s) {
      if (elements[i].offsetTop !== elements[s].offsetTop) {
        return ev.offsetY < elements[i].offsetHeight / 2
      } else {
        return ev.offsetX < elements[i].offsetWidth / 2
      }
    } else if (i > s) {
      if (elements[i].offsetTop !== elements[s].offsetTop) {
        return ev.offsetY > elements[i].offsetHeight / 2
      } else {
        return ev.offsetX > elements[i].offsetWidth / 2
      }
    }
    return false
  }

  function dragover (ev: MouseEvent, i: number) {
    const s = selected as number
    if (dragswap(ev, i)) {
      ;[attributes[i], attributes[s]] = [attributes[s], attributes[i]]
      selected = i
    }
  }

  function getColor (attribute: AttributeConfig): string {
    const color = getPlatformColorForText(attribute._class)
    return `${color + (attribute.enabled ? 'cc' : '33')};`
  }

  function getStyle (attribute: AttributeConfig): string {
    const color = getPlatformColorForText(attribute._class)
    return `border: 1px solid ${color + (attribute.enabled ? 'ff' : 'cc')};`
  }

  function groupByClasses (attributes: AttributeConfig[]): Map<Ref<Class<Doc>>, AttributeConfig[]> {
    const res = new Map()
    for (const attribute of attributes) {
      if (attribute.enabled) continue
      const arr = res.get(attribute._class) ?? []
      arr.push(attribute)
      res.set(attribute._class, arr)
    }
    return res
  }

  $: enabled = attributes.filter((p) => p.enabled)
  $: classes = groupByClasses(attributes)

  function getClassLabel (_class: Ref<Class<Doc>>): IntlString {
    return hierarchy.getClass(_class).label
  }
</script>

<Card
  label={view.string.CustomizeView}
  okAction={save}
  okLabel={presentation.string.Save}
  canSave={true}
  on:close={() => {
    dispatch('close')
  }}
>
  {#if loading}
    <Loading />
  {:else}
    <div class="flex-row-stretch flex-wrap">
      {#each enabled as attribute, i}
        <div
          class="m-0-5 border-radius-1 overflow-label"
          style={getStyle(attribute)}
          bind:this={elements[i]}
          draggable={true}
          on:dragover|preventDefault={(ev) => {
            dragover(ev, i)
          }}
          on:drop|preventDefault
          on:dragstart={() => {
            selected = i
          }}
          on:dragend={() => {
            selected = undefined
          }}
        >
          <ToggleButton
            backgroundColor={getColor(attribute)}
            icon={attribute.icon}
            label={attribute.label}
            bind:value={attribute.enabled}
          />
        </div>
      {/each}
    </div>
    <div class="flex-row-stretch flex-wrap">
      {#each Array.from(classes.keys()) as _class}
        <div class="m-0-5">
          <Button
            label={getClassLabel(_class)}
            on:click={(e) => {
              showPopup(
                SelectPopup,
                {
                  value: classes.get(_class)?.map((it) => ({ id: it.value, label: it.label }))
                },
                getEventPositionElement(e),
                (val) => {
                  if (val !== undefined) {
                    const value = classes.get(_class)?.find((it) => it.value === val)
                    if (value) {
                      value.enabled = true
                      attributes = attributes
                    }
                  }
                }
              )
            }}
          />
        </div>
      {/each}
    </div>
  {/if}
  <svelte:fragment slot="footer">
    <Button label={view.string.RestoreDefaults} on:click={restoreDefault} />
  </svelte:fragment>
</Card>
