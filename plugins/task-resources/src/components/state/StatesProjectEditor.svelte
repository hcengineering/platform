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
    IconOpenedArrow,
    IconMoreV2,
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
  import { settingsStore, clearSettingsStore } from '@hcengineering/setting-resources'

  export let taskType: TaskType
  export let type: ProjectType
  export let states: Status[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()

  const elements: HTMLElement[] = []
  let selected: number | undefined
  let dragState: Ref<Status>
  let opened: Ref<Status> | undefined

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
  settingsStore.subscribe((value) => {
    if ((value.id === undefined && opened !== undefined) || (value.id !== undefined && value.id !== opened)) { opened = undefined }
  })
  const handleSelect = (_status: Status): void => {
    if (opened === undefined || opened !== _status._id) {
      opened = _status._id
      const icons: Asset[] = []
      const projectStatus = getProjectStatus(type, _status, categoriesMap)
      $settingsStore = {
        id: opened,
        component: task.component.CreateStatePopup,
        props: {
          status: _status,
          taskType,
          type,
          ofAttribute: _status.ofAttribute,
          icon: projectStatus?.icon,
          color: projectStatus?.color,
          icons
        }
      }
    } else if (opened === _status._id) {
      clearSettingsStore()
      opened = undefined
    }
  }
</script>

{#each categories as cat, i}
  {@const states = groups.get(cat._id) ?? []}
  {@const prevIndex = getPrevIndex(groups, cat._id)}
  <div class="hulyTableAttr-content class withTitle">
    <div class="hulyTableAttr-content__title">
      <Label label={cat.label} />
      <!-- <CircleButton
        icon={IconAdd}
        size={'medium'}
        on:click={() => {
          add(findStatusAttr(getClient().getHierarchy(), taskType.ofClass)?._id, cat._id)
        }}
      /> -->
    </div>
    <div class="hulyTableAttr-content__wrapper">
      {#each states as state, i}
        {@const color = getColor(type, state, categoriesMap)}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- style:background={color.background ?? defaultBackground($themeStore.dark)} -->
        <button
          bind:this={elements[prevIndex + i]}
          class="hulyTableAttr-content__row"
          class:selected={state._id === opened}
          draggable={true}
          on:contextmenu|preventDefault={(e) => {
            click(e, state)
          }}
          on:click={() => {
            handleSelect(state)
          }}
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
          <button class="hulyTableAttr-content__row-dragMenu" on:click|stopPropagation={() => {}}>
            <IconMoreV2 size={'small'} />
          </button>
          <ObjectPresenter
            _class={state._class}
            objectId={state._id}
            value={state}
            props={{ projectType: type._id, taskType: taskType._id, kind: 'table-attrs' }}
            on:click={(ev) => {
              if (state.category !== undefined) {
                selectIcon(elements[i + prevIndex], state)
              } else {
                onColor(state, color, elements[i + prevIndex])
              }
            }}
          />
          <div class="hulyTableAttr-content__row-arrow">
            <IconOpenedArrow size={'small'} />
          </div>
        </button>
      {/each}
    </div>
  </div>
{/each}
