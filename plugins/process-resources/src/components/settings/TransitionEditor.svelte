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
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Process, State, Step, Transition } from '@hcengineering/process'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
  import {
    Button,
    ButtonIcon,
    DropdownIntlItem,
    DropdownLabelsPopupIntl,
    getCurrentLocation,
    getEventPositionElement,
    IconAdd,
    IconDelete,
    Label,
    navigate,
    Scroller,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { initState } from '../../utils'
  import ActionPresenter from './ActionPresenter.svelte'
  import AsideStepEditor from './AsideStepEditor.svelte'
  import AsideTransitionEditor from './AsideTransitionEditor.svelte'
  import Navigator from './Navigator.svelte'
  import TransitionPresenter from './TransitionPresenter.svelte'
  import TriggerPresenter from './TriggerPresenter.svelte'
  import { SortableList } from '@hcengineering/view-resources'

  export let _id: Ref<Transition>
  export let visibleSecondNav: boolean = true

  let value: Transition | undefined = undefined
  let process: Process | undefined = undefined

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query(plugin.class.Transition, { _id }, (res) => {
    value = res[0]
    if (value === undefined) {
      return
    }
    process = client.getModel().findAllSync(plugin.class.Process, { _id: value.process })[0]
    const title = getTitle(value)
    dispatch('change', [
      {
        title: process.name,
        id: process._id,
        editor: plugin.component.ProcessEditor
      },
      {
        title,
        id: value._id,
        editor: plugin.component.TransitionEditor
      }
    ])
  })

  function getTitle (transition: Transition): string {
    const to = client.getModel().findAllSync(plugin.class.State, { _id: transition.to })[0]
    if (transition.from == null) {
      return `⦳ → ${to.title}`
    }
    const from = client.getModel().findAllSync(plugin.class.State, { _id: transition.from })[0]
    return `${from.title} → ${to.title}`
  }

  const client = getClient()

  function addAction (e: MouseEvent): void {
    const items: DropdownIntlItem[] = client
      .getModel()
      .findAllSync(plugin.class.Method, {})
      .map((x) => ({
        id: x._id,
        label: x.label
      }))

    showPopup(DropdownLabelsPopupIntl, { items }, getEventPositionElement(e), async (res) => {
      if (res !== undefined && value !== undefined) {
        const step = await initState(res)
        value.actions.push(step)
        await client.update(value, { actions: value.actions })
        value.actions = value.actions
        editAction(step)
      }
    })
  }

  function editAction (step: Step<Doc>): void {
    if (value === undefined) return
    $settingsStore = { id: value._id, component: AsideStepEditor, props: { process, step, _id: value._id } }
  }

  let states: State[] = []
  let transitions: Transition[] = []
  const statesQuery = createQuery()
  const transitionsQ = createQuery()

  $: process &&
    statesQuery.query(plugin.class.State, { process: process?._id }, (res) => {
      states = res
    })

  $: process &&
    transitionsQ.query(plugin.class.Transition, { process: process?._id }, (res) => {
      transitions = res
    })

  async function handleDelete (): Promise<void> {
    if (value === undefined) return
    // to do handle on server trigger
    await client.remove(value)
    const loc = getCurrentLocation()
    loc.path[5] = plugin.component.ProcessEditor
    loc.path[6] = value.process
    clearSettingsStore()
    navigate(loc)
  }

  function edit (): void {
    $settingsStore = { id: _id, component: AsideTransitionEditor, props: { process, transition: value } }
  }

  async function moveHadler (): Promise<void> {
    if (value === undefined) return
    await client.update(value, { actions: value.actions })
  }
</script>

<div class="hulyComponent-content__container columns">
  <Navigator {visibleSecondNav} {states} {transitions} />
  <div class="hulyComponent-content__column content">
    {#if value && process}
      <Scroller align="center" padding="var(--spacing-3)" bottomPadding="var(--spacing-3)">
        <div class="hulyComponent-content gap">
          <div class="header flex-between">
            <TransitionPresenter transition={value} />
            <ButtonIcon
              icon={IconDelete}
              tooltip={{ label: view.string.Delete, direction: 'bottom' }}
              size="small"
              kind="secondary"
              on:click={handleDelete}
            />
          </div>
          <div class="hulyComponent-content flex-col-center flex-gap-4">
            <div class="hulyTableAttr-container flex-col-center box">
              <div class="label w-full p-4">
                <Label label={plugin.string.Trigger} />
              </div>
              <Button justify="left" kind="ghost" width="100%" on:click={edit}>
                <svelte:fragment slot="content">
                  <TriggerPresenter value={value.trigger} params={value.triggerParams} {process} withLabel />
                </svelte:fragment>
              </Button>
            </div>
            <div class="hulyTableAttr-container flex-col-center box">
              <div class="label w-full p-4">
                <Label label={plugin.string.Actions} />
              </div>
              <SortableList bind:items={value.actions} on:move={moveHadler}>
                <svelte:fragment slot="object" let:value>
                  <Button
                    justify="left"
                    kind="ghost"
                    width="100%"
                    on:click={() => {
                      editAction(value)
                    }}
                  >
                    <svelte:fragment slot="content">
                      <ActionPresenter action={value} {process} readonly={false} />
                    </svelte:fragment>
                  </Button>
                </svelte:fragment>
              </SortableList>
              <Button
                kind={'ghost'}
                width={'100%'}
                icon={IconAdd}
                label={plugin.string.AddAction}
                on:click={addAction}
              />
            </div>
          </div>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .box {
    width: 32rem;
    align-self: center;

    .label {
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
      user-select: none;
      border-bottom: 1px solid var(--theme-divider-color);
    }
  }

  .header {
    font-size: 2rem;
    color: var(--theme-caption-color);
    padding-bottom: 1rem;
  }
</style>
