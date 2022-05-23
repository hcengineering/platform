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
  import core, { AnyAttribute, ArrOf, AttachedDoc, Class, Collection, Doc, Ref, Type } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Icon, Label, showPopup } from '@anticrm/ui'
  import { Filter, KeyFilter } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let target: HTMLElement
  export let index: number
  export let onChange: (e: Filter) => void

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getFilters (_class: Ref<Class<Doc>>): KeyFilter[] {
    const clazz = hierarchy.getClass(_class)
    const mixin = hierarchy.as(clazz, view.mixin.ClassFilters)
    if (mixin.filters === undefined) return []
    const filters = mixin.filters.map((p) => {
      return typeof p === 'string' ? buildFilterFromKey(p) : p
    })
    const result: KeyFilter[] = []
    for (const filter of filters) {
      if (filter !== undefined) result.push(filter)
    }
    return result
  }

  function buildFilterFromKey (key: string): KeyFilter | undefined {
    const attribute = hierarchy.getAttribute(_class, key)
    return buildFilter(key, attribute)
  }

  function buildFilter (key: string, attribute: AnyAttribute): KeyFilter | undefined {
    const isCollection = hierarchy.isDerived(attribute.type._class, core.class.Collection)
    const targetClass = isCollection ? (attribute.type as Collection<AttachedDoc>).of : attribute.type._class
    const clazz = hierarchy.getClass(targetClass)
    const filter = hierarchy.as(clazz, view.mixin.AttributeFilter)
    if (filter.component === undefined) return undefined
    return {
      key: isCollection ? '_id' : key,
      label: attribute.label,
      icon: attribute.icon,
      component: filter.component
    }
  }

  function getValue (name: string, type: Type<any>): string {
    if (hierarchy.isDerived(type._class, core.class.ArrOf)) {
      return getValue(name, (type as ArrOf<any>).of)
    }
    return name
  }

  function getTypes (_class: Ref<Class<Doc>>): KeyFilter[] {
    const result = getFilters(_class)
    const allAttributes = hierarchy.getAllAttributes(_class)
    for (const [, attribute] of allAttributes) {
      if (attribute.isCustom !== true) continue
      if (attribute.label === undefined || attribute.hidden) continue
      const value = getValue(attribute.name, attribute.type)
      if (result.findIndex((p) => p.key === value) !== -1) continue
      const filter = buildFilter(value, attribute)
      if (filter !== undefined) {
        result.push(filter)
      }
    }

    return result
  }

  const actionElements: HTMLButtonElement[] = []

  const keyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'ArrowDown') {
      actionElements[(index + 1) % actionElements.length].focus()
    }

    if (event.key === 'ArrowUp') {
      actionElements[(actionElements.length + index - 1) % actionElements.length].focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')
    }
  }

  const dispatch = createEventDispatcher()

  function click (type: KeyFilter): void {
    dispatch('close')

    showPopup(
      type.component,
      {
        _class,
        filter: {
          key: type,
          value: [],
          index
        },
        onChange
      },
      target
    )
  }
</script>

<div class="antiPopup">
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#each getTypes(_class) as type, i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="ap-menuItem flex-row-center withIcon"
          on:keydown={(event) => keyDown(event, i)}
          on:mouseover={(event) => {
            event.currentTarget.focus()
          }}
          on:click={(event) => {
            click(type)
          }}
        >
          {#if type.icon}
            <div class="icon"><Icon icon={type.icon} size={'small'} /></div>
          {/if}
          <div class="ml-3 pr-1"><Label label={type.label} /></div>
        </button>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>

<style lang="scss">
  .withIcon {
    margin: 0;

    .icon {
      color: var(--content-color);
    }

    &:focus .icon {
      color: var(--accent-color);
    }
  }
</style>
