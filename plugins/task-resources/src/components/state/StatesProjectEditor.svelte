<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import core, { Attribute, IdMap, Ref, Status, StatusCategory, toIdMap } from '@hcengineering/core'
  import { ComponentExtensions, createQuery, getClient } from '@hcengineering/presentation'
  import { ProjectType, ProjectTypeCategory } from '@hcengineering/task'
  import {
    CircleButton,
    ColorDefinition,
    Component,
    IconAdd,
    IconCircles,
    IconMoreH,
    Label,
    defaultBackground,
    eventToHTMLElement,
    getColorNumberByText,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { ColorsPopup, StringPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'
  import StatusesPopup from './StatusesPopup.svelte'

  export let type: ProjectType
  export let category: ProjectTypeCategory
  export let states: Status[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()

  const elements: HTMLElement[] = []
  let selected: number | undefined
  let dragState: Ref<Status>

  function dragswap (ev: MouseEvent, i: number): boolean {
    const s = selected as number
    if (i < s) {
      return ev.offsetY < elements[i].offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > elements[i].offsetHeight / 2
    }
    return false
  }

  function dragover (ev: MouseEvent, i: number) {
    const s = selected as number
    if (dragswap(ev, i)) {
      ;[states[i], states[s]] = [states[s], states[i]]
      selected = i
    }
  }

  async function onMove (to: number) {
    dispatch('move', {
      stateID: dragState,
      position: to
    })
  }

  function onColor (state: Status, color: ColorDefinition, el: HTMLElement): void {
    showPopup(ColorsPopup, { selected: color.name }, el, async (res) => {
      if (res == null) {
        return
      }
      const targetColor = type.statuses.find((p) => p._id === state._id)
      if (targetColor !== undefined) {
        targetColor.color = res
        await client.update(type, { statuses: type.statuses })
      }
    })
  }
  const categoryEditor = category.editor

  function add (ofAttribute: Ref<Attribute<Status>>, cat: Ref<StatusCategory>) {
    showPopup(task.component.CreateStatePopup, {
      ofAttribute,
      _class: category.statusClass,
      category: cat,
      type
    })
  }

  function edit (status: Status) {
    showPopup(task.component.CreateStatePopup, { status, type, ofAttribute: status.ofAttribute })
  }

  let categories: StatusCategory[] = []
  let categoriesMap: IdMap<StatusCategory> = new Map()
  let groups = new Map<Ref<StatusCategory>, Status[]>()
  const query = createQuery()
  $: query.query(core.class.StatusCategory, { _id: { $in: category.statusCategories } }, (res) => {
    categories = res
    categoriesMap = toIdMap(res)
  })

  function click (ev: MouseEvent, state: Status) {
    showPopup(
      StatusesPopup,
      {
        onDelete: () => dispatch('delete', { state }),
        showDelete: states.length > 1,
        onUpdate: () => {
          edit(state)
        }
      },
      eventToHTMLElement(ev),
      () => {}
    )
  }

  function getColor (state: Status, categoriesMap: IdMap<StatusCategory>): ColorDefinition {
    const category = state.category ? categoriesMap.get(state.category) : undefined
    const targetColor = type.statuses.find((p) => p._id === state._id)?.color ?? state.color ?? category?.color
    return getPlatformColorDef(targetColor ?? getColorNumberByText(state.name), $themeStore.dark)
  }

  function group (categories: StatusCategory[], states: Status[]): Map<Ref<StatusCategory>, Status[]> {
    const map = new Map<Ref<StatusCategory>, Status[]>(categories.map((p) => [p._id, []]))
    for (const state of states) {
      if (state.category === undefined) continue
      const arr = map.get(state.category) ?? []
      arr.push(state)
      map.set(state.category, arr)
    }
    return map
  }

  $: groups = group(categories, states)

  function getPrevIndex (groups: Map<Ref<StatusCategory>, Status[]>, categories: Ref<StatusCategory>): number {
    let index = 0
    for (const [cat, states] of groups) {
      if (cat === categories) {
        return index
      }
      index += states.length
    }
    return index
  }
</script>

{#if categoryEditor}
  <Component is={categoryEditor} props={{ type }} />
{/if}
<ComponentExtensions extension={task.extensions.ProjectEditorExtension} props={{ type }} />
{#each categories as cat, i}
  {@const states = groups.get(cat._id) ?? []}
  {@const prevIndex = getPrevIndex(groups, cat._id)}
  <div class="flex-no-shrink flex-between trans-title uppercase" class:mt-4={i > 0}>
    <Label label={cat.label} />
    <CircleButton
      icon={IconAdd}
      size={'medium'}
      on:click={() => {
        add(cat.ofAttribute, cat._id)
      }}
    />
  </div>
  <div class="flex-col flex-no-shrink mt-3">
    {#each states as state, i}
      {@const color = getColor(state, categoriesMap)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        bind:this={elements[prevIndex + i]}
        class="flex-between states"
        style:background={color.background ?? defaultBackground($themeStore.dark)}
        draggable={true}
        on:dragover|preventDefault={(ev) => {
          dragover(ev, i + prevIndex)
        }}
        on:drop|preventDefault={() => {
          onMove(prevIndex + i)
        }}
        on:dragstart={() => {
          selected = i + prevIndex
          dragState = states[i]._id
        }}
        on:dragend={() => {
          selected = undefined
        }}
      >
        <div class="bar"><IconCircles size={'small'} /></div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="color"
          style:background-color={color.color}
          on:click={() => {
            onColor(state, color, elements[i + prevIndex])
          }}
        />
        <div class="flex-grow caption-color">
          <StringPresenter value={state.name} oneLine />
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="tool hover-trans"
          on:click={(e) => {
            click(e, state)
          }}
        >
          <IconMoreH size={'medium'} />
        </div>
      </div>
    {/each}
  </div>
{/each}

<style lang="scss">
  .states {
    padding: 0.5rem 1rem 0.5rem 0.25rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;
    user-select: none;

    .bar {
      margin-right: 0.25rem;
      width: 1rem;
      height: 1rem;
      opacity: 0.4;
      cursor: grabbing;
    }
    .color {
      margin-right: 0.75rem;
      width: 1rem;
      height: 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
    }
    .tool {
      margin-left: 1rem;
    }
  }
  .states + .states {
    margin-top: 0.5rem;
  }
</style>
