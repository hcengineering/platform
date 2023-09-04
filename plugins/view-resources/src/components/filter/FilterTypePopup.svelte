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
  import core, { AnyAttribute, ArrOf, Class, Doc, Ref, RefTo, Space, Type } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label, Scroller, Submenu, closePopup, closeTooltip, resizeObserver, showPopup } from '@hcengineering/ui'
  import { ClassFilters, Filter, KeyFilter, KeyFilterPreset } from '@hcengineering/view'
  import { getResource } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { FilterQuery, buildFilterKey } from '../../filter'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
  export let target: HTMLElement
  export let filter: Filter | undefined
  export let index: number
  export let onChange: (e: Filter) => void
  export let nestedFrom: KeyFilter | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getFilters (_class: Ref<Class<Doc>>, mixin: ClassFilters): KeyFilter[] {
    if (mixin.filters === undefined) return []
    const filters = mixin.filters.map((p) => {
      return typeof p === 'string' ? buildFilterFromKey(mixin._id, p) : buildFilterFromPreset(p)
    })
    const result: KeyFilter[] = []
    for (const filter of filters) {
      if (filter !== undefined) {
        if (filter.group === undefined) {
          filter.group = 'top'
        }
        result.push(filter)
      }
    }
    return result
  }

  function buildFilterFromPreset (p: KeyFilterPreset): KeyFilter | undefined {
    if (p.key !== '') {
      const attribute = hierarchy.getAttribute(p._class, p.key)
      return {
        ...p,
        attribute,
        label: p.label ?? attribute.label
      }
    }
  }

  function buildFilterFromKey (_class: Ref<Class<Doc>>, key: string): KeyFilter | undefined {
    const attribute = hierarchy.getAttribute(_class, key)
    return buildFilterKey(hierarchy, _class, key, attribute)
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
    if (result.findIndex((p) => p.attribute?.name === value) !== -1) {
      return
    }
    const filter = buildFilterKey(hierarchy, _class, value, attribute)
    if (filter !== undefined) {
      result.push(filter)
    }
  }

  function buildFilterFor (
    _class: Ref<Class<Doc>>,
    allAttributes: Map<string, AnyAttribute>,
    result: KeyFilter[],
    mixin: ClassFilters
  ): void {
    const ignoreKeys = new Set(mixin.ignoreKeys ?? [])
    for (const [key, attribute] of allAttributes) {
      if (ignoreKeys.has(key)) {
        continue
      }
      buildFilterForAttr(_class, attribute, result)
    }
  }

  async function getTypes (_class: Ref<Class<Doc>>, nestedFrom: KeyFilter | undefined): Promise<KeyFilter[]> {
    let res: KeyFilter[] = []
    if (nestedFrom !== undefined) {
      res = await getNestedTypes(nestedFrom)
    } else {
      res = await getOwnTypes(_class)
    }
    res.sort((a, b) => {
      if (a.group === b.group) return 0
      if (a.group === 'top') return -1
      if (a.group === 'bottom') return 1
      if (b.group === 'top') return 1
      if (b.group === 'bottom') return -1
      return 0
    })
    return res
  }

  async function getNestedTypes (type: KeyFilter): Promise<KeyFilter[]> {
    const targetClass = (hierarchy.getAttribute(type._class, type.key).type as RefTo<Doc>).to
    return await getOwnTypes(targetClass)
  }

  async function getOwnTypes (_class: Ref<Class<Doc>>): Promise<KeyFilter[]> {
    const mixin = hierarchy.classHierarchyMixin(_class, view.mixin.ClassFilters)
    if (mixin === undefined) return []
    _class = hierarchy.getBaseClass(_class)
    const result = getFilters(_class, mixin)
    const getVisibleFilters = mixin.getVisibleFilters
      ? await getResource(mixin.getVisibleFilters)
      : async (filters: KeyFilter[]) => filters

    if (mixin.strict) {
      // Attributes not specified in "mixin.filters" are ignored in "strict" mode
      return await getVisibleFilters(result, space)
    }

    const allAttributes = hierarchy.getAllAttributes(_class)
    buildFilterFor(_class, allAttributes, result, mixin)

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

    return await getVisibleFilters(result, space)
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

    if (nestedFrom !== undefined && type !== nestedFrom) {
      const change = (e: Filter | undefined) => {
        if (nestedFrom) {
          setNestedFilter(nestedFrom, e)
        }
      }
      const targetClass = (hierarchy.getAttribute(nestedFrom._class, nestedFrom.key).type as RefTo<Doc>).to
      showPopup(
        type.component,
        {
          _class: targetClass,
          space,
          filter: filter || {
            key: type,
            value: [],
            index
          },
          onChange: change
        },
        target
      )
    } else {
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
  }

  function hasNested (type: KeyFilter): boolean {
    if (type.showNested === false) {
      return false
    }
    const targetClass = (hierarchy.getAttribute(type._class, type.key).type as RefTo<Doc>).to
    if (targetClass === undefined) return false
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

  const elements: HTMLElement[] = []

  function nextDiffCat (types: KeyFilter[], i: number): boolean {
    if (types[i + 1] === undefined) return false
    return types[i].group !== types[i + 1].group
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    {#if nestedFrom}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        class="menu-item"
        on:keydown={(event) => keyDown(event, -1)}
        on:mouseover={(event) => {
          event.currentTarget.focus()
        }}
        on:click={() => {
          if (nestedFrom) {
            click(nestedFrom)
          }
        }}
      >
        <div class="overflow-label pr-1"><Label label={nestedFrom.label} /></div>
      </button>
      <div class="divider" />
    {/if}
    {#await getTypes(_class, nestedFrom) then types}
      {#each types as type, i}
        {#if filter === undefined && hasNested(type) && nestedFrom === undefined}
          <Submenu
            bind:element={elements[i]}
            on:keydown={(event) => keyDown(event, i)}
            on:mouseover={() => {
              elements[i]?.focus()
            }}
            label={type.label}
            props={{
              _class,
              space,
              index,
              target,
              onChange,
              nestedFrom: type
            }}
            options={{ component: view.component.FilterTypePopup }}
            withHover
          />
        {:else}
          <!-- svelte-ignore a11y-mouse-events-have-key-events -->
          <button
            class="menu-item"
            on:keydown={(event) => keyDown(event, i)}
            on:mouseover={(event) => {
              event.currentTarget.focus()
            }}
            on:click={() => {
              click(type)
            }}
          >
            <div class="overflow-label pr-1"><Label label={type.label} /></div>
          </button>
        {/if}
        {#if nextDiffCat(types, i)}
          <div class="menu-separator" />
        {/if}
      {/each}
    {/await}
  </Scroller>
  <div class="menu-space" />
</div>
