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
  import core, {
    AnyAttribute,
    ArrOf,
    AttachedDoc,
    Class,
    Collection,
    Doc,
    Ref,
    RefTo,
    Space,
    Type
  } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import {
    closePopup,
    closeTooltip,
    Icon,
    Label,
    resizeObserver,
    Scroller,
    showPopup,
    Submenu
  } from '@hcengineering/ui'
  import { Filter, KeyFilter } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { FilterQuery } from '../../filter'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let target: HTMLElement
  export let filter: Filter | undefined
  export let index: number
  export let onChange: (e: Filter) => void

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getFilters (_class: Ref<Class<Doc>>): KeyFilter[] {
    const clazz = hierarchy.getClass(_class)
    const mixin = hierarchy.as(clazz, view.mixin.ClassFilters)
    if (mixin.filters === undefined) return []
    const filters = mixin.filters.map((p) => {
      return typeof p === 'string' ? buildFilterFromKey(_class, p) : p
    })
    const result: KeyFilter[] = []
    for (const filter of filters) {
      if (filter !== undefined) result.push(filter)
    }
    return result
  }

  function buildFilterFromKey (_class: Ref<Class<Doc>>, key: string): KeyFilter | undefined {
    const attribute = hierarchy.getAttribute(_class, key)
    return buildFilter(_class, key, attribute)
  }

  function buildFilter (_class: Ref<Class<Doc>>, key: string, attribute: AnyAttribute): KeyFilter | undefined {
    const isCollection = hierarchy.isDerived(attribute.type._class, core.class.Collection)
    const targetClass = isCollection ? (attribute.type as Collection<AttachedDoc>).of : attribute.type._class
    const clazz = hierarchy.getClass(targetClass)
    const filter = hierarchy.as(clazz, view.mixin.AttributeFilter)

    const attrOf = hierarchy.getClass(attribute.attributeOf)
    if (filter.component === undefined) return undefined
    return {
      _class,
      key: isCollection ? '_id' : key,
      attribute,
      label: attribute.label,
      icon: attribute.icon ?? clazz.icon ?? attrOf.icon ?? view.icon.Setting,
      component: filter.component
    }
  }

  function getValue (name: string, type: Type<any>): string {
    if (hierarchy.isDerived(type._class, core.class.ArrOf)) {
      return getValue(name, (type as ArrOf<any>).of)
    }
    return name
  }

  function buildFilterForAttr (_class: Ref<Class<Doc>>, attribute: AnyAttribute, result: KeyFilter[]): void {
    if (attribute.label === undefined || attribute.hidden) {
      return
    }
    const value = getValue(attribute.name, attribute.type)
    if (result.findIndex((p) => p.key === value) !== -1) {
      return
    }
    const filter = buildFilter(_class, value, attribute)
    if (filter !== undefined) {
      result.push(filter)
    }
  }

  function buildFilterFor (
    _class: Ref<Class<Doc>>,
    allAttributes: Map<string, AnyAttribute>,
    result: KeyFilter[]
  ): void {
    for (const [, attribute] of allAttributes) {
      buildFilterForAttr(_class, attribute, result)
    }
  }

  function getTypes (_class: Ref<Class<Doc>>): KeyFilter[] {
    const result = getFilters(_class)
    const allAttributes = hierarchy.getAllAttributes(_class)
    buildFilterFor(_class, allAttributes, result)

    const desc = hierarchy.getDescendants(_class)
    for (const d of desc) {
      const extra = hierarchy.getOwnAttributes(d)
      for (const [k, v] of extra) {
        if (!allAttributes.has(k)) {
          allAttributes.set(k, v)
          buildFilterForAttr(d, v, result)
        }
      }
    }

    const ancestors = new Set(hierarchy.getAncestors(_class))
    const parent = hierarchy.getParentClass(_class)
    const parentMixins = hierarchy
      .getDescendants(parent)
      .map((p) => hierarchy.getClass(p))
      .filter((p) => hierarchy.isMixin(p._id) && p.extends && ancestors.has(p.extends))

    for (const d of parentMixins) {
      const extra = hierarchy.getOwnAttributes(d._id)
      for (const [k, v] of extra) {
        if (!allAttributes.has(k)) {
          allAttributes.set(k, v)
          buildFilterForAttr(d._id, v, result)
        }
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
    closePopup()
    closeTooltip()

    showPopup(
      type.component,
      {
        _class,
        space,
        filter: filter || {
          key: type,
          value: [],
          index
        },
        onChange
      },
      target
    )
  }

  function hasNested (type: KeyFilter): boolean {
    const targetClass = (hierarchy.getAttribute(type._class, type.key).type as RefTo<Doc>).to
    const clazz = hierarchy.getClass(targetClass)
    return hierarchy.hasMixin(clazz, view.mixin.ClassFilters)
  }

  function setNestedFilter (type: KeyFilter, e: Filter | undefined) {
    const filter: Filter = {
      value: [],
      key: type,
      index,
      mode: view.filter.FilterNestedMatch,
      modes: [view.filter.FilterNestedMatch, view.filter.FilterNestedDontMatch],
      onRemove: () => {
        FilterQuery.remove(index)
      }
    }
    if (e === undefined || filter === undefined) return
    filter.nested = e
    filter.value = e.value
    onChange(filter)
    dispatch('close')
  }

  function getNestedProps (type: KeyFilter): any {
    const targetClass = (hierarchy.getAttribute(_class, type.key).type as RefTo<Doc>).to
    return {
      _class: targetClass,
      space,
      index,
      target,
      onChange: (e: Filter | undefined) => {
        setNestedFilter(type, e)
      }
    }
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <Scroller>
    {#each getTypes(_class) as type, i}
      {#if filter === undefined && type.component === view.component.ObjectFilter && hasNested(type)}
        <Submenu
          on:keydown={(event) => keyDown(event, i)}
          on:click={(event) => {
            click(type)
          }}
          icon={type.icon}
          label={type.label}
          props={getNestedProps(type)}
          options={{ component: view.component.FilterTypePopup }}
          withHover
        />
      {:else}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="menu-item withIcon"
          on:keydown={(event) => keyDown(event, i)}
          on:mouseover={(event) => {
            event.currentTarget.focus()
          }}
          on:click={(event) => {
            click(type)
          }}
        >
          <div class="icon mr-3">
            {#if type.icon}
              <Icon icon={type.icon} size={'small'} />
            {/if}
          </div>
          <div class="pr-1"><Label label={type.label} /></div>
        </button>
      {/if}
    {/each}
  </Scroller>
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
