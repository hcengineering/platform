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
  import core, { Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import { Process, State } from '@hcengineering/process'
  import { settingsStore } from '@hcengineering/setting-resources'
  import {
    Button,
    ButtonIcon,
    defineSeparators,
    EditBox,
    getCurrentLocation,
    IconAdd,
    IconDelete,
    IconDescription,
    navigate,
    NavItem,
    Scroller,
    secondNavSeparators,
    Separator,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import process from '../plugin'
  import Aside from './Aside.svelte'
  import ArrowEnd from './icons/ArrowEnd.svelte'
  import ArrowStart from './icons/ArrowStart.svelte'
  import StateEditor from './StateEditor.svelte'

  export let _id: Ref<Process>
  export let visibleSecondNav: boolean = true

  const client = getClient()
  const query = createQuery()
  const statesQuery = createQuery()

  const dispatch = createEventDispatcher()

  let value: Process | undefined
  let states: State[] = []

  query.query(process.class.Process, { _id }, (res) => {
    value = res[0]
    if (value !== undefined) {
      dispatch('change', value.name)
    }
  })

  statesQuery.query(process.class.State, { process: _id }, (res) => {
    states = res
  })

  $: sortedStates = sortStates(states, value)

  function sortStates (states: State[], process: Process | undefined): State[] {
    if (process === undefined) return states
    return states.sort((a, b) => process.states.indexOf(a._id) - process.states.indexOf(b._id))
  }

  async function saveName (): Promise<void> {
    if (value !== undefined) {
      await client.update(value, { name: value.name })
    }
  }

  async function addState (): Promise<void> {
    if (value === undefined) return
    const prevState = states[states.length - 1]

    const id = await client.createDoc(process.class.State, core.space.Model, {
      actions: [],
      process: _id,
      title: await translate(process.string.NewState, {})
    })

    await client.update(value, { states: [...value.states, id] })

    if (prevState !== undefined) {
      const endAction = {
        methodId: process.method.CreateToDo,
        params: {
          title: prevState.title
        }
      }
      prevState.endAction = endAction
      await client.update(prevState, { endAction })
      $settingsStore = { id: value._id, component: Aside, props: { process: value, value: prevState, index: -1 } }
    }
  }

  async function deleteProcess (): Promise<void> {
    if (value === undefined) return
    // to do handle on server trigger
    await client.remove(value)
    const loc = getCurrentLocation()
    loc.path.length = 5
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

  const sectionRefs: Record<string, HTMLElement | undefined> = {}

  defineSeparators('spaceTypeEditor', secondNavSeparators)
</script>

<div class="hulyComponent-content__container columns">
  {#if visibleSecondNav}
    <div class="hulyComponent-content__column">
      <div class="hulyComponent-content__navHeader">
        <div class="hulyComponent-content__navHeader-menu">
          <ButtonIcon kind="tertiary" icon={IconDescription} size="small" inheritColor />
        </div>
      </div>
      {#each sortedStates as navItem (navItem._id)}
        <NavItem
          type="type-anchor-link"
          title={navItem.title}
          on:click={() => {
            sectionRefs[navItem._id]?.scrollIntoView()
          }}
        />
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
            <ButtonIcon icon={IconDelete} size="small" kind="secondary" on:click={handleDelete} />
          </div>
          <div class="hulyComponent-content flex-col-center">
            <div class="flex-col-center">
              {#each sortedStates as state (state._id)}
                <div bind:this={sectionRefs[state._id]}>
                  <StateEditor process={value} value={state} />
                </div>
                <div class="arrow">
                  <ArrowStart size={'full'} />
                </div>
                <div class="arrow">
                  <ArrowEnd size={'full'} />
                </div>
              {/each}
              <Button
                kind={'primary'}
                size={'large'}
                icon={IconAdd}
                label={process.string.AddState}
                on:click={addState}
              />
            </div>
          </div>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .arrow {
    height: 2.25rem;
  }

  .header {
    font-size: 2rem;
    padding-bottom: 1rem;
  }
</style>
