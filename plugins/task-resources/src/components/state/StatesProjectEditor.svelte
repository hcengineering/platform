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
  import core, { IdMap, Ref, Status, StatusCategory, toIdMap } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { settingsStore } from '@hcengineering/setting-resources'
  import { ProjectStatus, ProjectType, TaskType } from '@hcengineering/task'
  import { IconMoreV2, IconOpenedArrow, Label } from '@hcengineering/ui'
  import { ObjectPresenter, statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'

  export let taskType: TaskType
  export let type: ProjectType
  export let states: Status[] = []
  export let readonly: boolean = true

  const dispatch = createEventDispatcher()

  const elements: HTMLElement[] = []
  let selected: number | undefined
  let dragState: Ref<Status>
  let opened: Ref<Status> | undefined

  function dragswap (ev: MouseEvent, i: number, targetCategory: Ref<StatusCategory>): boolean {
    if (readonly) return false
    const s = selected as number
    const sourceState = states[s]
    const sourceCategory = sourceState.category

    if (sourceCategory === targetCategory) {
      if (i < s) {
        return ev.offsetY < elements[i].offsetHeight / 2
      } else if (i > s) {
        return ev.offsetY > elements[i].offsetHeight / 2
      }
    } else {
      return true
    }
    return false
  }

  function dragover (ev: MouseEvent, i: number, targetCategory: Ref<StatusCategory>): void {
    if (readonly) return
    const s = selected as number

    if (dragswap(ev, i, targetCategory)) {
      ;[states[i], states[s]] = [states[s], states[i]]
      selected = i
    }
  }

  function moveState (i: number): void {
    if (readonly || selected === undefined || i === selected) return

    // Get state to move
    const stateToMove = states[selected]

    // Remove state from old position
    states.splice(selected, 1)

    // Adjust target index if moving forward
    const targetIndex = i > selected ? i - 1 : i

    // Insert state at new position
    states.splice(targetIndex, 0, stateToMove)

    // Update selected index
    selected = targetIndex
  }

  function onMove (to: number, targetCategory: Ref<StatusCategory>): void {
    if (readonly) return

    const state = $statusStore.byId.get(dragState)

    if (state !== undefined && state.category !== targetCategory) {
      const newStates = states.filter((s) => s._id !== dragState)
      newStates.splice(to, 0, state)

      dispatch('move', {
        stateID: dragState,
        position: to,
        newCategory: targetCategory
      })
    } else {
      dispatch('move', {
        stateID: dragState,
        position: to
      })
    }
  }

  let categories: StatusCategory[] = []
  let categoriesMap: IdMap<StatusCategory> = new Map()
  let groups = new Map<Ref<StatusCategory>, Status[]>()
  const query = createQuery()
  $: query.query(core.class.StatusCategory, { _id: { $in: taskType.statusCategories } }, (res) => {
    categories = res
    categoriesMap = toIdMap(res)
  })

  function getProjectStatus (type: ProjectType, state: Status): ProjectStatus | undefined {
    return type.statuses.find((p) => p._id === state._id)
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

  $: taskTypeStates = states
    .filter((it) => taskType.statuses.includes(it._id))
    .filter((it, idx, arr) => arr.findIndex((qt) => qt._id === it._id) === idx)

  $: groups = group(categories, taskTypeStates)

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
  settingsStore.subscribe((value) => {
    if ((value.id === undefined && opened !== undefined) || (value.id !== undefined && value.id !== opened)) {
      opened = undefined
    }
  })
  const handleSelect = (_status: Status): void => {
    if (opened === undefined || opened !== _status._id) {
      opened = _status._id
      const icons: Asset[] = []
      const category = _status.category !== undefined ? categoriesMap.get(_status.category) : undefined
      const projectStatus = getProjectStatus(type, _status)
      const color = getProjectStatus(type, _status)?.color ?? _status.color ?? category?.color
      const sameCategory = (
        taskType.statuses
          .map((it) => $statusStore.byId.get(it))
          .filter((it) => it !== undefined)
          .filter((it) => it?.category === _status.category) as Status[]
      ).filter((it, idx, arr) => arr.findIndex((qt) => qt._id === it._id) === idx)

      $settingsStore = {
        id: opened,
        component: task.component.CreateStatePopup,
        props: {
          status: _status,
          taskType,
          type,
          ofAttribute: _status.ofAttribute,
          icon: projectStatus?.icon,
          color,
          icons,
          canDelete: sameCategory.length > 1,
          selectableStates: sameCategory.filter((it) => it._id !== _status._id),
          readonly
        }
      }
    }
  }
</script>

{#each categories as cat (cat._id)}
  {@const states = groups.get(cat._id) ?? []}
  {@const prevIndex = getPrevIndex(groups, cat._id)}
  <div class="hulyTableAttr-content class withTitle">
    <div class="hulyTableAttr-content__title">
      <Label label={cat.label} />
    </div>
    <div class="hulyTableAttr-content__wrapper">
      {#if states.length === 0}
        <!-- Placeholder для пустой категории -->
        <button
          class="hulyTableAttr-content__row disableMouseOver"
          style="height: 100%; min-height: 3rem;"
          draggable={false}
          on:drop|preventDefault={() => {
            onMove(prevIndex, cat._id)
          }}
          on:dragover|preventDefault={() => {
            moveState(prevIndex)
          }}
        >
        </button>
      {/if}
      {#each states as state, i (state._id)}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <button
          bind:this={elements[prevIndex + i]}
          class="hulyTableAttr-content__row"
          class:selected={state._id === opened}
          draggable={!readonly}
          on:click={() => {
            handleSelect(state)
          }}
          on:dragover|preventDefault={(ev) => {
            dragover(ev, i + prevIndex, cat._id)
          }}
          on:drop|preventDefault={() => {
            onMove(prevIndex + i, cat._id)
          }}
          on:dragstart={() => {
            selected = i + prevIndex
            dragState = states[i]._id
          }}
          on:dragend={() => {
            selected = undefined
          }}
        >
          <button class="hulyTableAttr-content__row-dragMenu" on:click|stopPropagation={() => {}}>
            <IconMoreV2 size={'small'} />
          </button>
          <ObjectPresenter
            _class={state._class}
            objectId={state._id}
            value={state}
            props={{ projectType: type._id, taskType: taskType._id, kind: 'table-attrs' }}
          />
          <div class="hulyTableAttr-content__row-arrow">
            <IconOpenedArrow size={'small'} />
          </div>
        </button>
      {/each}
    </div>
  </div>
{/each}
