<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Asset } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ProjectStatus, ProjectType, TaskType, findStatusAttr } from '@hcengineering/task'
  import {
    CircleButton,
    ColorDefinition,
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
  import { ColorsPopup, IconPicker, ObjectPresenter, statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'
  import StatusesPopup from './StatusesPopup.svelte'

  export let taskType: TaskType
  export let type: ProjectType
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

  function dragover (ev: MouseEvent, i: number): void {
    const s = selected as number
    if (dragswap(ev, i)) {
      ;[states[i], states[s]] = [states[s], states[i]]
      selected = i
    }
  }

  function onMove (to: number): void {
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
      const targetColors = type.statuses.filter((p) => p._id === state._id)
      for (const targetColor of targetColors) {
        targetColor.color = res
      }
      await client.update(type, { statuses: type.statuses })
      type = type
    })
  }

  function add (ofAttribute: Ref<Attribute<Status>> | undefined, cat: Ref<StatusCategory>): void {
    if (ofAttribute === undefined) {
      return
    }
    showPopup(task.component.CreateStatePopup, {
      ofAttribute,
      _class: taskType.statusClass,
      category: cat,
      taskType,
      type
    })
  }

  function edit (status: Status): void {
    showPopup(task.component.CreateStatePopup, {
      status,
      taskType,
      type,
      ofAttribute: status.ofAttribute
    })
  }

  let categories: StatusCategory[] = []
  let categoriesMap: IdMap<StatusCategory> = new Map()
  let groups = new Map<Ref<StatusCategory>, Status[]>()
  const query = createQuery()
  $: query.query(core.class.StatusCategory, { _id: { $in: taskType.statusCategories } }, (res) => {
    categories = res
    categoriesMap = toIdMap(res)
  })

  function click (ev: MouseEvent, state: Status): void {
    showPopup(
      StatusesPopup,
      {
        onDelete: () => dispatch('delete', { state }),
        showDelete: states.filter((it) => it.category === state.category).length > 1,
        onUpdate: () => {
          edit(state)
        }
      },
      eventToHTMLElement(ev),
      () => {}
    )
  }

  function getProjectStatus (
    type: ProjectType,
    state: Status,
    categoriesMap: IdMap<StatusCategory>
  ): ProjectStatus | undefined {
    return type.statuses.find((p) => p._id === state._id)
  }

  function getColor (type: ProjectType, state: Status, categoriesMap: IdMap<StatusCategory>): ColorDefinition {
    const category = state.category !== undefined ? categoriesMap.get(state.category) : undefined
    const targetColor = getProjectStatus(type, state, categoriesMap)?.color ?? state.color ?? category?.color
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
  function selectIcon (el: HTMLElement, state: Status): void {
    const icons: Asset[] = []
    const projectStatus = getProjectStatus(type, state, categoriesMap)
    showPopup(IconPicker, { icon: projectStatus?.icon, color: projectStatus?.color, icons }, el, async (result) => {
      if (result !== undefined && result !== null) {
        const targetColors = type.statuses.filter((p) => p._id === state._id)
        for (const targetColor of targetColors) {
          targetColor.color = result.color
          targetColor.icon = result.icon
        }
        if (targetColors.length > 0) {
          await client.update(type, { statuses: type.statuses })
          type = type
        }
      }
    })
  }
</script>

{#each categories as cat, i}
  {@const states = groups.get(cat._id) ?? []}
  {@const prevIndex = getPrevIndex(groups, cat._id)}
  <div class="flex-col p-2">
    <div class="flex-no-shrink flex-between trans-title uppercase" class:mt-4={i > 0}>
      <Label label={cat.label} />
      <CircleButton
        icon={IconAdd}
        size={'medium'}
        on:click={() => {
          add(findStatusAttr(getClient().getHierarchy(), taskType.ofClass)?._id, cat._id)
        }}
      />
    </div>
    <div class="flex-col flex-no-shrink mt-3">
      {#each states as state, i}
        {@const color = getColor(type, state, categoriesMap)}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          bind:this={elements[prevIndex + i]}
          class="flex-row-center flex-between states"
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
          <div class="flex-row-center">
            <div class="bar"><IconCircles size={'small'} /></div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="color"
              on:click={(ev) => {
                if (state.category !== undefined) {
                  selectIcon(elements[i + prevIndex], state)
                } else {
                  onColor(state, color, elements[i + prevIndex])
                }
              }}
            >
              <ObjectPresenter
                _class={state._class}
                objectId={state._id}
                value={state}
                props={{ projectType: type._id, taskType: taskType._id }}
              />
            </div>
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
