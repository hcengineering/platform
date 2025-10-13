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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import { Process, State, Transition } from '@hcengineering/process'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
  import {
    ButtonIcon,
    defineSeparators,
    EditBox,
    getCurrentLocation,
    IconDelete,
    IconDetails,
    IconSettings,
    navigate,
    Scroller,
    secondNavSeparators,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import process from '../../plugin'
  import ContextEditor from './ContextEditor.svelte'
  import Navigator from './Navigator.svelte'
  import ProcesssSetting from './ProcesssSetting.svelte'
  import StatesInlineEditor from './StatesInlineEditor.svelte'
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

  $: statesQuery.query(
    process.class.State,
    { process: _id },
    (res) => {
      states = res
    },
    {
      sort: { rank: SortingOrder.Ascending }
    }
  )

  $: transitionsQ.query(
    process.class.Transition,
    { process: _id },
    (res) => {
      transitions = res
    },
    {
      sort: { rank: SortingOrder.Ascending }
    }
  )

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
</script>

<div class="hulyComponent-content__container columns">
  <Navigator {visibleSecondNav} {states} {transitions} />
  <div class="hulyComponent-content__column content">
    {#if value}
      <Scroller align="center" padding="var(--spacing-3)" bottomPadding="var(--spacing-3)">
        <div class="hulyComponent-content gap">
          <div class="header flex-between">
            <EditBox
              bind:value={value.name}
              kind="modern-ghost-large"
              on:change={saveName}
              required
              placeholder={process.string.Untitled}
            />
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
            <TransitionsInlineEditor {readonly} process={value} />
          </div>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .state {
    font-weight: 500;
    color: var(--global-tertiary-TextColor);
    padding: 0 var(--spacing-1_5) 0 var(--spacing-1_25);
    min-height: 1.75rem;
    margin: 0 0.75rem;
  }
</style>
