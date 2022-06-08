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
  import presentation, { Card, createQuery, getAttributePresenterClass, getClient } from '@anticrm/presentation'
  import { BuildModelKey, Viewlet, ViewletPreference } from '@anticrm/view'
  import core, { ArrOf, Class, Doc, Lookup, Ref, Type } from '@anticrm/core'
  import { Button, ToggleButton } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@anticrm/platform'
  import { buildConfigLookup, getLookupClass, getLookupLabel, getLookupProperty } from '../utils'
  import { deepEqual } from 'fast-equals'
  import preferencePlugin from '@anticrm/preference'
  import view from '../plugin'

  export let viewlet: Viewlet

  let preference: ViewletPreference | undefined
  const preferenceQuery = createQuery()

  $: viewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        attributes = getConfig(viewlet, preference)
      },
      { limit: 1 }
    )

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  let attributes = getConfig(viewlet, preference)

  interface AttributeConfig {
    enabled: boolean
    label: IntlString
    value: string | BuildModelKey
  }

  function getObjectConfig (_class: Ref<Class<Doc>>, param: string): AttributeConfig {
    const clazz = client.getHierarchy().getClass(_class)
    return {
      value: param,
      label: clazz.label,
      enabled: true
    }
  }

  function getBaseConfig (viewlet: Viewlet): AttributeConfig[] {
    const lookup = buildConfigLookup(hierarchy, viewlet.attachTo, viewlet.config)
    const result: AttributeConfig[] = []
    for (const param of viewlet.config) {
      if (typeof param === 'string') {
        if (param.length === 0) {
          result.push(getObjectConfig(viewlet.attachTo, param))
        } else {
          result.push({
            value: param,
            enabled: true,
            label: getKeyLabel(viewlet.attachTo, param, lookup)
          })
        }
      } else {
        result.push({
          value: param,
          label: param.label as IntlString,
          enabled: true
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

  function getConfig (viewlet: Viewlet, preference: ViewletPreference | undefined): AttributeConfig[] {
    const result = getBaseConfig(viewlet)

    const allAttributes = hierarchy.getAllAttributes(viewlet.attachTo)
    for (const [, attribute] of allAttributes) {
      if (attribute.hidden === true || attribute.label === undefined) continue
      if (viewlet.hiddenKeys?.includes(attribute.name)) continue
      if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) continue
      const value = getValue(attribute.name, attribute.type)
      if (result.findIndex((p) => p.value === value) !== -1) continue
      const typeClassId = getAttributePresenterClass(hierarchy, attribute).attrClass
      const typeClass = hierarchy.getClass(typeClassId)
      let presenter = hierarchy.as(typeClass, view.mixin.AttributePresenter).presenter
      let parent = typeClass.extends
      while (presenter === undefined && parent !== undefined) {
        const pclazz = hierarchy.getClass(parent)
        presenter = hierarchy.as(pclazz, view.mixin.AttributePresenter).presenter
        parent = pclazz.extends
      }
      if (presenter === undefined) continue
      result.push({
        value,
        label: attribute.label,
        enabled: false
      })
    }

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

  function getKeyLabel<T extends Doc> (_class: Ref<Class<T>>, key: string, lookup: Lookup<T> | undefined): IntlString {
    if (key.startsWith('$lookup') && lookup !== undefined) {
      const lookupClass = getLookupClass(key, lookup, _class)
      const lookupProperty = getLookupProperty(key)
      const lookupKey = { key: lookupProperty[0] }
      return getLookupLabel(client, lookupClass[1], lookupClass[0], lookupKey, lookupProperty[1])
    } else {
      const attribute = hierarchy.getAttribute(_class, key)
      return attribute.label
    }
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
  <div class="flex flex-wrap flex-row">
    {#each attributes as attribute, i}
      <div
        class="mr-2 mb-2"
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
        <ToggleButton label={attribute.label} bind:value={attribute.enabled} />
      </div>
    {/each}
  </div>
  <svelte:fragment slot="footer">
    <Button label={view.string.RestoreDefaults} on:click={restoreDefault} />
  </svelte:fragment>
</Card>
