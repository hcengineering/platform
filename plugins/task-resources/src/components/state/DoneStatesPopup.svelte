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
  import { Class, Doc, IdMap, Ref, Status } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { DoneState, SpaceWithStates } from '@hcengineering/task'
  import { Label, PaletteColorIndexes, getPlatformColor, resizeObserver, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'
  import Lost from '../icons/Lost.svelte'
  import Unknown from '../icons/Unknown.svelte'
  import Won from '../icons/Won.svelte'
  import { statusStore } from '@hcengineering/view-resources'

  export let space: Ref<SpaceWithStates>
  let states: DoneState[] = []
  const dispatch = createEventDispatcher()

  let _space: SpaceWithStates

  function getStates (space: SpaceWithStates | undefined, statesStore: IdMap<Status>): void {
    if (space === undefined) return
    const res: Status[] =
      (space.doneStates?.map((p) => statesStore.get(p))?.filter((p) => p !== undefined) as Status[]) ?? []
    res.sort((a, b) => a._class.localeCompare(b._class))
    states = res
  }

  $: getStates(_space, $statusStore)

  const spaceQuery = createQuery()
  spaceQuery.query(task.class.SpaceWithStates, { _id: space }, (res) => {
    _space = res[0]
  })

  function getColor (_class: Ref<Class<Doc>>): string {
    return _class === task.class.WonState
      ? getPlatformColor(PaletteColorIndexes.Crocodile, $themeStore.dark)
      : getPlatformColor(PaletteColorIndexes.Firework, $themeStore.dark)
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#each states as state}
        <button
          class="menu-item"
          on:click={() => {
            dispatch('close', state)
          }}
        >
          <div class="mr-2" style="color: {getColor(state._class)}">
            <svelte:component this={state._class === task.class.WonState ? Won : Lost} size={'small'} />
          </div>
          <span class="label">{state.name}</span>
        </button>
      {/each}
      <button
        class="menu-item"
        on:click={() => {
          dispatch('close', null)
        }}
      >
        <div class="content-dark-color mr-2"><Unknown size={'small'} /></div>
        <span class="overflow-label"><Label label={task.string.NoDoneState} /></span>
      </button>
    </div>
  </div>
  <div class="menu-space" />
</div>
