<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import { Process, State, Transition } from '@hcengineering/process'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
  import {
    ButtonIcon,
    defineSeparators,
    EditBox,
    getCurrentLocation,
    IconDelete,
    IconDescription,
    IconDetails,
    IconSettings,
    navigate,
    NavItem,
    Scroller,
    secondNavSeparators,
    Separator,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import process from '../../plugin'
  import ContextEditor from './ContextEditor.svelte'
  import ProcesssSetting from './ProcesssSetting.svelte'
  import StatesInlineEditor from './StatesInlineEditor.svelte'
  import TransitionPresenter from './TransitionPresenter.svelte'
  import TransitionsInlineEditor from './TransitionsInlineEditor.svelte'

  export let _id: Ref<Process>
  export let visibleSecondNav: boolean = true

  const readonly: boolean = false

  const client = getClient()
  const query = createQuery()
  const statesQuery = createQuery()
  const transitionsQ = createQuery()

  const dispatch = createEventDispatcher()

  let value: Process | undefined
  let states: State[] = []
  let transitions: Transition[] = []

  $: query.query(process.class.Process, { _id }, (res) => {
    value = res[0]
    if (value !== undefined) {
      dispatch('change', [
        {
          title: value.name,
          id: value._id,
          editor: process.component.ProcessEditor
        }
      ])
    }
  })

  $: statesQuery.query(process.class.State, { process: _id }, (res) => {
    states = res
  })

  $: transitionsQ.query(process.class.Transition, { process: _id }, (res) => {
    transitions = res
  })

  async function saveName (): Promise<void> {
    if (value !== undefined) {
      await client.update(value, { name: value.name })
    }
  }

  async function deleteProcess (): Promise<void> {
    if (value === undefined) return
    // to do handle on server trigger
    await client.remove(value)
    const loc = getCurrentLocation()
    loc.path.length = 5
    clearSettingsStore()
    navigate(loc)
  }

  async function handleDelete (): Promise<void> {
    if (value === undefined) return
    const execution = await client.findOne(process.class.Execution, { process: value?._id })
    if (execution !== undefined) {
      showPopup(MessageBox, {
        label: process.string.DeleteProcess,
        message: process.string.DeleteProcessConfirm,
        action: async () => {
          await deleteProcess()
        }
      })
    } else {
      await deleteProcess()
    }
  }

  defineSeparators('spaceTypeEditor', secondNavSeparators)

  function handleContext (): void {
    $settingsStore = {
      id: value?._id,
      component: ContextEditor,
      props: { readonly, process: value }
    }
  }

  function handleSettings (): void {
    showPopup(ProcesssSetting, { value })
  }

  function handleSelect (id: Ref<State | Transition>): void {
    const loc = getCurrentLocation()
    loc.path[5] = process.component.TransitionEditor
    loc.path[6] = id
    navigate(loc, true)
  }
</script>

<div class="hulyComponent-content__container columns">
  {#if visibleSecondNav}
    <div class="hulyComponent-content__column">
      <div class="hulyComponent-content__navHeader">
        <div class="hulyComponent-content__navHeader-menu">
          <ButtonIcon kind="tertiary" icon={IconDescription} size="small" inheritColor />
        </div>
      </div>
      {#each states as state (state._id)}
        <NavItem type="type-anchor-link" title={state.title} />
      {/each}
      {#each transitions as transition (transition._id)}
        <NavItem
          type="type-anchor-link"
          on:click={() => {
            handleSelect(transition._id)
          }}
        >
          <TransitionPresenter {transition} />
        </NavItem>
      {/each}
    </div>
    <Separator name="spaceTypeEditor" index={0} color="transparent" />
  {/if}
  <div class="hulyComponent-content__column content">
    {#if value}
      <Scroller align="center" padding="var(--spacing-3)" bottomPadding="var(--spacing-3)">
        <div class="hulyComponent-content gap">
          <div class="header flex-between">
            <EditBox bind:value={value.name} on:change={saveName} placeholder={process.string.Untitled} />
            <div class="flex-row-center flex-gap-2">
              <ButtonIcon icon={IconSettings} size="small" kind="secondary" on:click={handleSettings} />
              <ButtonIcon
                icon={IconDetails}
                tooltip={{ label: process.string.Data, direction: 'bottom' }}
                size="small"
                kind="secondary"
                on:click={handleContext}
              />
              <ButtonIcon
                icon={IconDelete}
                tooltip={{ label: view.string.Delete, direction: 'bottom' }}
                size="small"
                kind="secondary"
                on:click={handleDelete}
              />
            </div>
          </div>
          <div class="hulyComponent-content flex-col-center flex-gap-4">
            <StatesInlineEditor {states} {readonly} process={value} />
            <TransitionsInlineEditor {transitions} {readonly} process={value} />
          </div>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .header {
    font-size: 2rem;
    padding-bottom: 1rem;
  }
</style>
